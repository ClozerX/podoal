# 🗄️ Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속
2. 새 프로젝트 생성
3. 프로젝트 URL과 anon key 복사

## 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. 데이터베이스 테이블 생성

Supabase SQL Editor에서 다음 SQL 실행:

```sql
-- 랭킹 테이블 생성
CREATE TABLE rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL,
  total_time NUMERIC NOT NULL,
  captcha_time NUMERIC NOT NULL,
  round_times JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_rankings_total_time ON rankings(total_time);
CREATE INDEX idx_rankings_created_at ON rankings(created_at DESC);
CREATE INDEX idx_rankings_nickname ON rankings(nickname);

-- RLS (Row Level Security) 설정
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can view rankings"
  ON rankings FOR SELECT
  USING (true);

-- 모든 사용자가 삽입 가능
CREATE POLICY "Anyone can insert rankings"
  ON rankings FOR INSERT
  WITH CHECK (true);
```

## 4. 일간/주간/월간 랭킹 조회 함수

```sql
-- 일간 랭킹 뷰
CREATE OR REPLACE FUNCTION get_daily_rankings(limit_count INT DEFAULT 100)
RETURNS TABLE (
  id UUID,
  nickname TEXT,
  total_time NUMERIC,
  captcha_time NUMERIC,
  round_times JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.nickname,
    r.total_time,
    r.captcha_time,
    r.round_times,
    r.created_at,
    ROW_NUMBER() OVER (ORDER BY r.total_time ASC) as rank
  FROM rankings r
  WHERE DATE(r.created_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE
  ORDER BY r.total_time ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 주간 랭킹 뷰
CREATE OR REPLACE FUNCTION get_weekly_rankings(limit_count INT DEFAULT 100)
RETURNS TABLE (
  id UUID,
  nickname TEXT,
  total_time NUMERIC,
  captcha_time NUMERIC,
  round_times JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.nickname,
    r.total_time,
    r.captcha_time,
    r.round_times,
    r.created_at,
    ROW_NUMBER() OVER (ORDER BY r.total_time ASC) as rank
  FROM rankings r
  WHERE r.created_at >= date_trunc('week', CURRENT_DATE AT TIME ZONE 'Asia/Seoul')
  ORDER BY r.total_time ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 월간 랭킹 뷰
CREATE OR REPLACE FUNCTION get_monthly_rankings(limit_count INT DEFAULT 100)
RETURNS TABLE (
  id UUID,
  nickname TEXT,
  total_time NUMERIC,
  captcha_time NUMERIC,
  round_times JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.nickname,
    r.total_time,
    r.captcha_time,
    r.round_times,
    r.created_at,
    ROW_NUMBER() OVER (ORDER BY r.total_time ASC) as rank
  FROM rankings r
  WHERE r.created_at >= date_trunc('month', CURRENT_DATE AT TIME ZONE 'Asia/Seoul')
  ORDER BY r.total_time ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

## 5. 완료!

이제 앱에서 랭킹을 저장하고 조회할 수 있습니다.


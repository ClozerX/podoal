# 🍇 포도알 - 티켓팅 트레이너

빠른 반응속도를 훈련하는 티켓팅 시뮬레이션 웹앱입니다.

## ✨ 주요 기능

- 🎫 **실제 티켓팅 경험**: 대기열부터 보안문자, 좌석 선택까지 실제 티켓팅 과정을 시뮬레이션
- 🔒 **보안문자(CAPTCHA)**: 실제 티켓팅 사이트처럼 랜덤 보안문자 입력
- ⚡ **정확한 시간 측정**: 보안문자부터 전체 게임까지 밀리초 단위 측정
- ⏱️ **실시간 타이머**: 우측 상단에 실시간으로 소요 시간 표시
- 🏆 **랭킹 시스템**: Supabase 연동으로 일간/주간/월간 랭킹
- 👤 **닉네임 저장**: 한 번 입력한 닉네임 자동 저장
- 🎮 **5단계 난이도**: 라운드가 진행될수록 좌석 수가 증가
- 🎉 **애니메이션**: 컨페티, 카운트다운 등 다양한 애니메이션 효과
- 📱 **반응형 디자인**: 데스크톱과 모바일 모두 지원

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Supabase 계정 (랭킹 시스템용)

### 설치

```bash
# 의존성 설치
npm install
```

### 환경 변수 설정

1. 프로젝트 루트에 `.env` 파일 생성:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Supabase 설정 (자세한 내용은 `SUPABASE_SETUP.md` 참고):
   - Supabase 프로젝트 생성
   - SQL 에디터에서 테이블 생성
   - URL과 anon key 복사하여 `.env`에 입력

### 실행

```bash
# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 🎮 게임 방법

1. **대기열**: 대기 순서가 0이 될 때까지 기다립니다
2. **카운트다운**: 3, 2, 1, START! 카운트다운이 진행됩니다
3. **게임 플레이**: 보라색으로 활성화된 2개의 좌석을 빠르게 클릭하세요
4. **라운드 진행**: 총 5라운드를 완료하면 최종 결과가 표시됩니다

## 📦 배포하기

### Vercel (추천)

1. [Vercel](https://vercel.com) 계정 생성
2. GitHub 저장소 연결
3. 자동 배포 완료!

```bash
# Vercel CLI로 배포
npm install -g vercel
vercel
```

### Netlify

1. [Netlify](https://netlify.com) 계정 생성
2. `dist` 폴더를 드래그 앤 드롭하여 배포

```bash
# Netlify CLI로 배포
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### GitHub Pages

```bash
# package.json에 base 설정 추가
# vite.config.ts에 base: '/레포지토리명/' 추가

npm run build
# dist 폴더를 gh-pages 브랜치에 푸시
```

### 기타 호스팅 서비스

- **Firebase Hosting**: `firebase deploy`
- **AWS S3 + CloudFront**: S3 버킷에 업로드
- **DigitalOcean App Platform**: Git 저장소 연결

## 🛠️ 기술 스택

- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빠른 빌드 도구
- **CSS3** - 애니메이션 및 스타일링
- **Canvas API** - 컨페티 애니메이션

## 📁 프로젝트 구조

```
TicketingTrainer/
├── src/
│   ├── App.tsx          # 메인 앱 컴포넌트
│   ├── App.css          # 스타일시트
│   ├── main.tsx         # 엔트리 포인트
│   └── index.css        # 글로벌 스타일
├── index.html           # HTML 템플릿
├── package.json         # 의존성 관리
├── vite.config.ts       # Vite 설정
└── tsconfig.json        # TypeScript 설정
```

## 🎨 커스터마이징

### 라운드 수 변경

```typescript
// App.tsx
const totalRounds = 5  // 원하는 라운드 수로 변경
```

### 좌석 그리드 크기 조정

```typescript
// App.tsx - seatGrid 함수
const seatGrid = (round: number): [number, number] => {
  switch (round) {
    case 1: return [10, 14]  // [행, 열] 조정
    // ...
  }
}
```

### 색상 테마 변경

```css
/* App.css */
.waiting-queue {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(99, 102, 241, 0.9));
  /* 원하는 색상으로 변경 */
}
```

## 📄 라이선스

MIT License

## 🤝 기여하기

이슈와 PR은 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 열어주세요.

---

Made with ❤️ for better ticketing experience


# 🚀 배포 가이드

이 문서는 티켓팅 트레이너 웹앱을 다양한 플랫폼에 배포하는 방법을 설명합니다.

## 📋 배포 전 체크리스트

- [ ] `npm install` 실행
- [ ] `npm run build` 정상 작동 확인
- [ ] `npm run preview`로 빌드 결과 테스트
- [ ] 모든 기능이 정상 작동하는지 확인

## 1️⃣ Vercel (가장 쉬움, 추천 ⭐)

### 방법 A: GitHub 연동 (자동 배포)

1. [Vercel](https://vercel.com)에 가입
2. "New Project" 클릭
3. GitHub 저장소 연결
4. 프로젝트 선택
5. 설정은 자동으로 감지됨 (Vite)
6. "Deploy" 클릭
7. 완료! 🎉

**장점:**
- Git push할 때마다 자동 배포
- 무료 도메인 제공 (your-app.vercel.app)
- HTTPS 자동 적용
- 무료 플랜으로도 충분

### 방법 B: Vercel CLI

```bash
# Vercel CLI 설치
npm install -g vercel

# 프로젝트 디렉토리에서 실행
vercel

# 프로덕션 배포
vercel --prod
```

## 2️⃣ Netlify

### 방법 A: Drag & Drop

1. [Netlify](https://netlify.com)에 가입
2. 빌드 실행:
```bash
npm run build
```
3. Netlify 대시보드로 이동
4. `dist` 폴더를 드래그 앤 드롭
5. 완료! 🎉

### 방법 B: Netlify CLI

```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 로그인
netlify login

# 빌드
npm run build

# 배포
netlify deploy --prod --dir=dist
```

### 방법 C: GitHub 연동 (자동 배포)

1. Netlify에 가입
2. "New site from Git" 클릭
3. GitHub 저장소 연결
4. 빌드 설정:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. "Deploy site" 클릭

## 3️⃣ GitHub Pages

### 설정

1. `vite.config.ts` 수정:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/TicketingTrainer/', // 저장소 이름으로 변경
})
```

2. `package.json`에 배포 스크립트 추가:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

3. gh-pages 설치:
```bash
npm install --save-dev gh-pages
```

4. 배포:
```bash
npm run deploy
```

5. GitHub 저장소 설정:
   - Settings > Pages
   - Source: gh-pages branch 선택
   - Save

6. 접속: `https://yourusername.github.io/TicketingTrainer/`

## 4️⃣ Firebase Hosting

### 설정

1. Firebase CLI 설치:
```bash
npm install -g firebase-tools
```

2. Firebase 로그인:
```bash
firebase login
```

3. 프로젝트 초기화:
```bash
firebase init hosting
```

설정:
- Public directory: `dist`
- Single-page app: `Yes`
- GitHub auto deploys: 선택 사항

4. 빌드 및 배포:
```bash
npm run build
firebase deploy
```

## 5️⃣ AWS S3 + CloudFront

### 단계

1. S3 버킷 생성:
   - Static website hosting 활성화
   - 퍼블릭 액세스 허용

2. 빌드:
```bash
npm run build
```

3. S3에 업로드:
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

4. CloudFront 배포 생성 (선택 사항, HTTPS 위해)

## 6️⃣ DigitalOcean App Platform

1. [DigitalOcean](https://digitalocean.com) 계정 생성
2. App Platform으로 이동
3. "Create App" 클릭
4. GitHub 저장소 연결
5. 빌드 설정:
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. "Launch App" 클릭

## 🔧 환경 변수 설정

만약 API 키 등의 환경 변수가 필요한 경우:

### Vercel/Netlify
- 대시보드에서 Environment Variables 섹션에 추가

### 로컬 개발
`.env` 파일 생성:
```bash
VITE_API_KEY=your_api_key
```

코드에서 사용:
```typescript
const apiKey = import.meta.env.VITE_API_KEY
```

## 📱 커스텀 도메인 연결

### Vercel/Netlify
1. 대시보드에서 "Domains" 섹션으로 이동
2. "Add domain" 클릭
3. DNS 레코드 설정:
   - A 레코드 또는 CNAME 추가
4. SSL 인증서 자동 발급

## 🐛 트러블슈팅

### 빌드 실패
```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 404 에러 (SPA 라우팅)
대부분의 호스팅 서비스는 자동으로 처리하지만, 직접 설정이 필요한 경우:

**Netlify**: `public/_redirects` 파일 생성
```
/*    /index.html   200
```

**Vercel**: 자동 처리됨 ✅

### 환경 변수가 작동하지 않음
- 환경 변수 이름이 `VITE_`로 시작하는지 확인
- 빌드를 다시 실행
- 배포 플랫폼에서 환경 변수가 올바르게 설정되었는지 확인

## 📊 성능 최적화

### 빌드 최적화
```bash
# 프로덕션 빌드
npm run build

# 빌드 분석
npm run build -- --mode analyze
```

### CDN 활용
Vercel, Netlify, CloudFront 모두 자동으로 CDN을 제공합니다.

### 이미지 최적화
필요한 경우 이미지를 WebP 포맷으로 변환하고 압축하세요.

## 🎯 추천 배포 전략

**개발자 초보**: Vercel (GitHub 연동)
- 가장 쉽고 빠름
- 자동 배포
- 무료

**프로덕션 앱**: Vercel/Netlify (Professional)
- 안정적
- 좋은 성능
- 커스텀 도메인

**엔터프라이즈**: AWS/GCP
- 완전한 제어
- 확장성
- 더 많은 설정 필요

## 📞 도움이 필요하신가요?

- [Vercel 문서](https://vercel.com/docs)
- [Netlify 문서](https://docs.netlify.com)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)

---

Happy Deploying! 🚀


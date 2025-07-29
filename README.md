# EduMessage - 교육용 메시징 플랫폼

EduMessage는 교사, 학생, 학부모 간의 소통을 위한 통합 교육 플랫폼입니다. 메시지 관리, 과제 배포, 실시간 수업 세션, Q&A 패널, AI 기반 질문 분석 등의 기능을 제공합니다.

## 주요 기능

- 📧 **메시지 관리**: 교사-학생-학부모 간 메시지 시스템
- 📚 **과제 관리**: 과제 배포, 제출, 채점 시스템
- 📢 **공지사항**: 클래스별 알림 및 공지
- 🎓 **실시간 수업**: 라이브 세션 및 Q&A
- 🤖 **AI 분석**: Google Gemini를 활용한 질문 분석
- 📊 **대시보드**: 학습 현황 및 통계

## 기술 스택

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **UI**: Tailwind CSS, Shadcn UI
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 로컬 개발 환경 설정

### 1. 저장소 클론

```bash
git clone https://github.com/reallygood83/edumessage.git
cd edumessage
```

### 2. 의존성 설치

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. 환경변수 설정

`.env.example` 파일을 `.env.local`로 복사하고 필요한 값들을 설정하세요:

```bash
cp .env.example .env.local
```

`.env.local` 파일에서 다음 값들을 설정하세요:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# AI Configuration (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. 개발 서버 실행

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인할 수 있습니다.

## Vercel 배포 가이드

### 1. GitHub 업로드

먼저 프로젝트를 GitHub에 업로드하세요:

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/reallygood83/edumessage.git
git push -u origin main
```

### 2. Vercel 프로젝트 생성

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 `reallygood83/edumessage` 선택
4. Import 클릭

### 3. 환경변수 설정

Vercel 프로젝트 설정에서 다음 환경변수들을 추가하세요:

**Settings → Environment Variables**에서 다음 변수들을 추가:

```
NEXT_PUBLIC_SUPABASE_URL = your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key  
SUPABASE_SERVICE_KEY = your_supabase_service_role_key
GEMINI_API_KEY = your_gemini_api_key
```

### 4. 배포 설정

프로젝트에는 이미 `vercel.json` 파일이 포함되어 있어 다음과 같이 최적화됩니다:

- **Region**: Seoul (icn1) - 한국 사용자를 위한 최적화
- **Function Timeout**: 30초 - AI API 호출을 위한 충분한 시간
- **Environment Variables**: 자동 매핑

### 5. 도메인 설정 (선택사항)

Vercel에서 자동으로 제공하는 도메인 외에 커스텀 도메인을 사용하려면:

1. Vercel 프로젝트의 "Settings" → "Domains"
2. 원하는 도메인 추가
3. DNS 설정 업데이트

### 배포 확인

배포가 완료되면 Vercel에서 제공하는 URL을 통해 애플리케이션에 접근할 수 있습니다.

## Supabase 설정 가이드

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 데이터베이스 비밀번호 설정
3. 프로젝트 URL과 API 키 확인

### 2. 데이터베이스 스키마 설정

프로젝트에서 사용하는 테이블들:

- `users` - 사용자 정보
- `classes` - 클래스/수업 정보
- `messages` - 메시지 시스템
- `homework_assignments` - 과제 정보
- `homework_submissions` - 과제 제출
- `homework_grades` - 과제 채점
- `notifications` - 알림
- `sessions` - 수업 세션
- `session_participants` - 세션 참가자
- `session_questions` - Q&A 질문

### 3. Row Level Security (RLS) 설정

각 테이블에 대해 적절한 RLS 정책을 설정하여 데이터 보안을 강화하세요.

## 기본 포함 라이브러리

- [Next.js](https://nextjs.org) - React 프레임워크
- [React](https://react.dev) - UI 라이브러리
- [TypeScript](https://www.typescriptlang.org) - 타입 안전성
- [Tailwind CSS](https://tailwindcss.com) - 스타일링
- [Shadcn UI](https://ui.shadcn.com) - UI 컴포넌트
- [Supabase](https://supabase.com) - 백엔드 서비스
- [Lucide Icons](https://lucide.dev) - 아이콘
- [date-fns](https://date-fns.org) - 날짜 처리
- [Zod](https://zod.dev) - 스키마 검증

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지
│   ├── (dashboard)/       # 대시보드 페이지
│   └── api/               # API 라우트
├── components/            # 재사용 컴포넌트
│   ├── auth/              # 인증 컴포넌트
│   ├── homework/          # 과제 관련 컴포넌트
│   ├── messages/          # 메시지 컴포넌트
│   └── sessions/          # 세션 컴포넌트
├── lib/                   # 유틸리티 함수
│   ├── supabase/          # Supabase 설정
│   └── utils.ts           # 공통 유틸리티
└── types/                 # TypeScript 타입 정의
```

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

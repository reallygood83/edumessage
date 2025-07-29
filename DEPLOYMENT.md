# EduMessage 배포 가이드

## 목차
1. [사전 준비](#사전-준비)
2. [GitHub 업로드](#github-업로드)
3. [Vercel 배포](#vercel-배포)
4. [환경변수 설정](#환경변수-설정)
5. [도메인 설정](#도메인-설정)
6. [모니터링 및 관리](#모니터링-및-관리)

## 사전 준비

### 1. Supabase 프로젝트 생성
1. [Supabase 콘솔](https://app.supabase.com)에 로그인
2. "New project" 클릭하여 새 프로젝트 생성
3. 프로젝트 설정에서 다음 정보 확인:
   - Project URL: `https://your-project.supabase.co`
   - Anon key: `public` 키
   - Service role key: `private` 키 (주의: 절대 클라이언트에 노출하지 말 것)

### 2. Google Gemini API 키 생성
1. [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속
2. "Create API Key" 클릭
3. 생성된 API 키를 안전한 곳에 저장

### 3. Vercel 계정 준비
1. [Vercel](https://vercel.com)에 GitHub 계정으로 로그인
2. GitHub 저장소 접근 권한 허용

## GitHub 업로드

### 1. 환경 파일 확인
배포 전에 민감한 정보가 포함되지 않았는지 확인:

```bash
# .env.local 파일이 .gitignore에 포함되어 있는지 확인
cat .gitignore | grep ".env"

# 실제 키가 포함된 파일들이 추가되지 않았는지 확인
git status
```

### 2. GitHub 저장소에 푸시

```bash
# 모든 변경사항 스테이징
git add .

# 커밋 생성
git commit -m "Initial deployment setup"

# GitHub 원격 저장소 설정 (이미 설정된 경우 생략)
git remote add origin https://github.com/reallygood83/edumessage.git

# main 브랜치로 푸시
git push -u origin main
```

## Vercel 배포

### 1. 프로젝트 Import
1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. "Add New" → "Project" 클릭
3. "Import Git Repository" 섹션에서 `reallygood83/edumessage` 선택
4. "Import" 클릭

### 2. 프로젝트 설정
- **Framework Preset**: Next.js (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build and Output Settings**: 기본값 사용
- **Install Command**: `npm ci`
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (자동 설정)

### 3. 배포 시작
"Deploy" 버튼을 클릭하여 배포 시작 (환경변수는 나중에 설정)

## 환경변수 설정

### 1. Vercel 환경변수 추가
Vercel 프로젝트 대시보드에서:

1. "Settings" 탭 클릭
2. "Environment Variables" 메뉴 선택
3. 다음 환경변수들을 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Production, Preview, Development |
| `GEMINI_API_KEY` | Google Gemini API key | Production, Preview, Development |

### 2. 환경변수 보안 체크리스트
- [ ] `SUPABASE_SERVICE_KEY`는 절대 클라이언트 코드에 노출되지 않음
- [ ] `GEMINI_API_KEY`는 서버사이드에서만 사용됨
- [ ] 모든 키가 올바른 프로젝트/환경용인지 확인
- [ ] 개발용과 프로덕션용 키를 구분하여 사용

### 3. 재배포
환경변수 설정 후 "Deployments" 탭에서 "Redeploy" 클릭

## 도메인 설정

### 1. Vercel 기본 도메인
배포 완료 후 Vercel에서 제공하는 도메인:
- `https://edumessage.vercel.app`
- `https://edumessage-{team}.vercel.app`

### 2. 커스텀 도메인 (선택사항)
자체 도메인을 사용하려면:

1. Vercel 프로젝트의 "Settings" → "Domains"
2. 도메인 입력 후 "Add" 클릭
3. DNS 설정 업데이트:
   ```
   Type: CNAME
   Name: www (또는 subdomain)
   Value: cname.vercel-dns.com
   ```

## 모니터링 및 관리

### 1. 배포 상태 확인
- **Functions**: API 라우트들이 정상 작동하는지 확인
- **Build Logs**: 빌드 과정에서 오류가 없었는지 확인
- **Runtime Logs**: 실행 중 발생하는 오류 모니터링

### 2. 성능 최적화
Vercel 대시보드에서 확인할 수 있는 메트릭:
- **Page Load Time**: 페이지 로딩 속도
- **Function Duration**: API 함수 실행 시간
- **Cache Hit Rate**: 캐시 적중률

### 3. 보안 모니터링
- **Environment Variables**: 정기적으로 API 키 회전
- **Function Logs**: 비정상적인 API 호출 패턴 모니터링
- **Error Tracking**: 예상치 못한 오류 발생 시 즉시 대응

## 트러블슈팅

### 일반적인 문제들

#### 1. 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# TypeScript 오류 확인
npm run type-check
```

#### 2. 환경변수 문제
- Vercel 대시보드에서 환경변수 값 재확인
- 각 환경(Production, Preview, Development)에 모두 설정되어 있는지 확인

#### 3. Supabase 연결 오류
- Supabase 프로젝트가 활성 상태인지 확인
- RLS(Row Level Security) 정책이 올바르게 설정되어 있는지 확인

#### 4. API 응답 시간 초과
- Vercel Function timeout (30초) 내에서 완료되는지 확인
- 복잡한 AI 요청의 경우 응답 시간 최적화 필요

### 긴급 대응

#### 서비스 다운 시
1. Vercel 대시보드에서 Function 로그 확인
2. 필요시 이전 배포 버전으로 롤백
3. 환경변수나 외부 서비스(Supabase, Gemini) 상태 확인

#### 보안 사고 시
1. 즉시 해당 API 키들을 비활성화
2. 새로운 키로 교체
3. 로그 분석으로 피해 범위 확인

## 지속적인 유지보수

### 1. 정기 업데이트
- 의존성 패키지 업데이트
- Next.js 및 Vercel 기능 업데이트 적용
- 보안 패치 적용

### 2. 모니터링 설정
- Vercel Analytics 활성화
- 에러 추적 도구 연동 (예: Sentry)
- 사용량 모니터링 및 알림 설정

### 3. 백업 전략
- Supabase 데이터베이스 정기 백업
- 코드 저장소 백업 (GitHub)
- 환경변수 및 설정 문서화

---

## 연락처
배포 관련 문의사항이 있으시면 프로젝트 관리자에게 연락해 주세요.
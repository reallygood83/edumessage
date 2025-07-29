# EduMessage AI 분석 기능 가이드

## 🧠 개요

EduMessage의 AI 분석 기능은 Google Gemini API를 활용하여 학생들의 질문을 분석하고 교육적 인사이트를 제공합니다.

## 🚀 주요 기능

### 1. 질문 분석 (Question Analysis)
- **카테고리 분류**: 질문을 교육적 카테고리로 분류
- **후속 질문 생성**: 학습 이해도를 확인할 수 있는 후속 질문 제안
- **답변 제안**: AI가 생성한 구체적이고 교육적인 답변 제안
- **신뢰도 평가**: 각 분석 결과의 신뢰도 점수 제공

### 2. 패턴 분석 (Pattern Analysis)
- **주요 관심 주제**: 학급에서 자주 논의되는 주제 분석
- **어려움 영역**: 학생들이 특히 어려워하는 영역 파악
- **학습 공백**: 놓치고 있는 학습 요소 발견
- **교수법 제안**: 개선된 교수법 추천

### 3. AI 인사이트 대시보드
- **클래스별 분석**: 각 학급의 질문 패턴과 학습 동향
- **실시간 통계**: 질문 수, 참여도, 응답 시간 등
- **종합 리포트**: AI가 생성한 교육적 권장사항

## 🛠️ 설정 방법

### 1. Gemini API 키 설정

`.env.local` 파일에 다음을 추가:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. API 키 발급 방법

1. [Google AI Studio](https://makersuite.google.com/) 접속
2. 새 API 키 생성
3. 키를 복사하여 환경 변수에 설정
4. 서버 재시작

### 3. 데이터베이스 마이그레이션

AI 분석 결과를 저장하기 위한 테이블 생성:

```sql
-- src/database/06_ai_analysis.sql 실행
psql -d your_database < src/database/06_ai_analysis.sql
```

## 📋 사용 방법

### 교사 계정에서 AI 분석 사용

1. **실시간 Q&A에서 개별 질문 분석**
   - 세션 상세 페이지 → Q&A 탭
   - 질문 옆의 "AI 분석" 버튼 클릭
   - 카테고리 분석, 후속 질문, 답변 제안 탭 확인

2. **클래스 전체 패턴 분석**
   - 대시보드 → AI 교육 인사이트
   - 클래스 선택 후 "AI 분석 실행" 버튼
   - 생성된 인사이트와 권장사항 확인

3. **교육적 활용**
   - AI 제안 답변을 참고하여 실제 답변 작성
   - 후속 질문을 활용하여 학습 이해도 확인
   - 패턴 분석 결과로 수업 계획 개선

## 🔧 API 엔드포인트

### 질문 분석 API
```
POST /api/ai/analyze-question
Content-Type: application/json

{
  "questionId": "uuid",
  "analysisType": "categorize|follow_up|answer_suggestions",
  "subject": "수학",
  "level": "중급",
  "context": "추가 컨텍스트"
}
```

### 패턴 분석 API
```
POST /api/ai/analyze-patterns
Content-Type: application/json

{
  "classId": "uuid",
  "sessionId": "uuid",
  "timeRange": "최근 7일",
  "subject": "수학"
}
```

## 📊 분석 결과 구조

### 질문 카테고리 분석
```typescript
interface QuestionAnalysis {
  category: string          // 개념이해, 문제해결, 실습지원 등
  confidence: number        // 0.0 ~ 1.0 신뢰도
  reasoning: string         // 분류 근거
  keywords: string[]        // 핵심 키워드
}
```

### 후속 질문 생성
```typescript
interface FollowUpQuestions {
  understanding_check: string[]     // 이해도 확인 질문
  deeper_thinking: string[]         // 심화 사고 질문
  practical_application: string[]   // 실제 적용 질문
  explanation: string               // 활용 가이드
}
```

### 답변 제안
```typescript
interface AnswerSuggestions {
  main_answer: string               // 주요 답변
  examples: string[]                // 구체적 예시
  analogies: string                 // 이해를 돕는 비유
  related_concepts: string[]        // 관련 개념
  additional_resources: string[]    // 추천 학습 자료
  follow_up_activities: string[]    // 후속 학습 활동
}
```

## ⚠️ 주의사항 및 에러 처리

### 일반적인 오류와 해결책

1. **API 키 관련 오류**
   ```
   Error: GEMINI_API_KEY is not configured
   ```
   - `.env.local`에 올바른 API 키 설정
   - 서버 재시작 필요

2. **사용량 제한 오류**
   ```
   Error: Rate limit exceeded
   ```
   - 잠시 후 다시 시도
   - API 키의 할당량 확인

3. **네트워크 연결 오류**
   ```
   Error: Failed to fetch
   ```
   - 인터넷 연결 상태 확인
   - 방화벽 설정 점검

4. **분석 데이터 부족**
   ```
   Error: No questions found for analysis
   ```
   - 더 많은 질문 등록 후 재시도
   - 시간 범위 조정

### 성능 최적화

- **캐싱**: 동일한 질문의 분석 결과는 24시간 캐시
- **배치 처리**: 대량 분석 시 순차 처리로 API 제한 회피
- **에러 복구**: 실패한 분석은 자동으로 재시도

## 🧪 테스트 방법

### 자동 테스트 실행
```bash
node test_ai_analysis.js
```

### 수동 테스트 절차

1. **질문 등록 테스트**
   - 학생 계정으로 Q&A에 다양한 질문 등록
   - 수학, 영어, 과학 등 다양한 과목으로 테스트

2. **분석 기능 테스트**
   - 교사 계정으로 "AI 분석" 버튼 클릭
   - 각 분석 탭의 결과 확인
   - 에러 처리 동작 확인

3. **대시보드 테스트**
   - AI 인사이트 페이지 접속
   - 클래스별 통계 확인
   - 패턴 분석 실행 및 결과 검토

## 📈 활용 시나리오

### 시나리오 1: 개별 질문 분석
학생이 "삼각형의 넓이 공식이 왜 밑변×높이÷2인가요?"라고 질문했을 때:

1. AI가 **개념이해** 카테고리로 분류 (신뢰도 95%)
2. 후속 질문 제안:
   - "다른 도형의 넓이 공식과 어떤 공통점이 있을까요?"
   - "직사각형과 삼각형의 관계를 설명해볼 수 있나요?"
3. 답변 제안: 직사각형을 반으로 나누는 비유 활용

### 시나리오 2: 클래스 패턴 분석
한 학급의 최근 7일 질문을 분석한 결과:

1. **주요 관심 주제**: 함수, 그래프, 방정식
2. **어려움 영역**: 이차함수의 그래프 해석
3. **교수법 제안**: 시각적 도구 활용, 단계별 설명 강화
4. **권장사항**: 그래프 그리기 실습 시간 확대

## 🔮 향후 개발 계획

### 단기 계획
- [ ] 다국어 지원 (영어, 중국어)
- [ ] 실시간 분석 결과 알림
- [ ] 분석 결과 PDF 내보내기

### 중장기 계획
- [ ] 학습자 개별 맞춤 분석
- [ ] 학습 성과 예측 모델
- [ ] 교사 간 인사이트 공유 기능

---

## 📞 지원

- **개발자**: EduMessage 개발팀
- **문의**: GitHub Issues 또는 기술 지원팀
- **문서 업데이트**: 2025년 1월

> 💡 **팁**: AI 분석 기능을 최대한 활용하려면 다양한 유형의 질문을 충분히 수집한 후 사용하세요. 더 많은 데이터가 있을수록 더 정확한 인사이트를 얻을 수 있습니다.
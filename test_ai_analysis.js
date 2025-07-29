#!/usr/bin/env node

/**
 * AI Analysis Test Script
 * Tests the AI question analysis functionality in EduMessage
 */

const readline = require('readline');

const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test data
const testQuestions = [
  {
    question: "삼각형의 넓이를 구하는 공식이 헷갈려요. 왜 밑변 × 높이 ÷ 2인가요?",
    subject: "수학",
    sessionId: "test-session-1",
    classId: "test-class-1"
  },
  {
    question: "영어 문법에서 현재완료시제는 언제 사용하나요? have와 has의 차이점도 알고 싶어요.",
    subject: "영어",
    sessionId: "test-session-2", 
    classId: "test-class-1"
  },
  {
    question: "광합성 과정에서 엽록체의 역할이 뭔가요?",
    subject: "과학",
    sessionId: "test-session-3",
    classId: "test-class-1"
  }
];

async function testQuestionAnalysis() {
  console.log('🧠 AI 질문 분석 테스트 시작...\n');

  for (let i = 0; i < testQuestions.length; i++) {
    const testData = testQuestions[i];
    console.log(`\n📝 테스트 ${i + 1}: ${testData.subject} 질문`);
    console.log(`질문: "${testData.question}"`);
    console.log('분석 중...\n');

    try {
      // Test question categorization
      console.log('1️⃣ 질문 분류 분석');
      const categoryResponse = await fetch(`${API_BASE}/api/ai/analyze-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testData.question,
          subject: testData.subject,
          analysisType: 'categorize',
          sessionId: testData.sessionId
        })
      });

      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json();
        console.log('✅ 분류 결과:', JSON.stringify(categoryData.analysis, null, 2));
      } else {
        const error = await categoryResponse.json();
        console.log('❌ 분류 실패:', error.error);
      }

      // Test follow-up questions
      console.log('\n2️⃣ 후속 질문 생성');
      const followUpResponse = await fetch(`${API_BASE}/api/ai/analyze-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testData.question,
          subject: testData.subject,
          analysisType: 'follow_up',
          sessionId: testData.sessionId
        })
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        console.log('✅ 후속 질문:', JSON.stringify(followUpData.analysis, null, 2));
      } else {
        const error = await followUpResponse.json();
        console.log('❌ 후속 질문 생성 실패:', error.error);
      }

      // Test answer suggestions
      console.log('\n3️⃣ 답변 제안 생성');
      const answerResponse = await fetch(`${API_BASE}/api/ai/analyze-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testData.question,
          subject: testData.subject,
          analysisType: 'answer_suggestions',
          sessionId: testData.sessionId
        })
      });

      if (answerResponse.ok) {
        const answerData = await answerResponse.json();
        console.log('✅ 답변 제안:', JSON.stringify(answerData.analysis, null, 2));
      } else {
        const error = await answerResponse.json();
        console.log('❌ 답변 제안 실패:', error.error);
      }

      console.log('\n' + '='.repeat(60));
      
    } catch (error) {
      console.log('💥 테스트 오류:', error.message);
    }
  }
}

async function testPatternAnalysis() {
  console.log('\n\n🔍 패턴 분석 테스트 시작...\n');

  try {
    const response = await fetch(`${API_BASE}/api/ai/analyze-patterns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: 'test-class-1',
        timeRange: '최근 7일',
        subject: '수학'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 패턴 분석 결과:', JSON.stringify(data.analysis, null, 2));
    } else {
      const error = await response.json();
      console.log('❌ 패턴 분석 실패:', error.error);
    }
  } catch (error) {
    console.log('💥 패턴 분석 오류:', error.message);
  }
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  console.log('🚀 EduMessage AI Analysis Test Suite');
  console.log('=====================================\n');

  // Check if Gemini API key is configured
  console.log('🔑 환경 변수 확인...');
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY가 설정되지 않았습니다.');
    console.log('   .env.local 파일에 GEMINI_API_KEY를 추가하세요.');
    process.exit(1);
  }
  console.log('✅ GEMINI_API_KEY 설정됨\n');

  const runQuestionTests = await askQuestion('질문 분석 테스트를 실행하시겠습니까? (y/n): ');
  
  if (runQuestionTests === 'y' || runQuestionTests === 'yes') {
    await testQuestionAnalysis();
  }

  const runPatternTests = await askQuestion('\n패턴 분석 테스트를 실행하시겠습니까? (y/n): ');
  
  if (runPatternTests === 'y' || runPatternTests === 'yes') {
    await testPatternAnalysis();
  }

  console.log('\n✨ 테스트 완료!');
  console.log('\n📋 다음 단계:');
  console.log('1. 실제 Q&A 세션에서 질문 등록');
  console.log('2. 교사 계정으로 "AI 분석" 버튼 클릭');
  console.log('3. AI 인사이트 대시보드에서 전체 분석 확인');
  
  rl.close();
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('💥 처리되지 않은 오류:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 테스트 중단됨');
  rl.close();
  process.exit(0);
});

main().catch(console.error);
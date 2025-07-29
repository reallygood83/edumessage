import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Get the Gemini Pro model
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' })

// Question analysis prompt templates
export const QUESTION_ANALYSIS_PROMPTS = {
  categorize: `
    다음 학생 질문을 분석하고 카테고리를 분류해주세요:
    
    질문: "{question}"
    과목: {subject}
    
    다음 카테고리 중 하나를 선택하고 이유를 설명해주세요:
    1. 개념이해 - 기본 개념에 대한 질문
    2. 문제해결 - 구체적인 문제나 과제 관련 질문
    3. 실습지원 - 실습이나 실험 관련 질문
    4. 심화학습 - 고급 내용이나 추가 학습 관련 질문
    5. 시험준비 - 평가나 시험 관련 질문
    6. 진로상담 - 진로나 학습 방향 관련 질문
    7. 기타 - 위 카테고리에 속하지 않는 질문
    
    응답 형식:
    {
      "category": "선택된 카테고리",
      "confidence": 0.85,
      "reasoning": "분류 이유 설명",
      "keywords": ["키워드1", "키워드2", "키워드3"]
    }
  `,
  
  suggest_followup: `
    학생의 질문을 분석하고 교사가 물어볼 수 있는 후속 질문들을 제안해주세요:
    
    원본 질문: "{question}"
    과목: {subject}
    학습 수준: {level}
    
    다음을 포함한 후속 질문들을 제안해주세요:
    1. 이해도 확인 질문 (2개)
    2. 심화 사고 유도 질문 (2개)
    3. 실제 적용 질문 (1개)
    
    응답 형식:
    {
      "understanding_check": [
        "이해도 확인 질문 1",
        "이해도 확인 질문 2"
      ],
      "deeper_thinking": [
        "심화 사고 질문 1",
        "심화 사고 질문 2"
      ],
      "practical_application": [
        "실제 적용 질문"
      ],
      "explanation": "이러한 질문들이 학습에 도움이 되는 이유"
    }
  `,
  
  analyze_patterns: `
    다음 학생 질문들의 패턴을 분석해주세요:
    
    질문들:
    {questions}
    
    과목: {subject}
    기간: {timeRange}
    
    다음을 분석해주세요:
    1. 주요 관심 주제
    2. 학습 어려움 포인트
    3. 이해도 수준
    4. 개선 제안
    
    응답 형식:
    {
      "main_topics": ["주제1", "주제2", "주제3"],
      "difficulty_areas": ["어려운 영역1", "어려운 영역2"],
      "comprehension_level": "초급/중급/고급",
      "learning_gaps": ["학습 공백1", "학습 공백2"],
      "teaching_suggestions": [
        "교수법 제안1",
        "교수법 제안2",
        "교수법 제안3"
      ],
      "additional_resources": [
        "추천 자료1",
        "추천 자료2"
      ]
    }
  `,
  
  generate_answer_suggestions: `
    학생 질문에 대한 교사 답변 초안을 작성해주세요:
    
    질문: "{question}"
    과목: {subject}
    학습자 수준: {level}
    질문 맥락: {context}
    
    다음을 포함한 답변을 작성해주세요:
    1. 명확하고 이해하기 쉬운 설명
    2. 구체적인 예시나 비유
    3. 추가 학습 자료 제안
    4. 관련 개념 연결
    
    응답 형식:
    {
      "main_answer": "주요 답변 내용",
      "examples": [
        "예시1",
        "예시2"
      ],
      "analogies": "이해를 돕는 비유",
      "related_concepts": ["관련 개념1", "관련 개념2"],
      "additional_resources": [
        "추천 자료1",
        "추천 자료2"
      ],
      "follow_up_activities": [
        "후속 활동1",
        "후속 활동2"
      ]
    }
  `
}

// AI analysis functions
export async function analyzeQuestionCategory(question: string, subject: string) {
  try {
    const prompt = QUESTION_ANALYSIS_PROMPTS.categorize
      .replace('{question}', question)
      .replace('{subject}', subject)
    
    const result = await geminiModel.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Invalid response format')
  } catch (error) {
    console.error('Question categorization error:', error)
    return {
      category: '기타',
      confidence: 0.5,
      reasoning: '분석 중 오류가 발생했습니다.',
      keywords: []
    }
  }
}

export async function generateFollowUpQuestions(
  question: string, 
  subject: string, 
  level: string = '중급'
) {
  try {
    const prompt = QUESTION_ANALYSIS_PROMPTS.suggest_followup
      .replace('{question}', question)
      .replace('{subject}', subject)
      .replace('{level}', level)
    
    const result = await geminiModel.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Invalid response format')
  } catch (error) {
    console.error('Follow-up question generation error:', error)
    return {
      understanding_check: ['이 개념에 대해 더 궁금한 점이 있나요?'],
      deeper_thinking: ['이 내용을 실생활에 어떻게 적용할 수 있을까요?'],
      practical_application: ['직접 해보면서 어떤 점이 어려웠나요?'],
      explanation: '질문 생성 중 오류가 발생했습니다.'
    }
  }
}

export async function analyzeQuestionPatterns(
  questions: Array<{question: string, created_at: string}>,
  subject: string,
  timeRange: string
) {
  try {
    const questionText = questions
      .map((q, index) => `${index + 1}. ${q.question} (${q.created_at})`)
      .join('\n')
    
    const prompt = QUESTION_ANALYSIS_PROMPTS.analyze_patterns
      .replace('{questions}', questionText)
      .replace('{subject}', subject)
      .replace('{timeRange}', timeRange)
    
    const result = await geminiModel.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Invalid response format')
  } catch (error) {
    console.error('Pattern analysis error:', error)
    return {
      main_topics: ['분석 중 오류 발생'],
      difficulty_areas: ['분석 중 오류 발생'],
      comprehension_level: '중급',
      learning_gaps: ['분석 중 오류 발생'],
      teaching_suggestions: ['분석을 다시 시도해주세요.'],
      additional_resources: []
    }
  }
}

export async function generateAnswerSuggestions(
  question: string,
  subject: string,
  level: string = '중급',
  context: string = ''
) {
  try {
    const prompt = QUESTION_ANALYSIS_PROMPTS.generate_answer_suggestions
      .replace('{question}', question)
      .replace('{subject}', subject)
      .replace('{level}', level)
      .replace('{context}', context)
    
    const result = await geminiModel.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Invalid response format')
  } catch (error) {
    console.error('Answer suggestion error:', error)
    return {
      main_answer: '답변 생성 중 오류가 발생했습니다.',
      examples: [],
      analogies: '',
      related_concepts: [],
      additional_resources: [],
      follow_up_activities: []
    }
  }
}
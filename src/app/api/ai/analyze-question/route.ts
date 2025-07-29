import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { 
  analyzeQuestionCategory, 
  generateFollowUpQuestions,
  generateAnswerSuggestions 
} from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { 
      questionId, 
      analysisType = 'categorize',
      subject = '일반',
      level = '중급',
      context = ''
    } = await request.json()
    
    if (!questionId) {
      return NextResponse.json(
        { error: '질문 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 질문 정보 조회
    const { data: question, error: questionError } = await supabase
      .from('session_qa')
      .select(`
        id,
        question,
        session_id,
        class_sessions (
          id,
          teacher_id,
          subject,
          class_id
        )
      `)
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return NextResponse.json(
        { error: '질문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 교사 권한 확인
    const isTeacher = (question.class_sessions as any).teacher_id === user.id
    
    if (!isTeacher) {
      return NextResponse.json(
        { error: '교사만 AI 분석을 사용할 수 있습니다.' },
        { status: 403 }
      )
    }

    let analysisResult

    // 분석 타입에 따른 처리
    switch (analysisType) {
      case 'categorize':
        analysisResult = await analyzeQuestionCategory(
          question.question,
          subject || (question.class_sessions as any).subject || '일반'
        )
        break
      
      case 'follow_up':
        analysisResult = await generateFollowUpQuestions(
          question.question,
          subject || (question.class_sessions as any).subject || '일반',
          level
        )
        break
      
      case 'answer_suggestions':
        analysisResult = await generateAnswerSuggestions(
          question.question,
          subject || (question.class_sessions as any).subject || '일반',
          level,
          context
        )
        break
      
      default:
        return NextResponse.json(
          { error: '지원하지 않는 분석 타입입니다.' },
          { status: 400 }
        )
    }

    // 분석 결과 저장 (선택사항)
    const { error: saveError } = await supabase
      .from('qa_ai_analysis')
      .insert([
        {
          question_id: questionId,
          analysis_type: analysisType,
          analysis_result: analysisResult,
          user_id: user.id,
          created_at: new Date().toISOString()
        }
      ])

    if (saveError) {
      console.error('AI 분석 결과 저장 실패:', saveError)
      // 저장 실패해도 분석 결과는 반환
    }

    return NextResponse.json({
      analysis: analysisResult,
      questionId,
      analysisType
    })
    
  } catch (error) {
    console.error('AI 분석 실패:', error)
    return NextResponse.json(
      { error: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
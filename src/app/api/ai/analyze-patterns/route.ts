import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeQuestionPatterns } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { 
      sessionId,
      classId,
      timeRange = '최근 7일',
      subject = '일반'
    } = await request.json()
    
    if (!sessionId && !classId) {
      return NextResponse.json(
        { error: '세션 ID 또는 클래스 ID가 필요합니다.' },
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

    let query = supabase
      .from('session_qa')
      .select(`
        id,
        question,
        created_at,
        priority,
        status,
        class_sessions (
          id,
          teacher_id,
          subject,
          class_id,
          title
        )
      `)

    // 조건에 따른 쿼리 필터링
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else if (classId) {
      // 클래스의 모든 세션 질문 조회
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('class_id', classId)
      
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        query = query.in('session_id', sessionIds)
      } else {
        return NextResponse.json({
          analysis: {
            main_topics: [],
            difficulty_areas: [],
            comprehension_level: '데이터 없음',
            learning_gaps: [],
            teaching_suggestions: ['질문이 없어 분석할 수 없습니다.'],
            additional_resources: []
          },
          questionCount: 0,
          timeRange
        })
      }
    }

    // 시간 범위 적용
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case '최근 1일':
        startDate.setDate(now.getDate() - 1)
        break
      case '최근 7일':
        startDate.setDate(now.getDate() - 7)
        break
      case '최근 30일':
        startDate.setDate(now.getDate() - 30)
        break
      case '최근 3개월':
        startDate.setMonth(now.getMonth() - 3)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    query = query
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(50) // 최대 50개 질문까지 분석

    const { data: questions, error: questionsError } = await query

    if (questionsError) {
      console.error('질문 조회 실패:', questionsError)
      return NextResponse.json(
        { error: '질문을 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({
        analysis: {
          main_topics: [],
          difficulty_areas: [],
          comprehension_level: '데이터 없음',
          learning_gaps: [],
          teaching_suggestions: ['분석할 질문이 없습니다.'],
          additional_resources: []
        },
        questionCount: 0,
        timeRange
      })
    }

    // 교사 권한 확인 (첫 번째 질문의 세션으로 확인)
    const firstQuestion = questions[0]
    const isTeacher = (firstQuestion.class_sessions as any).teacher_id === user.id
    
    if (!isTeacher) {
      return NextResponse.json(
        { error: '교사만 패턴 분석을 사용할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 질문 데이터 준비
    const questionData = questions.map(q => ({
      question: q.question,
      created_at: new Date(q.created_at).toLocaleDateString('ko-KR')
    }))

    // AI 패턴 분석 실행
    const analysisResult = await analyzeQuestionPatterns(
      questionData,
      subject || (firstQuestion.class_sessions as any).subject || '일반',
      timeRange
    )

    // 분석 결과 저장
    const { error: saveError } = await supabase
      .from('qa_pattern_analysis')
      .insert([
        {
          session_id: sessionId,
          class_id: classId,
          time_range: timeRange,
          question_count: questions.length,
          analysis_result: analysisResult,
          user_id: user.id,
          created_at: new Date().toISOString()
        }
      ])

    if (saveError) {
      console.error('패턴 분석 결과 저장 실패:', saveError)
      // 저장 실패해도 분석 결과는 반환
    }

    return NextResponse.json({
      analysis: analysisResult,
      questionCount: questions.length,
      timeRange,
      sessionId,
      classId
    })
    
  } catch (error) {
    console.error('패턴 분석 실패:', error)
    return NextResponse.json(
      { error: 'AI 패턴 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
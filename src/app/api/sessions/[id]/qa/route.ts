import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch Q&A for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, answered, dismissed
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 세션 접근 권한 확인
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        class_id,
        teacher_id,
        classes (
          id,
          teacher_id
        )
      `)
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const isTeacher = session.teacher_id === user.id
    let canAccess = isTeacher

    // 학생인 경우 학급 멤버십 확인
    if (!isTeacher) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', session.class_id)
        .eq('user_id', user.id)
        .single()

      canAccess = !!memberData
    }

    if (!canAccess) {
      return NextResponse.json(
        { error: '해당 세션에 접근할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Q&A 조회
    let query = supabase
      .from('session_qa')
      .select(`
        id,
        question,
        answer,
        status,
        priority,
        is_anonymous,
        votes,
        created_at,
        answered_at,
        student:users!session_qa_student_id_fkey (
          id,
          name
        ),
        teacher:users!session_qa_teacher_id_fkey (
          id,
          name
        )
      `)
      .eq('session_id', id)

    if (status) {
      query = query.eq('status', status)
    }

    query = query
      .order('priority', { ascending: false })
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: qaList, error: qaError } = await query

    if (qaError) {
      console.error('Q&A 조회 오류:', qaError)
      return NextResponse.json(
        { error: 'Q&A를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    // 익명 질문의 경우 학생 정보 숨기기 (교사가 아닌 경우)
    const processedQA = qaList?.map(qa => ({
      ...qa,
      student: qa.is_anonymous && !isTeacher ? null : qa.student
    })) || []

    return NextResponse.json({ questions: processedQA })
    
  } catch (error) {
    console.error('Q&A 조회 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: Create new question (students) or answer (teachers)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { question, answer, questionId, priority = 'normal', isAnonymous = false } = await request.json()
    
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 세션 정보 확인
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        class_id,
        teacher_id,
        status,
        qa_enabled
      `)
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!session.qa_enabled) {
      return NextResponse.json(
        { error: '이 세션에서는 Q&A가 비활성화되어 있습니다.' },
        { status: 400 }
      )
    }

    const isTeacher = session.teacher_id === user.id

    // 질문 생성 (학생)
    if (question && !questionId) {
      if (isTeacher) {
        return NextResponse.json(
          { error: '교사는 질문을 생성할 수 없습니다.' },
          { status: 403 }
        )
      }

      // 학급 멤버십 확인
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', session.class_id)
        .eq('user_id', user.id)
        .single()

      if (!memberData) {
        return NextResponse.json(
          { error: '해당 학급에 접근할 권한이 없습니다.' },
          { status: 403 }
        )
      }

      const { data: newQuestion, error: createError } = await supabase
        .from('session_qa')
        .insert([
          {
            session_id: id,
            student_id: user.id,
            question: question.trim(),
            priority,
            is_anonymous: isAnonymous
          }
        ])
        .select(`
          id,
          question,
          status,
          priority,
          is_anonymous,
          votes,
          created_at,
          student:users!session_qa_student_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (createError) {
        console.error('질문 생성 오류:', createError)
        return NextResponse.json(
          { error: '질문 생성에 실패했습니다.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        question: {
          ...newQuestion,
          student: isAnonymous ? null : newQuestion.student
        },
        message: '질문이 등록되었습니다.' 
      })
    }

    // 답변 생성 (교사)
    if (answer && questionId) {
      if (!isTeacher) {
        return NextResponse.json(
          { error: '교사만 답변할 수 있습니다.' },
          { status: 403 }
        )
      }

      const { data: updatedQuestion, error: updateError } = await supabase
        .from('session_qa')
        .update({
          answer: answer.trim(),
          teacher_id: user.id,
          status: 'answered',
          answered_at: new Date().toISOString()
        })
        .eq('id', questionId)
        .eq('session_id', id)
        .select(`
          id,
          question,
          answer,
          status,
          priority,
          is_anonymous,
          votes,
          created_at,
          answered_at,
          student:users!session_qa_student_id_fkey (
            id,
            name
          ),
          teacher:users!session_qa_teacher_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (updateError) {
        console.error('답변 생성 오류:', updateError)
        return NextResponse.json(
          { error: '답변 생성에 실패했습니다.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        question: updatedQuestion,
        message: '답변이 등록되었습니다.' 
      })
    }

    return NextResponse.json(
      { error: '올바른 요청 데이터가 필요합니다.' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Q&A 처리 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: Update question status or vote
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { questionId, status, vote, priority } = await request.json()
    
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

    // 세션 및 질문 정보 확인
    const { data: question, error: questionError } = await supabase
      .from('session_qa')
      .select(`
        id,
        session_id,
        student_id,
        votes,
        priority,
        status,
        class_sessions (
          teacher_id,
          class_id
        )
      `)
      .eq('id', questionId)
      .eq('session_id', id)
      .single()

    if (questionError || !question) {
      return NextResponse.json(
        { error: '질문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const isTeacher = (question.class_sessions as any).teacher_id === user.id
    const isQuestionOwner = question.student_id === user.id

    // 투표 처리 (학생만)
    if (vote !== undefined) {
      if (isTeacher) {
        return NextResponse.json(
          { error: '교사는 투표할 수 없습니다.' },
          { status: 403 }
        )
      }

      // 학급 멤버십 확인
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', (question.class_sessions as any).class_id)
        .eq('user_id', user.id)
        .single()

      if (!memberData) {
        return NextResponse.json(
          { error: '해당 학급에 접근할 권한이 없습니다.' },
          { status: 403 }
        )
      }

      const newVotes = Math.max(0, question.votes + (vote ? 1 : -1))
      
      const { error: voteError } = await supabase
        .from('session_qa')
        .update({ votes: newVotes })
        .eq('id', questionId)

      if (voteError) {
        console.error('투표 오류:', voteError)
        return NextResponse.json(
          { error: '투표에 실패했습니다.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        votes: newVotes,
        message: vote ? '투표했습니다.' : '투표를 취소했습니다.' 
      })
    }

    // 상태 변경 (교사만)
    if (status) {
      if (!isTeacher) {
        return NextResponse.json(
          { error: '교사만 질문 상태를 변경할 수 있습니다.' },
          { status: 403 }
        )
      }

      const updateData: any = { status }
      if (priority) {
        updateData.priority = priority
      }

      const { error: statusError } = await supabase
        .from('session_qa')
        .update(updateData)
        .eq('id', questionId)

      if (statusError) {
        console.error('상태 변경 오류:', statusError)
        return NextResponse.json(
          { error: '상태 변경에 실패했습니다.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ message: '상태가 변경되었습니다.' })
    }

    return NextResponse.json(
      { error: '올바른 요청 데이터가 필요합니다.' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Q&A 업데이트 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
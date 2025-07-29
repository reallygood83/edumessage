import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get specific session with content and participants
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 세션 정보 조회
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        class_id,
        teacher_id,
        title,
        description,
        subject,
        session_type,
        status,
        scheduled_start,
        scheduled_end,
        actual_start,
        actual_end,
        max_participants,
        allow_late_join,
        recording_enabled,
        chat_enabled,
        qa_enabled,
        screen_sharing_enabled,
        attendance_tracking,
        session_url,
        meeting_id,
        passcode,
        created_at,
        updated_at,
        users (
          id,
          name
        ),
        classes (
          id,
          name,
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

    // 학생인 경우 학급 멤버십 확인
    if (!isTeacher) {
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
    }

    // 세션 콘텐츠 조회
    const { data: content, error: contentError } = await supabase
      .from('session_content')
      .select('*')
      .eq('session_id', id)
      .order('order_index', { ascending: true })

    if (contentError) {
      console.error('콘텐츠 조회 오류:', contentError)
    }

    // 참여자 목록 조회 (교사인 경우)
    let participants: any[] = []
    if (isTeacher) {
      const { data: participantData, error: participantError } = await supabase
        .from('session_participants')
        .select(`
          id,
          joined_at,
          left_at,
          duration_minutes,
          participation_score,
          notes,
          status,
          users (
            id,
            name,
            role
          )
        `)
        .eq('session_id', id)
        .order('joined_at', { ascending: true })

      if (!participantError) {
        participants = participantData || []
      }
    }

    // 개인 참여 정보 조회 (학생인 경우)
    let myParticipation = null
    if (!isTeacher) {
      const { data: participationData } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', id)
        .eq('user_id', user.id)
        .single()

      myParticipation = participationData
    }

    // Q&A 조회
    const { data: qaData, error: qaError } = await supabase
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
        users!session_qa_student_id_fkey (
          id,
          name
        ),
        teacher:users!session_qa_teacher_id_fkey (
          id,
          name
        )
      `)
      .eq('session_id', id)
      .order('created_at', { ascending: false })

    if (qaError) {
      console.error('Q&A 조회 오류:', qaError)
    }

    // 녹화 영상 조회
    const { data: recordings, error: recordingError } = await supabase
      .from('session_recordings')
      .select('*')
      .eq('session_id', id)
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (recordingError) {
      console.error('녹화 조회 오류:', recordingError)
    }

    return NextResponse.json({ 
      session,
      content: content || [],
      participants,
      myParticipation,
      qa: qaData || [],
      recordings: recordings || []
    })
    
  } catch (error) {
    console.error('세션 상세 조회 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: Update session (teachers only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let updateData = await request.json()
    
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 세션 정보 확인 및 권한 검증
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select('teacher_id, status')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (session.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '자신이 생성한 세션만 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 진행 중인 세션의 경우 특정 필드만 수정 가능
    if (session.status === 'live') {
      const allowedFields = ['description', 'chat_enabled', 'qa_enabled', 'recording_enabled']
      const filteredUpdateData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: Record<string, any>, key) => {
          obj[key] = updateData[key]
          return obj
        }, {})

      if (Object.keys(filteredUpdateData).length === 0) {
        return NextResponse.json(
          { error: '진행 중인 세션은 일부 설정만 변경할 수 있습니다.' },
          { status: 400 }
        )
      }

      updateData = filteredUpdateData
    }

    // 세션 업데이트
    const { data: updatedSession, error: updateError } = await supabase
      .from('class_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('세션 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '세션 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session: updatedSession })
    
  } catch (error) {
    console.error('세션 업데이트 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: Delete session (teachers only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 세션 정보 확인 및 권한 검증
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select('teacher_id, status')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (session.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '자신이 생성한 세션만 삭제할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 진행 중인 세션은 삭제 불가
    if (session.status === 'live') {
      return NextResponse.json(
        { error: '진행 중인 세션은 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 세션 삭제 (관련 데이터도 CASCADE로 삭제됨)
    const { error: deleteError } = await supabase
      .from('class_sessions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('세션 삭제 오류:', deleteError)
      return NextResponse.json(
        { error: '세션 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '세션이 삭제되었습니다.' })
    
  } catch (error) {
    console.error('세션 삭제 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
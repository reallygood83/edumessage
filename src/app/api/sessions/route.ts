import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch sessions for a class
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const status = searchParams.get('status') // scheduled, live, completed, cancelled
    const upcoming = searchParams.get('upcoming') === 'true'
    
    if (!classId) {
      return NextResponse.json(
        { error: '학급 ID가 필요합니다.' },
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

    // 사용자의 해당 학급 접근 권한 확인
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single()

    if (classError) {
      return NextResponse.json(
        { error: '학급을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const isTeacher = classData.teacher_id === user.id

    // 학생인 경우 학급 멤버십 확인
    if (!isTeacher) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single()

      if (!memberData) {
        return NextResponse.json(
          { error: '해당 학급에 접근할 권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    // 세션 목록 조회
    let query = supabase
      .from('class_sessions')
      .select(`
        id,
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
        created_at,
        updated_at,
        users (
          id,
          name
        )
      `)
      .eq('class_id', classId)

    // 필터 적용
    if (status) {
      query = query.eq('status', status)
    }

    if (upcoming) {
      query = query.gte('scheduled_start', new Date().toISOString())
    }

    // 정렬
    query = query.order('scheduled_start', { ascending: true })

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('세션 조회 오류:', sessionsError)
      return NextResponse.json(
        { error: '세션을 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    // 각 세션에 대한 참여 정보 추가 (학생인 경우)
    if (!isTeacher) {
      const sessionsWithParticipation = await Promise.all(
        sessions.map(async (session) => {
          const { data: participation } = await supabase
            .from('session_participants')
            .select('joined_at, left_at, duration_minutes, participation_score')
            .eq('session_id', session.id)
            .eq('user_id', user.id)
            .single()

          return {
            ...session,
            my_participation: participation || null
          }
        })
      )

      return NextResponse.json({ sessions: sessionsWithParticipation })
    }

    // 교사인 경우 참여자 수 정보 추가
    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        const { count: participantCount } = await supabase
          .from('session_participants')
          .select('id', { count: 'exact' })
          .eq('session_id', session.id)

        const { count: qaCount } = await supabase
          .from('session_qa')
          .select('id', { count: 'exact' })
          .eq('session_id', session.id)
          .eq('status', 'pending')

        return {
          ...session,
          participant_count: participantCount || 0,
          pending_questions: qaCount || 0
        }
      })
    )

    return NextResponse.json({ sessions: sessionsWithStats })
    
  } catch (error) {
    console.error('세션 조회 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: Create new session (teachers only)
export async function POST(request: NextRequest) {
  try {
    const { 
      classId, 
      title, 
      description, 
      subject,
      sessionType = 'lecture',
      scheduledStart,
      scheduledEnd,
      maxParticipants,
      allowLateJoin = true,
      recordingEnabled = false,
      chatEnabled = true,
      qaEnabled = true,
      screenSharingEnabled = true,
      attendanceTracking = true,
      sessionUrl,
      meetingId,
      passcode
    } = await request.json()
    
    if (!classId || !title || !scheduledStart || !scheduledEnd) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 시간 검증
    const startTime = new Date(scheduledStart)
    const endTime = new Date(scheduledEnd)
    const now = new Date()

    if (startTime <= now) {
      return NextResponse.json(
        { error: '시작 시간은 현재 시간보다 이후여야 합니다.' },
        { status: 400 }
      )
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: '종료 시간은 시작 시간보다 이후여야 합니다.' },
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

    // 교사 권한 및 학급 담당 확인
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single()

    if (classError || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '해당 학급의 교사만 세션을 생성할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 세션 생성
    const { data: session, error: createError } = await supabase
      .from('class_sessions')
      .insert([
        {
          class_id: classId,
          teacher_id: user.id,
          title,
          description,
          subject,
          session_type: sessionType,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          max_participants: maxParticipants || null,
          allow_late_join: allowLateJoin,
          recording_enabled: recordingEnabled,
          chat_enabled: chatEnabled,
          qa_enabled: qaEnabled,
          screen_sharing_enabled: screenSharingEnabled,
          attendance_tracking: attendanceTracking,
          session_url: sessionUrl || null,
          meeting_id: meetingId || null,
          passcode: passcode || null
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('세션 생성 오류:', createError)
      return NextResponse.json(
        { error: '세션 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session })
    
  } catch (error) {
    console.error('세션 생성 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
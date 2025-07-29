import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Join session (students)
export async function POST(
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

    // 세션 정보 확인
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        class_id,
        teacher_id,
        title,
        status,
        scheduled_start,
        scheduled_end,
        max_participants,
        allow_late_join
      `)
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 학급 멤버십 확인 (교사이거나 해당 학급 학생이어야 함)
    const isTeacher = session.teacher_id === user.id
    let canJoin = isTeacher

    if (!isTeacher) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', session.class_id)
        .eq('user_id', user.id)
        .single()

      canJoin = !!memberData
    }

    if (!canJoin) {
      return NextResponse.json(
        { error: '해당 세션에 참여할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 세션 상태 확인
    const now = new Date()
    const scheduledStart = new Date(session.scheduled_start)
    const scheduledEnd = new Date(session.scheduled_end)

    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: '취소된 세션입니다.' },
        { status: 400 }
      )
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { error: '이미 종료된 세션입니다.' },
        { status: 400 }
      )
    }

    // 지각 참여 확인
    if (now > scheduledStart && !session.allow_late_join) {
      return NextResponse.json(
        { error: '이 세션은 지각 참여를 허용하지 않습니다.' },
        { status: 400 }
      )
    }

    if (now > scheduledEnd) {
      return NextResponse.json(
        { error: '세션이 이미 종료되었습니다.' },
        { status: 400 }
      )
    }

    // 최대 참여자 수 확인
    if (session.max_participants) {
      const { count: currentParticipants } = await supabase
        .from('session_participants')
        .select('id', { count: 'exact' })
        .eq('session_id', id)
        .is('left_at', null)

      if ((currentParticipants ?? 0) >= session.max_participants) {
        return NextResponse.json(
          { error: '세션 최대 참여자 수에 도달했습니다.' },
          { status: 400 }
        )
      }
    }

    // 기존 참여 기록 확인
    const { data: existingParticipation } = await supabase
      .from('session_participants')
      .select('id, left_at')
      .eq('session_id', id)
      .eq('user_id', user.id)
      .single()

    let participation
    if (existingParticipation) {
      // 재참여 (이전에 나간 경우)
      if (existingParticipation.left_at) {
        const { data: updatedParticipation, error: updateError } = await supabase
          .from('session_participants')
          .update({
            joined_at: now.toISOString(),
            left_at: null,
            status: 'reconnected'
          })
          .eq('id', existingParticipation.id)
          .select()
          .single()

        if (updateError) {
          console.error('참여 재개 오류:', updateError)
          return NextResponse.json(
            { error: '세션 재참여에 실패했습니다.' },
            { status: 500 }
          )
        }

        participation = updatedParticipation
      } else {
        // 이미 참여 중
        return NextResponse.json(
          { error: '이미 세션에 참여 중입니다.' },
          { status: 400 }
        )
      }
    } else {
      // 새 참여
      const { data: newParticipation, error: createError } = await supabase
        .from('session_participants')
        .insert([
          {
            session_id: id,
            user_id: user.id,
            status: 'joined'
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('참여 생성 오류:', createError)
        return NextResponse.json(
          { error: '세션 참여에 실패했습니다.' },
          { status: 500 }
        )
      }

      participation = newParticipation
    }

    // 세션이 아직 시작되지 않았다면 상태를 'live'로 변경 (교사가 참여하는 경우)
    if (isTeacher && session.status === 'scheduled' && now >= scheduledStart) {
      await supabase
        .from('class_sessions')
        .update({ 
          status: 'live',
          actual_start: now.toISOString()
        })
        .eq('id', id)
    }

    return NextResponse.json({ 
      participation,
      message: existingParticipation ? '세션에 재참여했습니다.' : '세션에 참여했습니다.'
    })
    
  } catch (error) {
    console.error('세션 참여 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: Leave session
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

    // 참여 기록 확인
    const { data: participation, error: participationError } = await supabase
      .from('session_participants')
      .select('id, joined_at, left_at')
      .eq('session_id', id)
      .eq('user_id', user.id)
      .single()

    if (participationError || !participation) {
      return NextResponse.json(
        { error: '세션에 참여하지 않았습니다.' },
        { status: 404 }
      )
    }

    if (participation.left_at) {
      return NextResponse.json(
        { error: '이미 세션을 나갔습니다.' },
        { status: 400 }
      )
    }

    // 세션 나가기
    const now = new Date()
    const { error: leaveError } = await supabase
      .from('session_participants')
      .update({
        left_at: now.toISOString(),
        status: 'left'
      })
      .eq('id', participation.id)

    if (leaveError) {
      console.error('세션 나가기 오류:', leaveError)
      return NextResponse.json(
        { error: '세션 나가기에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '세션을 나갔습니다.' })
    
  } catch (error) {
    console.error('세션 나가기 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
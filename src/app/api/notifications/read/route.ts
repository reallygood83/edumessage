import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Mark notification as read
export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json()
    
    if (!notificationId) {
      return NextResponse.json(
        { error: '알림 ID가 필요합니다.' },
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

    // 알림이 존재하는지 확인
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id, class_id')
      .eq('id', notificationId)
      .single()

    if (notificationError || !notification) {
      return NextResponse.json(
        { error: '알림을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 사용자가 해당 학급에 접근 권한이 있는지 확인
    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', notification.class_id)
      .single()

    const isTeacher = classData?.teacher_id === user.id
    let isMember = false

    if (!isTeacher) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', notification.class_id)
        .eq('user_id', user.id)
        .single()

      isMember = !!memberData
    }

    if (!isTeacher && !isMember) {
      return NextResponse.json(
        { error: '해당 알림에 접근할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 읽음 상태 추가 (중복 시 무시)
    const { error: readError } = await supabase
      .from('notification_reads')
      .upsert([
        {
          notification_id: notificationId,
          user_id: user.id
        }
      ])

    if (readError) {
      console.error('읽음 상태 업데이트 오류:', readError)
      return NextResponse.json(
        { error: '읽음 상태 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '읽음으로 표시되었습니다.' })
    
  } catch (error) {
    console.error('읽음 상태 업데이트 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
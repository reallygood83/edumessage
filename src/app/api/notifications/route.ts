import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch notifications for a class
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    
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

    // 교사이거나 해당 학급의 멤버인지 확인
    const isTeacher = classData.teacher_id === user.id
    let isMember = false

    if (!isTeacher) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single()

      isMember = !!memberData
    }

    if (!isTeacher && !isMember) {
      return NextResponse.json(
        { error: '해당 학급에 접근할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 알림 목록 조회 (읽음 상태 포함)
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select(`
        id,
        title,
        content,
        type,
        priority,
        is_pinned,
        expires_at,
        attachment_url,
        attachment_name,
        created_at,
        updated_at,
        users (
          id,
          name
        ),
        notification_reads!left (
          read_at
        )
      `)
      .eq('class_id', classId)
      .eq('notification_reads.user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (notificationsError) {
      console.error('알림 조회 오류:', notificationsError)
      return NextResponse.json(
        { error: '알림을 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notifications })
    
  } catch (error) {
    console.error('알림 조회 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: Create new notification (teachers only)
export async function POST(request: NextRequest) {
  try {
    const { 
      classId, 
      title, 
      content, 
      type = 'general', 
      priority = 'normal',
      isPinned = false,
      expiresAt,
      attachmentUrl,
      attachmentName
    } = await request.json()
    
    if (!classId || !title || !content) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
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

    // 교사 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData.role !== 'teacher') {
      return NextResponse.json(
        { error: '교사만 알림을 생성할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 해당 학급의 교사인지 확인
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single()

    if (classError || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '해당 학급의 교사만 알림을 생성할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 알림 생성
    const { data: notification, error: createError } = await supabase
      .from('notifications')
      .insert([
        {
          class_id: classId,
          teacher_id: user.id,
          title,
          content,
          type,
          priority,
          is_pinned: isPinned,
          expires_at: expiresAt || null,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('알림 생성 오류:', createError)
      return NextResponse.json(
        { error: '알림 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notification })
    
  } catch (error) {
    console.error('알림 생성 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
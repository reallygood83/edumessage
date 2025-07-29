import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PUT: Update notification (teachers only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { 
      title, 
      content, 
      type, 
      priority,
      isPinned,
      expiresAt,
      attachmentUrl,
      attachmentName
    } = await request.json()
    
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 알림 정보 확인 및 권한 검증
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (notificationError || !notification) {
      return NextResponse.json(
        { error: '알림을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (notification.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '자신이 작성한 알림만 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 알림 업데이트
    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({
        title,
        content,
        type,
        priority,
        is_pinned: isPinned,
        expires_at: expiresAt || null,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('알림 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '알림 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notification: updatedNotification })
    
  } catch (error) {
    console.error('알림 업데이트 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: Delete notification (teachers only)
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

    // 알림 정보 확인 및 권한 검증
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (notificationError || !notification) {
      return NextResponse.json(
        { error: '알림을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (notification.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '자신이 작성한 알림만 삭제할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 알림 삭제
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('알림 삭제 오류:', deleteError)
      return NextResponse.json(
        { error: '알림 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '알림이 삭제되었습니다.' })
    
  } catch (error) {
    console.error('알림 삭제 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
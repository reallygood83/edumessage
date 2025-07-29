import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messageId, approved } = await request.json()
    
    if (!messageId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
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

    // 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData.role !== 'teacher') {
      return NextResponse.json(
        { error: '교사만 메시지를 승인할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 메시지 정보 조회 및 권한 확인
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        classes (
          teacher_id
        )
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !messageData) {
      return NextResponse.json(
        { error: '메시지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // classes 데이터 추출
    const classData = Array.isArray(messageData.classes) 
      ? messageData.classes[0] 
      : messageData.classes

    // 해당 학급의 교사인지 확인
    if (classData?.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '해당 학급의 교사만 메시지를 승인할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 메시지 승인 상태 업데이트
    if (approved) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_approved: true })
        .eq('id', messageId)

      if (updateError) {
        console.error('메시지 승인 오류:', updateError)
        return NextResponse.json(
          { error: '메시지 승인에 실패했습니다.' },
          { status: 500 }
        )
      }
    } else {
      // 거부의 경우 메시지 삭제
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (deleteError) {
        console.error('메시지 삭제 오류:', deleteError)
        return NextResponse.json(
          { error: '메시지 삭제에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: approved ? '메시지가 승인되었습니다.' : '메시지가 거부되었습니다.'
    })
    
  } catch (error) {
    console.error('메시지 승인 처리 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
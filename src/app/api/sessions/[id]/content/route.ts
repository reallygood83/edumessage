import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Add content to session (teachers only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { 
      contentType, 
      title, 
      url, 
      thumbnailUrl, 
      fileSize, 
      duration, 
      orderIndex = 0,
      isDownloadable = false,
      isRequired = false,
      description 
    } = await request.json()
    
    if (!contentType || !title || !url) {
      return NextResponse.json(
        { error: '콘텐츠 타입, 제목, URL이 필요합니다.' },
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

    // 세션 권한 확인
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
        { error: '세션 소유자만 콘텐츠를 추가할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 콘텐츠 추가
    const { data: content, error: createError } = await supabase
      .from('session_content')
      .insert([
        {
          session_id: id,
          content_type: contentType,
          title,
          url,
          thumbnail_url: thumbnailUrl || null,
          file_size: fileSize || null,
          duration: duration || null,
          order_index: orderIndex,
          is_downloadable: isDownloadable,
          is_required: isRequired,
          description: description || null
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('콘텐츠 생성 오류:', createError)
      return NextResponse.json(
        { error: '콘텐츠 추가에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ content })
    
  } catch (error) {
    console.error('콘텐츠 추가 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: Update content order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { contentUpdates } = await request.json()
    
    if (!Array.isArray(contentUpdates)) {
      return NextResponse.json(
        { error: '올바른 콘텐츠 업데이트 데이터가 필요합니다.' },
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

    // 세션 권한 확인
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select('teacher_id')
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
        { error: '세션 소유자만 콘텐츠를 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 콘텐츠 순서 업데이트
    const updatePromises = contentUpdates.map(update => 
      supabase
        .from('session_content')
        .update({ order_index: update.orderIndex })
        .eq('id', update.id)
        .eq('session_id', id)
    )

    const results = await Promise.all(updatePromises)
    const hasError = results.some(result => result.error)

    if (hasError) {
      return NextResponse.json(
        { error: '콘텐츠 순서 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '콘텐츠 순서가 업데이트되었습니다.' })
    
  } catch (error) {
    console.error('콘텐츠 순서 업데이트 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
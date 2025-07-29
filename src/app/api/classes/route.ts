import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/classes - 사용자의 클래스 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 메타데이터에서 역할 확인 (더 간단한 방법)
    const userRole = user.user_metadata?.role || 'student'

    let classesData
    
    if (userRole === 'teacher') {
      // 교사인 경우: 자신이 담당하는 클래스들
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          description,
          grade,
          subject,
          class_code,
          teacher_id,
          created_at,
          updated_at,
          class_members!inner(count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Teacher classes query error:', error)
        return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
      }
      
      // 학생 수 계산
      classesData = await Promise.all((data || []).map(async (cls) => {
        const { count } = await supabase
          .from('class_members')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('role', 'student')
        
        return {
          ...cls,
          _count: {
            students: count || 0
          }
        }
      }))
    } else {
      // 학생/학부모인 경우: 소속된 클래스들
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          class_id,
          role,
          joined_at,
          classes:class_id (
            id,
            name,
            description,
            grade,
            subject,
            class_code,
            teacher_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('Student classes query error:', error)
        return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
      }
      
      // class_members에서 classes 정보 추출
      classesData = data?.map(item => ({
        ...item.classes,
        member_role: item.role,
        joined_at: item.joined_at
      })) || []
    }

    return NextResponse.json({ classes: classesData })
  } catch (error) {
    console.error('Classes API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/classes - 새 클래스 생성 (교사만)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 교사 권한 확인
    const userRole = user.user_metadata?.role || 'student'
    if (userRole !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 })
    }

    // 요청 본문 파싱
    const body = await request.json()
    const { name, description, grade, subject } = body

    if (!name || !grade || !subject) {
      return NextResponse.json({ 
        error: 'Name, grade, and subject are required' 
      }, { status: 400 })
    }

    // 새 클래스 생성
    const { data: newClass, error: createError } = await supabase
      .from('classes')
      .insert({
        name,
        description: description || '',
        grade,
        subject,
        teacher_id: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Class creation error:', createError)
      return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Class created successfully',
      class: newClass 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create class API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/classes - 클래스 삭제 (교사만)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 교사 권한 확인
    const userRole = user.user_metadata?.role || 'student'
    if (userRole !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 })
    }

    // URL에서 클래스 ID 가져오기
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('id')

    if (!classId) {
      return NextResponse.json({ error: 'Class ID required' }, { status: 400 })
    }

    // 클래스 소유권 확인
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .eq('teacher_id', user.id)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 })
    }

    // 클래스 삭제 (CASCADE로 관련 데이터 자동 삭제)
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (deleteError) {
      console.error('Class deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Class deleted successfully',
      className: classData.name 
    })
    
  } catch (error) {
    console.error('Delete class API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
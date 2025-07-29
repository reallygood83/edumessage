import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/classes/[id]/students - 클래스 학생 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 클래스 접근 권한 확인 (교사이거나 해당 클래스의 구성원)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, teacher_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // 권한 확인: 교사이거나 해당 클래스의 구성원인지
    let hasAccess = classData.teacher_id === user.id

    if (!hasAccess) {
      const { data: memberData, error: memberError } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single()

      hasAccess = !memberError && !!memberData
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 학생 목록 조회
    const { data: studentsData, error: studentsError } = await supabase
      .from('class_members')
      .select(`
        joined_at,
        role,
        users (
          id,
          name,
          email
        )
      `)
      .eq('class_id', classId)
      .eq('role', 'student')
      .order('joined_at', { ascending: false })

    if (studentsError) {
      console.error('Students query error:', studentsError)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // 데이터 정리
    const students = studentsData
      ?.filter(member => member.users)
      .map(member => {
        const user = Array.isArray(member.users) ? member.users[0] : member.users
        return {
          id: user?.id,
          name: user?.name,
          email: user?.email,
          joined_at: member.joined_at,
          role: member.role
        }
      })
      .filter(student => student.id) || []

    return NextResponse.json({ 
      students,
      class: {
        id: classData.id,
        name: classData.name
      }
    })

  } catch (error) {
    console.error('Students API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
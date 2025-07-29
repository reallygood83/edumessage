import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get specific homework assignment with submissions (for teachers) or submission status (for students)
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

    // 숙제 정보 조회
    const { data: assignment, error: assignmentError } = await supabase
      .from('homework_assignments')
      .select(`
        id,
        class_id,
        teacher_id,
        title,
        description,
        subject,
        due_date,
        points_possible,
        allow_late_submission,
        late_penalty_percent,
        submission_format,
        instructions,
        attachment_url,
        attachment_name,
        is_published,
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

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: '숙제를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const isTeacher = assignment.teacher_id === user.id

    // 학생인 경우 학급 멤버십 및 발행 상태 확인
    if (!isTeacher) {
      if (!assignment.is_published) {
        return NextResponse.json(
          { error: '아직 발행되지 않은 숙제입니다.' },
          { status: 403 }
        )
      }

      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', assignment.class_id)
        .eq('user_id', user.id)
        .single()

      if (!memberData) {
        return NextResponse.json(
          { error: '해당 학급에 접근할 권한이 없습니다.' },
          { status: 403 }
        )
      }

      // 학생인 경우 자신의 제출 상태 조회
      const { data: submission, error: submissionError } = await supabase
        .from('homework_submissions')
        .select(`
          id,
          content,
          attachment_url,
          attachment_name,
          submitted_at,
          is_late,
          status,
          homework_grades (
            points_earned,
            feedback,
            graded_at
          ),
          homework_comments (
            id,
            content,
            created_at,
            users (
              id,
              name,
              role
            )
          )
        `)
        .eq('assignment_id', id)
        .eq('student_id', user.id)
        .single()

      return NextResponse.json({ 
        assignment, 
        submission: submission || null 
      })
    }

    // 교사인 경우 모든 제출물 조회
    const { data: submissions, error: submissionsError } = await supabase
      .from('homework_submissions')
      .select(`
        id,
        content,
        attachment_url,
        attachment_name,
        submitted_at,
        is_late,
        status,
        users (
          id,
          name
        ),
        homework_grades (
          id,
          points_earned,
          feedback,
          graded_at
        ),
        homework_comments (
          id,
          content,
          is_private,
          created_at,
          users (
            id,
            name,
            role
          )
        )
      `)
      .eq('assignment_id', id)
      .order('submitted_at', { ascending: false })

    if (submissionsError) {
      console.error('제출물 조회 오류:', submissionsError)
    }

    // 학급 학생 목록도 함께 조회 (미제출 학생 확인용)
    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select(`
        users (
          id,
          name,
          role
        )
      `)
      .eq('class_id', assignment.class_id)
      .eq('users.role', 'student')

    return NextResponse.json({ 
      assignment, 
      submissions: submissions || [],
      classMembers: classMembers || []
    })
    
  } catch (error) {
    console.error('숙제 상세 조회 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: Update homework assignment (teachers only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updateData = await request.json()
    
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 숙제 정보 확인 및 권한 검증
    const { data: assignment, error: assignmentError } = await supabase
      .from('homework_assignments')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: '숙제를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (assignment.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '자신이 작성한 숙제만 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 숙제 업데이트
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('homework_assignments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('숙제 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '숙제 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment: updatedAssignment })
    
  } catch (error) {
    console.error('숙제 업데이트 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: Delete homework assignment (teachers only)
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

    // 숙제 정보 확인 및 권한 검증
    const { data: assignment, error: assignmentError } = await supabase
      .from('homework_assignments')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: '숙제를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (assignment.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '자신이 작성한 숙제만 삭제할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 숙제 삭제 (관련 제출물도 CASCADE로 삭제됨)
    const { error: deleteError } = await supabase
      .from('homework_assignments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('숙제 삭제 오류:', deleteError)
      return NextResponse.json(
        { error: '숙제 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '숙제가 삭제되었습니다.' })
    
  } catch (error) {
    console.error('숙제 삭제 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
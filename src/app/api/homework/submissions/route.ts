import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Submit homework (students only)
export async function POST(request: NextRequest) {
  try {
    const { 
      assignmentId, 
      content, 
      attachmentUrl, 
      attachmentName 
    } = await request.json()
    
    if (!assignmentId || (!content && !attachmentUrl)) {
      return NextResponse.json(
        { error: '과제 ID와 제출 내용이 필요합니다.' },
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

    // 사용자가 학생인지 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData.role !== 'student') {
      return NextResponse.json(
        { error: '학생만 숙제를 제출할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 숙제 정보 확인
    const { data: assignment, error: assignmentError } = await supabase
      .from('homework_assignments')
      .select(`
        id,
        class_id,
        due_date,
        allow_late_submission,
        submission_format,
        is_published
      `)
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: '숙제를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!assignment.is_published) {
      return NextResponse.json(
        { error: '아직 발행되지 않은 숙제입니다.' },
        { status: 403 }
      )
    }

    // 학급 멤버십 확인
    const { data: memberData } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', assignment.class_id)
      .eq('user_id', user.id)
      .single()

    if (!memberData) {
      return NextResponse.json(
        { error: '해당 학급에 속하지 않습니다.' },
        { status: 403 }
      )
    }

    // 마감일 확인
    const now = new Date()
    const dueDate = new Date(assignment.due_date)
    const isLate = now > dueDate

    if (isLate && !assignment.allow_late_submission) {
      return NextResponse.json(
        { error: '마감일이 지난 숙제는 제출할 수 없습니다.' },
        { status: 403 }
      )
    }

    // 제출 형식 검증
    if (assignment.submission_format === 'text' && !content) {
      return NextResponse.json(
        { error: '텍스트 제출이 필요합니다.' },
        { status: 400 }
      )
    }

    if (assignment.submission_format === 'file' && !attachmentUrl) {
      return NextResponse.json(
        { error: '파일 제출이 필요합니다.' },
        { status: 400 }
      )
    }

    // 기존 제출물이 있는지 확인
    const { data: existingSubmission } = await supabase
      .from('homework_submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .single()

    let submission
    if (existingSubmission) {
      // 기존 제출물 업데이트
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('homework_submissions')
        .update({
          content,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
          submitted_at: now.toISOString(),
          is_late: isLate,
          status: 'submitted'
        })
        .eq('id', existingSubmission.id)
        .select()
        .single()

      if (updateError) {
        console.error('제출물 업데이트 오류:', updateError)
        return NextResponse.json(
          { error: '제출물 업데이트에 실패했습니다.' },
          { status: 500 }
        )
      }

      submission = updatedSubmission
    } else {
      // 새 제출물 생성
      const { data: newSubmission, error: createError } = await supabase
        .from('homework_submissions')
        .insert([
          {
            assignment_id: assignmentId,
            student_id: user.id,
            content,
            attachment_url: attachmentUrl || null,
            attachment_name: attachmentName || null,
            is_late: isLate,
            status: 'submitted'
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('제출물 생성 오류:', createError)
        return NextResponse.json(
          { error: '제출물 생성에 실패했습니다.' },
          { status: 500 }
        )
      }

      submission = newSubmission
    }

    return NextResponse.json({ 
      submission,
      message: existingSubmission ? '제출물이 업데이트되었습니다.' : '숙제가 제출되었습니다.'
    })
    
  } catch (error) {
    console.error('숙제 제출 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
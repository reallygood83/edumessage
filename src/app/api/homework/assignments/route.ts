import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch homework assignments for a class
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const studentView = searchParams.get('studentView') === 'true'
    
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

    const isTeacher = classData.teacher_id === user.id

    // 학생인 경우 학급 멤버십 확인
    if (!isTeacher) {
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single()

      if (!memberData) {
        return NextResponse.json(
          { error: '해당 학급에 접근할 권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    // 숙제 목록 조회
    let query = supabase
      .from('homework_assignments')
      .select(`
        id,
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
        )
      `)
      .eq('class_id', classId)
      .order('due_date', { ascending: true })

    // 학생 뷰인 경우 제출 상태도 함께 조회
    if (studentView && !isTeacher) {
      query = supabase
        .from('homework_assignments')
        .select(`
          id,
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
          homework_submissions!left (
            id,
            submitted_at,
            is_late,
            status,
            homework_grades (
              points_earned,
              feedback,
              graded_at
            )
          )
        `)
        .eq('class_id', classId)
        .eq('homework_submissions.student_id', user.id)
        .eq('is_published', true)
        .order('due_date', { ascending: true }) as any
    }

    const { data: assignments, error: assignmentsError } = await query

    if (assignmentsError) {
      console.error('숙제 조회 오류:', assignmentsError)
      return NextResponse.json(
        { error: '숙제를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignments })
    
  } catch (error) {
    console.error('숙제 조회 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: Create new homework assignment (teachers only)
export async function POST(request: NextRequest) {
  try {
    const { 
      classId, 
      title, 
      description, 
      subject,
      dueDate,
      pointsPossible = 100,
      allowLateSubmission = false,
      latePenaltyPercent = 0,
      submissionFormat = 'text',
      instructions,
      attachmentUrl,
      attachmentName,
      isPublished = true
    } = await request.json()
    
    if (!classId || !title || !description || !dueDate) {
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

    // 교사 권한 및 학급 담당 확인
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single()

    if (classError || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '해당 학급의 교사만 숙제를 생성할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 숙제 생성
    const { data: assignment, error: createError } = await supabase
      .from('homework_assignments')
      .insert([
        {
          class_id: classId,
          teacher_id: user.id,
          title,
          description,
          subject,
          due_date: dueDate,
          points_possible: pointsPossible,
          allow_late_submission: allowLateSubmission,
          late_penalty_percent: latePenaltyPercent,
          submission_format: submissionFormat,
          instructions,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
          is_published: isPublished
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('숙제 생성 오류:', createError)
      return NextResponse.json(
        { error: '숙제 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment })
    
  } catch (error) {
    console.error('숙제 생성 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
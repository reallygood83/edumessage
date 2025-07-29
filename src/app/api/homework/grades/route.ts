import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Grade homework submission (teachers only)
export async function POST(request: NextRequest) {
  try {
    const { 
      submissionId, 
      pointsEarned, 
      feedback 
    } = await request.json()
    
    if (!submissionId || pointsEarned === undefined) {
      return NextResponse.json(
        { error: '제출물 ID와 점수가 필요합니다.' },
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

    // 제출물 정보 및 권한 확인
    const { data: submissionData, error: submissionError } = await supabase
      .from('homework_submissions')
      .select(`
        id,
        assignment_id,
        student_id,
        homework_assignments (
          id,
          class_id,
          teacher_id,
          points_possible,
          classes (
            teacher_id
          )
        )
      `)
      .eq('id', submissionId)
      .single()

    if (submissionError || !submissionData) {
      return NextResponse.json(
        { error: '제출물을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // homework_assignments 데이터 추출
    const homeworkAssignment = Array.isArray(submissionData.homework_assignments) 
      ? submissionData.homework_assignments[0] 
      : submissionData.homework_assignments

    // 교사 권한 확인
    if (homeworkAssignment?.teacher_id !== user.id) {
      return NextResponse.json(
        { error: '해당 숙제의 담당 교사만 채점할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 점수 유효성 검증
    const maxPoints = homeworkAssignment?.points_possible
    if (!maxPoints || pointsEarned < 0 || pointsEarned > maxPoints) {
      return NextResponse.json(
        { error: `점수는 0부터 ${maxPoints || 0} 사이여야 합니다.` },
        { status: 400 }
      )
    }

    // 기존 채점 확인
    const { data: existingGrade } = await supabase
      .from('homework_grades')
      .select('id')
      .eq('submission_id', submissionId)
      .single()

    let grade
    if (existingGrade) {
      // 기존 채점 업데이트
      const { data: updatedGrade, error: updateError } = await supabase
        .from('homework_grades')
        .update({
          points_earned: pointsEarned,
          feedback: feedback || null,
          graded_at: new Date().toISOString()
        })
        .eq('id', existingGrade.id)
        .select()
        .single()

      if (updateError) {
        console.error('채점 업데이트 오류:', updateError)
        return NextResponse.json(
          { error: '채점 업데이트에 실패했습니다.' },
          { status: 500 }
        )
      }

      grade = updatedGrade
    } else {
      // 새 채점 생성
      const { data: newGrade, error: createError } = await supabase
        .from('homework_grades')
        .insert([
          {
            submission_id: submissionId,
            teacher_id: user.id,
            points_earned: pointsEarned,
            feedback: feedback || null
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('채점 생성 오류:', createError)
        return NextResponse.json(
          { error: '채점 생성에 실패했습니다.' },
          { status: 500 }
        )
      }

      grade = newGrade
    }

    // 제출물 상태 업데이트
    const { error: statusUpdateError } = await supabase
      .from('homework_submissions')
      .update({ status: 'graded' })
      .eq('id', submissionId)

    if (statusUpdateError) {
      console.error('제출물 상태 업데이트 오류:', statusUpdateError)
    }

    return NextResponse.json({ 
      grade,
      message: existingGrade ? '채점이 업데이트되었습니다.' : '채점이 완료되었습니다.'
    })
    
  } catch (error) {
    console.error('채점 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
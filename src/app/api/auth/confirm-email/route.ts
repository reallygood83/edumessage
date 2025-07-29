import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // 개발 환경에서만 허용 - 프로덕션에서는 절대 노출되지 않도록 엄격한 체크
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { error: '이 기능은 개발 환경에서만 사용할 수 있습니다.' },
      { status: 403 }
    )
  }

  // 추가 보안: DEV_API_ENABLED 환경 변수가 명시적으로 true일 때만 허용
  if (process.env.DEV_API_ENABLED !== 'true') {
    return NextResponse.json(
      { error: '개발 API가 비활성화되어 있습니다.' },
      { status: 403 }
    )
  }

  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // 사용자 조회 (admin 권한 사용)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('사용자 목록 조회 오류:', listError)
      return NextResponse.json(
        { error: '사용자 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const user = users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json(
        { error: '해당 이메일로 등록된 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 개발 환경에서 이메일 확인 상태 업데이트
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    )

    if (updateError) {
      console.error('이메일 확인 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '이메일 확인 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '이메일이 확인되었습니다. 이제 로그인할 수 있습니다.'
    })
    
  } catch (error) {
    console.error('이메일 확인 오류:', error)
    return NextResponse.json(
      { error: '이메일 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
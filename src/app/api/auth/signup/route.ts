import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()
    
    const supabase = await createClient()
    
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (authData.user) {
      // Insert user data into our users table
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email!,
            name,
            role,
          },
        ])

      if (insertError) {
        console.error('Error inserting user data:', insertError)
        
        // Rollback: Delete the auth user that was just created
        try {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id)
          if (deleteError) {
            console.error('Failed to rollback auth user:', deleteError)
          }
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError)
        }
        
        return NextResponse.json(
          { error: '사용자 정보 저장에 실패했습니다. 다시 시도해주세요.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.' },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
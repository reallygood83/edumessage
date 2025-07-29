'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await resetPassword(email)
      setSent(true)
      toast({
        title: '이메일 전송 완료',
        description: '비밀번호 재설정 링크를 이메일로 보내드렸습니다.',
      })
    } catch (error: any) {
      toast({
        title: '오류 발생',
        description: error.message || '이메일 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">이메일 전송 완료</CardTitle>
          <CardDescription className="text-center">
            비밀번호 재설정 링크를 확인해주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            {email}로 비밀번호 재설정 링크를 보내드렸습니다.
            이메일을 확인하여 비밀번호를 재설정해주세요.
          </p>
          <Link href="/login">
            <Button className="w-full">로그인 페이지로 돌아가기</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">비밀번호 재설정</CardTitle>
        <CardDescription className="text-center">
          등록된 이메일 주소를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? '전송 중...' : '재설정 링크 전송'}
          </Button>
        </form>
        
        <div className="mt-4 text-center">
          <Link 
            href="/login" 
            className="text-sm text-blue-600 hover:underline"
          >
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
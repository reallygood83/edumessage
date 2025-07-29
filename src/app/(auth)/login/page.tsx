'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmingEmail, setConfirmingEmail] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      toast({
        title: '로그인 성공',
        description: '환영합니다!',
      })
      router.push('/dashboard')
    } catch (error: any) {
      toast({
        title: '로그인 실패',
        description: error.message || '이메일과 비밀번호를 확인해주세요.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmEmail = async () => {
    if (!email) {
      toast({
        title: '이메일 입력 필요',
        description: '먼저 이메일을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setConfirmingEmail(true)

    try {
      const response = await fetch('/api/auth/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: '이메일 확인 완료',
          description: data.message,
        })
      } else {
        toast({
          title: '이메일 확인 실패',
          description: data.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '이메일 확인 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setConfirmingEmail(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">로그인</CardTitle>
        <CardDescription className="text-center">
          EduMessage에 로그인하세요
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
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
        
        <div className="mt-4 text-center space-y-2">
          <Link 
            href="/signup" 
            className="text-sm text-blue-600 hover:underline"
          >
            계정이 없으신가요? 회원가입
          </Link>
          <br />
          <Link 
            href="/reset-password" 
            className="text-sm text-gray-600 hover:underline"
          >
            비밀번호를 잊으셨나요?
          </Link>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800 mb-3">
                <strong>개발 모드 안내:</strong><br />
                회원가입 후 이메일 확인이 필요합니다.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mb-2 text-xs"
                onClick={handleConfirmEmail}
                disabled={confirmingEmail || !email}
              >
                {confirmingEmail ? '확인 중...' : '이메일 수동 확인 (개발용)'}
              </Button>
              <p className="text-xs text-yellow-700">
                위 이메일 필드에 회원가입한 이메일을 입력하고 <br />
                '이메일 수동 확인' 버튼을 클릭하세요.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClassInfo {
  id: string
  name: string
  description: string
  grade: string
  subject: string
  teacher_name: string
}

export default function JoinClassPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [classCode, setClassCode] = useState('')
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)

  const supabase = createClient()

  // 학급 코드로 학급 정보 조회
  const searchClass = async () => {
    if (!classCode.trim()) {
      toast({
        title: '오류',
        description: '학급 코드를 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          description,
          grade,
          subject,
          users (
            name
          )
        `)
        .eq('class_code', classCode.toUpperCase())
        .single()

      if (error || !data) {
        toast({
          title: '학급을 찾을 수 없습니다',
          description: '학급 코드를 다시 확인해주세요.',
          variant: 'destructive'
        })
        setClassInfo(null)
        return
      }

      // 이미 참여한 학급인지 확인
      const { data: memberCheck } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', data.id)
        .eq('user_id', user?.id)
        .single()

      if (memberCheck) {
        toast({
          title: '이미 참여한 학급입니다',
          description: '이미 이 학급에 참여하고 있습니다.',
          variant: 'destructive'
        })
        setClassInfo(null)
        return
      }

      const userData = Array.isArray(data.users) ? data.users[0] : data.users
      setClassInfo({
        id: data.id,
        name: data.name,
        description: data.description,
        grade: data.grade,
        subject: data.subject,
        teacher_name: userData?.name || 'Unknown'
      })

    } catch (error) {
      console.error('학급 검색 오류:', error)
      toast({
        title: '오류',
        description: '학급 검색 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 학급 참여
  const joinClass = async () => {
    if (!classInfo) return

    setJoining(true)
    try {
      const { error } = await supabase
        .from('class_members')
        .insert([
          {
            class_id: classInfo.id,
            user_id: user?.id,
            role: 'student'
          }
        ])

      if (error) {
        console.error('학급 참여 오류:', error)
        toast({
          title: '오류',
          description: '학급 참여에 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: '성공',
        description: `"${classInfo.name}" 학급에 참여했습니다!`
      })

      // 초기화
      setClassCode('')
      setClassInfo(null)

    } catch (error) {
      console.error('학급 참여 실패:', error)
      toast({
        title: '오류',
        description: '학급 참여 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">학급 참여</h1>
        <p className="text-gray-600 mt-2">
          선생님이 제공한 학급 코드를 입력하여 학급에 참여하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            학급 코드 입력
          </CardTitle>
          <CardDescription>
            선생님이 제공한 6자리 학급 코드를 입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="classCode">학급 코드</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="classCode"
                placeholder="예: ABC123"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="font-mono"
                maxLength={6}
              />
              <Button 
                onClick={searchClass}
                disabled={loading}
              >
                {loading ? '검색 중...' : '검색'}
              </Button>
            </div>
          </div>

          {classInfo && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-800">
                  <BookOpen className="h-5 w-5 inline mr-2" />
                  {classInfo.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">담당 교사:</span>
                    <span className="ml-2">{classInfo.teacher_name}</span>
                  </div>
                  {classInfo.grade && (
                    <div>
                      <span className="font-medium text-gray-700">학년:</span>
                      <span className="ml-2">{classInfo.grade}</span>
                    </div>
                  )}
                  {classInfo.subject && (
                    <div>
                      <span className="font-medium text-gray-700">과목:</span>
                      <span className="ml-2">{classInfo.subject}</span>
                    </div>
                  )}
                  {classInfo.description && (
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-700">설명:</span>
                      <span className="ml-2">{classInfo.description}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-green-200">
                  <Button 
                    onClick={joinClass}
                    disabled={joining}
                    className="w-full"
                  >
                    {joining ? '참여 중...' : '학급 참여하기'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-medium text-blue-900 mb-2">💡 안내사항</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 학급 코드는 6자리 영문/숫자 조합입니다.</li>
            <li>• 올바른 학급 코드를 입력하면 학급 정보가 표시됩니다.</li>
            <li>• 학급에 참여한 후에는 해당 학급의 메시지와 공지사항을 받아볼 수 있습니다.</li>
            <li>• 학급 코드를 모르시면 담당 선생님께 문의하세요.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
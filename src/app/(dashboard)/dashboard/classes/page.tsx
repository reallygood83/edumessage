'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Users, Settings, Trash2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Class {
  id: string
  name: string
  description: string
  grade: string
  subject: string
  teacher_id: string
  class_code: string
  created_at: string
  _count?: {
    students: number
  }
}

interface Student {
  id: string
  name: string
  email: string
  joined_at: string
}

export default function ClassesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    grade: '',
    subject: ''
  })

  const supabase = createClient()

  // 학급 목록 가져오기
  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_members(count)
        `)
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('학급 조회 오류:', error)
        toast({
          title: '오류',
          description: '학급 목록을 불러오는데 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      // 학생 수 계산
      const classesWithCount = data.map(cls => ({
        ...cls,
        _count: {
          students: cls.class_members?.length || 0
        }
      }))

      setClasses(classesWithCount)
    } catch (error) {
      console.error('학급 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 학급별 학생 목록 가져오기
  const fetchStudents = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          joined_at,
          users (
            id,
            name,
            email
          )
        `)
        .eq('class_id', classId)
        .eq('role', 'student')

      if (error || !data) {
        console.error('학생 목록 조회 오류:', error)
        return
      }

      const studentList = data
        .filter(member => member.users) 
        .map(member => {
          const user = Array.isArray(member.users) ? member.users[0] : member.users
          return {
            id: user?.id,
            name: user?.name,
            email: user?.email,
            joined_at: member.joined_at
          }
        })
        .filter(student => student.id) // id가 있는 학생만 포함

      setStudents(studentList)
    } catch (error) {
      console.error('학생 목록 조회 실패:', error)
    }
  }

  // 새 학급 생성
  const createClass = async () => {
    if (!newClass.name.trim()) {
      toast({
        title: '오류',
        description: '학급명을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    try {
      // 고유한 클래스 코드 생성
      const classCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { data, error } = await supabase
        .from('classes')
        .insert([
          {
            name: newClass.name,
            description: newClass.description,
            grade: newClass.grade,
            subject: newClass.subject,
            teacher_id: user?.id,
            class_code: classCode
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('학급 생성 오류:', error)
        toast({
          title: '오류',
          description: '학급 생성에 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: '성공',
        description: `학급 "${newClass.name}"이 생성되었습니다.`
      })

      // 폼 초기화 및 목록 새로고침
      setNewClass({ name: '', description: '', grade: '', subject: '' })
      setShowCreateForm(false)
      fetchClasses()

    } catch (error) {
      console.error('학급 생성 실패:', error)
      toast({
        title: '오류',
        description: '학급 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    }
  }

  // 학급 삭제
  const deleteClass = async (classId: string, className: string) => {
    if (!confirm(`"${className}" 학급을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)

      if (error) {
        console.error('학급 삭제 오류:', error)
        toast({
          title: '오류',
          description: '학급 삭제에 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: '성공',
        description: `학급 "${className}"이 삭제되었습니다.`
      })

      fetchClasses()
    } catch (error) {
      console.error('학급 삭제 실패:', error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user])

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass.id)
    }
  }, [selectedClass])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">학급 관리</h1>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          새 학급 만들기
        </Button>
      </div>

      {/* 새 학급 생성 폼 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>새 학급 만들기</CardTitle>
            <CardDescription>새로운 학급을 생성하고 학생들을 초대하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="className">학급명 *</Label>
                <Input
                  id="className"
                  placeholder="예: 5학년 1반"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="subject">과목</Label>
                <Input
                  id="subject"
                  placeholder="예: 수학"
                  value={newClass.subject}
                  onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grade">학년</Label>
                <Input
                  id="grade"
                  placeholder="예: 5학년"
                  value={newClass.grade}
                  onChange={(e) => setNewClass({ ...newClass, grade: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">설명</Label>
                <Input
                  id="description"
                  placeholder="학급에 대한 간단한 설명"
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createClass}>학급 생성</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 학급 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedClass(cls)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{cls.name}</CardTitle>
                  {cls.description && (
                    <CardDescription>{cls.description}</CardDescription>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteClass(cls.id, cls.name)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cls.grade && (
                  <Badge variant="secondary">{cls.grade}</Badge>
                )}
                {cls.subject && (
                  <Badge variant="outline">{cls.subject}</Badge>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  {cls._count?.students || 0}명의 학생
                </div>
                <div className="text-xs text-gray-500">
                  학급 코드: <span className="font-mono font-bold">{cls.class_code}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {classes.length === 0 && !showCreateForm && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              아직 학급이 없습니다
            </h3>
            <p className="text-gray-600 mb-4">
              첫 번째 학급을 만들어 학생들과 소통을 시작하세요.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              첫 학급 만들기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 선택된 학급의 학생 목록 모달 */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedClass.name} - 학생 목록
              </CardTitle>
              <CardDescription>
                학급 코드: <span className="font-mono font-bold">{selectedClass.class_code}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {students.length > 0 ? (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        가입일: {new Date(student.joined_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <UserPlus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">아직 학생이 없습니다.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      학급 코드 <span className="font-mono font-bold">{selectedClass.class_code}</span>를 
                      학생들에게 공유하여 초대하세요.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedClass(null)}
                >
                  닫기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
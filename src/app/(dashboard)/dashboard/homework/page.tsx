'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Upload,
  Edit,
  Trash2,
  Filter,
  GraduationCap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CreateHomeworkModal from '@/components/homework/CreateHomeworkModal'
import EditHomeworkModal from '@/components/homework/EditHomeworkModal'

interface HomeworkAssignment {
  id: string
  title: string
  description: string
  subject: string | null
  due_date: string
  points_possible: number
  allow_late_submission: boolean
  late_penalty_percent: number
  submission_format: 'text' | 'file' | 'both'
  instructions: string | null
  attachment_url: string | null
  attachment_name: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  users: {
    id: string
    name: string
  }
  homework_submissions?: Array<{
    id: string
    submitted_at: string
    is_late: boolean
    status: string
    homework_grades: Array<{
      points_earned: number
      feedback: string | null
      graded_at: string
    }>
  }>
}

interface ClassOption {
  id: string
  name: string
  role: string
}

export default function HomeworkPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [editingHomework, setEditingHomework] = useState<HomeworkAssignment | null>(null)

  const supabase = createClient()
  const userRole = user?.user_metadata?.role || 'student'

  // 사용자의 학급 목록 가져오기
  const fetchClasses = async () => {
    try {
      if (userRole === 'teacher') {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', user?.id)

        if (error) {
          console.error('학급 조회 오류:', error)
          return
        }

        setClasses(data.map(cls => ({ ...cls, role: 'teacher' })))
      } else {
        const { data, error } = await supabase
          .from('class_members')
          .select(`
            role,
            classes (
              id,
              name
            )
          `)
          .eq('user_id', user?.id)

        if (error || !data) {
          console.error('학급 조회 오류:', error)
          return
        }

        setClasses(data
          .filter(member => member.classes)
          .map(member => {
            const classData = Array.isArray(member.classes) ? member.classes[0] : member.classes
            return {
              id: classData?.id,
              name: classData?.name,
              role: member.role
            }
          })
          .filter(cls => cls.id) // id가 있는 클래스만 포함
        )
      }
    } catch (error) {
      console.error('학급 조회 실패:', error)
    }
  }

  // 숙제 목록 가져오기
  const fetchAssignments = async (classId: string) => {
    try {
      const studentView = userRole !== 'teacher'
      const response = await fetch(`/api/homework/assignments?classId=${classId}&studentView=${studentView}`)
      const data = await response.json()

      if (!response.ok) {
        toast({
          title: '오류',
          description: data.error || '숙제를 조회할 수 없습니다.',
          variant: 'destructive'
        })
        return
      }

      setAssignments(data.assignments || [])
    } catch (error) {
      console.error('숙제 조회 실패:', error)
      toast({
        title: '오류',
        description: '숙제 조회 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    }
  }

  // 숙제 삭제 함수
  const handleDeleteHomework = async (homeworkId: string) => {
    if (!confirm('정말로 이 숙제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      const response = await fetch(`/api/homework/assignments/${homeworkId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: '성공',
          description: '숙제가 성공적으로 삭제되었습니다.'
        })
        
        // 숙제 목록 새로고침
        if (selectedClass) {
          fetchAssignments(selectedClass)
        }
      } else {
        toast({
          title: '오류',
          description: data.error || '숙제 삭제 중 오류가 발생했습니다.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('숙제 삭제 실패:', error)
      toast({
        title: '오류',
        description: '숙제 삭제 중 서버 오류가 발생했습니다.',
        variant: 'destructive'
      })
    }
  }

  // 상태에 따른 색상
  const getStatusColor = (assignment: HomeworkAssignment) => {
    const now = new Date()
    const dueDate = new Date(assignment.due_date)
    
    if (userRole === 'student') {
      const submission = assignment.homework_submissions?.[0]
      if (!submission) {
        return now > dueDate ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
      }
      if (submission.homework_grades?.length > 0) {
        return 'bg-green-100 text-green-800'
      }
      return 'bg-blue-100 text-blue-800'
    }
    
    return now > dueDate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
  }

  const getStatusLabel = (assignment: HomeworkAssignment) => {
    const now = new Date()
    const dueDate = new Date(assignment.due_date)
    
    if (userRole === 'student') {
      const submission = assignment.homework_submissions?.[0]
      if (!submission) {
        return now > dueDate ? '미제출' : '제출 필요'
      }
      if (submission.homework_grades?.length > 0) {
        return '채점 완료'
      }
      return '제출 완료'
    }
    
    return now > dueDate ? '마감됨' : '진행 중'
  }

  // 필터링된 숙제 목록
  const filteredAssignments = assignments.filter(assignment => {
    if (filterSubject !== 'all' && assignment.subject !== filterSubject) return false
    
    if (filterStatus !== 'all') {
      const now = new Date()
      const dueDate = new Date(assignment.due_date)
      const submission = assignment.homework_submissions?.[0]
      
      switch (filterStatus) {
        case 'pending':
          return userRole === 'student' ? !submission && now <= dueDate : now <= dueDate
        case 'submitted':
          return userRole === 'student' ? !!submission : false
        case 'graded':
          return userRole === 'student' ? (submission?.homework_grades?.length ?? 0) > 0 : false
        case 'overdue':
          return userRole === 'student' ? !submission && now > dueDate : now > dueDate
        default:
          return true
      }
    }
    
    return true
  })

  // 과목 목록 추출
  const subjects = [...new Set(assignments.map(a => a.subject).filter((subject): subject is string => Boolean(subject)))]

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user, userRole])

  useEffect(() => {
    if (selectedClass) {
      fetchAssignments(selectedClass)
      setLoading(false)

      // 실시간 숙제 구독
      const channel = supabase
        .channel('homework')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'homework_assignments',
            filter: `class_id=eq.${selectedClass}`
          },
          () => {
            fetchAssignments(selectedClass)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedClass])

  if (loading && !selectedClass) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">학급을 선택해주세요...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            숙제 관리
          </h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'teacher' ? '학급의 숙제를 관리하고 채점하세요' : '숙제를 확인하고 제출하세요'}
          </p>
        </div>
        {userRole === 'teacher' && selectedClass && (
          <CreateHomeworkModal 
            classId={selectedClass}
            onAssignmentCreated={() => fetchAssignments(selectedClass)}
          />
        )}
      </div>

      {/* 학급 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            학급 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  selectedClass === cls.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{cls.name}</div>
                <div className="text-xs text-gray-500">
                  {cls.role === 'teacher' ? '담당 교사' : '참여 학생'}
                </div>
              </button>
            ))}
          </div>
          {classes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              참여한 학급이 없습니다.
              {userRole !== 'teacher' && (
                <div className="mt-2">
                  <a href="/dashboard/join-class" className="text-blue-600 hover:underline">
                    학급에 참여하기
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClass && (
        <>
          {/* 필터 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">상태:</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">전체</option>
                    <option value="pending">제출 필요</option>
                    <option value="submitted">제출 완료</option>
                    <option value="graded">채점 완료</option>
                    <option value="overdue">미제출</option>
                  </select>
                </div>
                
                {subjects.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">과목:</span>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      <option value="all">전체</option>
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="ml-auto text-sm text-gray-600">
                  총 {filteredAssignments.length}개의 숙제
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 숙제 목록 */}
          <div className="space-y-4">
            {filteredAssignments.length > 0 ? (
              filteredAssignments.map((assignment) => {
                const dueDate = new Date(assignment.due_date)
                const now = new Date()
                const isOverdue = now > dueDate
                const submission = assignment.homework_submissions?.[0]
                const grade = submission?.homework_grades?.[0]
                
                return (
                  <Card key={assignment.id} className={`${isOverdue && !submission ? 'border-red-200 bg-red-50' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(assignment)}>
                              {getStatusLabel(assignment)}
                            </Badge>
                            {assignment.subject && (
                              <Badge variant="outline">{assignment.subject}</Badge>
                            )}
                            {isOverdue && !submission && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                기한 초과
                              </Badge>
                            )}
                            {grade && (
                              <Badge className="bg-green-100 text-green-800">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                {grade.points_earned}/{assignment.points_possible}점
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg">{assignment.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {assignment.users.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              마감: {dueDate.toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {assignment.points_possible}점
                            </span>
                          </div>
                        </div>
                        
                        {userRole === 'teacher' && (
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingHomework(assignment)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => handleDeleteHomework(assignment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-gray-800 whitespace-pre-wrap mb-4">{assignment.description}</p>
                      
                      {assignment.instructions && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-2">제출 안내</h4>
                          <p className="text-blue-700 text-sm whitespace-pre-wrap">{assignment.instructions}</p>
                        </div>
                      )}
                      
                      {assignment.attachment_url && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium">
                                {assignment.attachment_name || '첨부파일'}
                              </span>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a 
                                href={assignment.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                다운로드
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* 학생용 제출 영역 */}
                      {userRole === 'student' && (
                        <div className="mt-4 pt-4 border-t">
                          {submission ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium">제출 완료</span>
                                <span className="text-sm text-gray-500">
                                  {new Date(submission.submitted_at).toLocaleDateString('ko-KR', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {submission.is_late && (
                                  <Badge variant="destructive" className="text-xs">지각 제출</Badge>
                                )}
                              </div>
                              
                              {grade && (
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap className="h-4 w-4 text-green-600" />
                                    <span className="font-medium text-green-800">
                                      채점 결과: {grade.points_earned}/{assignment.points_possible}점
                                    </span>
                                  </div>
                                  {grade.feedback && (
                                    <p className="text-green-700 text-sm">{grade.feedback}</p>
                                  )}
                                </div>
                              )}
                              
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                제출물 수정
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {!isOverdue || assignment.allow_late_submission ? (
                                <Button>
                                  <Upload className="h-4 w-4 mr-2" />
                                  숙제 제출하기
                                </Button>
                              ) : (
                                <Button disabled variant="outline">
                                  제출 기한 만료
                                </Button>
                              )}
                              {isOverdue && assignment.allow_late_submission && (
                                <span className="text-xs text-orange-600">
                                  지각 제출 시 {assignment.late_penalty_percent}% 감점
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 교사용 채점 영역 */}
                      {userRole === 'teacher' && (
                        <div className="mt-4 pt-4 border-t">
                          <Button variant="outline">
                            <FileText className="h-4 w-4 mr-2" />
                            제출물 확인 및 채점
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    숙제가 없습니다
                  </h3>
                  <p className="text-gray-600">
                    {userRole === 'teacher' 
                      ? '새로운 숙제를 만들어 학생들에게 과제를 내어주세요.'
                      : '아직 등록된 숙제가 없습니다.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Edit Homework Modal */}
      {editingHomework && (
        <EditHomeworkModal
          homework={editingHomework}
          isOpen={!!editingHomework}
          onClose={() => setEditingHomework(null)}
          onUpdate={() => {
            if (selectedClass) {
              fetchAssignments(selectedClass)
            }
          }}
        />
      )}
    </div>
  )
}
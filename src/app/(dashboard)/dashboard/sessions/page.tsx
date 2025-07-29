'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  PlusCircle, 
  VideoIcon, 
  Users, 
  Calendar, 
  Clock, 
  Play, 
  Settings,
  MessageSquare,
  HelpCircle,
  BarChart3,
  Eye
} from 'lucide-react'
import CreateSessionModal from '@/components/teacher/CreateSessionModal'
import Link from 'next/link'

interface ClassSession {
  id: string
  title: string
  description: string
  subject: string
  session_type: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  scheduled_start: string
  scheduled_end: string
  actual_start?: string
  actual_end?: string
  max_participants?: number
  allow_late_join: boolean
  recording_enabled: boolean
  chat_enabled: boolean
  qa_enabled: boolean
  screen_sharing_enabled: boolean
  attendance_tracking: boolean
  session_url?: string
  meeting_id?: string
  created_at: string
  users: {
    id: string
    name: string
  }
  participant_count?: number
  pending_questions?: number
  my_participation?: {
    joined_at: string
    left_at?: string
    duration_minutes?: number
    participation_score?: number
  }
}

interface Class {
  id: string
  name: string
  description: string
  teacher_id: string
}

export default function SessionsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user])

  useEffect(() => {
    if (selectedClass) {
      fetchSessions()
    }
  }, [selectedClass, filterStatus, showUpcoming])

  const fetchClasses = async () => {
    try {
      if (user?.role === 'teacher') {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, description, teacher_id')
          .eq('teacher_id', user.id)
          .order('name')

        if (error) throw error
        setClasses(data || [])
        if (data && data.length > 0) {
          setSelectedClass(data[0].id)
        }
      } else {
        // 학생인 경우 참여 중인 학급 조회
        const { data, error } = await supabase
          .from('class_members')
          .select(`
            classes (
              id,
              name,
              description,
              teacher_id
            )
          `)
          .eq('user_id', user?.id)

        if (error) throw error
        const classData: Class[] = data
          ?.map(item => item.classes)
          .filter(Boolean)
          .map(classes => Array.isArray(classes) ? classes[0] : classes)
          .filter(Boolean) || []
        setClasses(classData)
        if (classData.length > 0) {
          setSelectedClass(classData[0].id)
        }
      }
    } catch (error) {
      console.error('학급 조회 실패:', error)
    }
  }

  const fetchSessions = async () => {
    if (!selectedClass) return

    try {
      setLoading(true)
      let url = `/api/sessions?classId=${selectedClass}`
      
      if (filterStatus !== 'all') {
        url += `&status=${filterStatus}`
      }
      
      if (showUpcoming) {
        url += `&upcoming=true`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setSessions(data.sessions || [])
      } else {
        console.error('세션 조회 실패:', data.error)
      }
    } catch (error) {
      console.error('세션 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'secondary' | 'default' | 'outline' | 'destructive', text: string }> = {
      scheduled: { variant: 'secondary' as const, text: '예정됨' },
      live: { variant: 'default' as const, text: '진행 중' },
      completed: { variant: 'outline' as const, text: '완료' },
      cancelled: { variant: 'destructive' as const, text: '취소됨' }
    }
    return variants[status] || variants.scheduled
  }

  const getSessionTypeText = (type: string) => {
    const types: Record<string, string> = {
      lecture: '강의',
      discussion: '토론',
      workshop: '워크숍',
      presentation: '발표',
      quiz: '퀴즈',
      review: '복습'
    }
    return types[type] || type
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('ko-KR'),
      time: date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const canJoinSession = (session: ClassSession) => {
    const now = new Date()
    const start = new Date(session.scheduled_start)
    const end = new Date(session.scheduled_end)
    
    if (session.status === 'cancelled' || session.status === 'completed') {
      return false
    }
    
    if (session.status === 'live') {
      return true
    }
    
    // 시작 10분 전부터 참여 가능
    const allowJoinTime = new Date(start.getTime() - 10 * 60 * 1000)
    return now >= allowJoinTime && now <= end
  }

  const joinSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(data.message)
        fetchSessions() // 참여 상태 업데이트
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('세션 참여 실패:', error)
      alert('세션 참여에 실패했습니다.')
    }
  }

  const leaveSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(data.message)
        fetchSessions() // 참여 상태 업데이트
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('세션 나가기 실패:', error)
      alert('세션 나가기에 실패했습니다.')
    }
  }

  if (!user) {
    return <div>로그인이 필요합니다.</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">클래스 세션</h1>
          <p className="text-muted-foreground">
            실시간 수업과 멀티미디어 콘텐츠를 관리하세요
          </p>
        </div>
        {user.role === 'teacher' && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            새 세션 만들기
          </Button>
        )}
      </div>

      {/* 학급 선택 및 필터 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">학급:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border rounded px-3 py-1"
          >
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">상태:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="all">전체</option>
            <option value="scheduled">예정됨</option>
            <option value="live">진행 중</option>
            <option value="completed">완료</option>
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showUpcoming}
            onChange={(e) => setShowUpcoming(e.target.checked)}
          />
          <span className="text-sm">다가오는 세션만</span>
        </label>
      </div>

      {/* 세션 목록 */}
      {loading ? (
        <div className="text-center py-8">세션을 불러오는 중...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <VideoIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">생성된 세션이 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 클래스 세션을 만들어보세요.
            </p>
            {user.role === 'teacher' && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                새 세션 만들기
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => {
            const startDateTime = formatDateTime(session.scheduled_start)
            const endDateTime = formatDateTime(session.scheduled_end)
            const statusBadge = getStatusBadge(session.status)
            const canJoin = canJoinSession(session)
            const isParticipating = session.my_participation && !session.my_participation.left_at

            return (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{session.title}</CardTitle>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.text}
                        </Badge>
                        <Badge variant="outline">
                          {getSessionTypeText(session.session_type)}
                        </Badge>
                      </div>
                      {session.description && (
                        <p className="text-muted-foreground">{session.description}</p>
                      )}
                      {session.subject && (
                        <div className="text-sm text-muted-foreground">
                          과목: {session.subject}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/sessions/${session.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          상세보기
                        </Link>
                      </Button>
                      {user.role === 'teacher' && (
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                      {canJoin && user.role === 'student' && (
                        isParticipating ? (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => leaveSession(session.id)}
                          >
                            나가기
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => joinSession(session.id)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            참여하기
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 시간 정보 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{startDateTime.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{startDateTime.time} - {endDateTime.time}</span>
                      </div>
                    </div>

                    {/* 참여자 정보 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {user.role === 'teacher' && session.participant_count !== undefined
                            ? `${session.participant_count}명 참여`
                            : session.max_participants 
                              ? `최대 ${session.max_participants}명`
                              : '제한 없음'
                          }
                        </span>
                      </div>
                      {session.allow_late_join && (
                        <div className="text-xs text-green-600">지각 참여 허용</div>
                      )}
                    </div>

                    {/* 기능 상태 */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {session.recording_enabled && (
                          <Badge variant="secondary" className="text-xs">녹화</Badge>
                        )}
                        {session.chat_enabled && (
                          <Badge variant="secondary" className="text-xs">채팅</Badge>
                        )}
                        {session.qa_enabled && (
                          <Badge variant="secondary" className="text-xs">Q&A</Badge>
                        )}
                        {session.screen_sharing_enabled && (
                          <Badge variant="secondary" className="text-xs">화면공유</Badge>
                        )}
                      </div>
                      {session.attendance_tracking && (
                        <div className="text-xs text-blue-600">출석 체크</div>
                      )}
                    </div>

                    {/* 추가 정보 */}
                    <div className="space-y-2">
                      {user.role === 'teacher' && (session.pending_questions ?? 0) > 0 && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <HelpCircle className="w-4 h-4" />
                          <span>{session.pending_questions}개 질문 대기</span>
                        </div>
                      )}
                      {session.my_participation && (
                        <div className="text-xs text-green-600">
                          {session.my_participation.duration_minutes 
                            ? `${session.my_participation.duration_minutes}분 참여`
                            : '참여 중'
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 세션 URL */}
                  {session.session_url && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="text-sm font-medium mb-1">세션 링크:</div>
                      <a 
                        href={session.session_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm break-all"
                      >
                        {session.session_url}
                      </a>
                      {session.meeting_id && (
                        <div className="text-xs text-muted-foreground mt-1">
                          회의 ID: {session.meeting_id}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 세션 생성 모달 */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        classes={classes}
        onSessionCreated={fetchSessions}
      />
    </div>
  )
}
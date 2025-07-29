'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import QAPanel from '@/components/sessions/QAPanel'
import { 
  VideoIcon, 
  Users, 
  Calendar, 
  Clock, 
  Play, 
  Pause,
  Settings,
  MessageSquare,
  HelpCircle,
  FileText,
  ExternalLink,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface SessionContent {
  id: string
  content_type: string
  title: string
  url: string
  thumbnail_url?: string
  file_size?: number
  duration?: number
  order_index: number
  is_downloadable: boolean
  is_required: boolean
  description?: string
  created_at: string
}

interface SessionParticipant {
  id: string
  joined_at: string
  left_at?: string
  duration_minutes?: number
  participation_score?: number
  status: string
  users: {
    id: string
    name: string
    role: string
  }
}

interface SessionDetail {
  id: string
  class_id: string
  teacher_id: string
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
  passcode?: string
  created_at: string
  users: {
    id: string
    name: string
  }
  classes: {
    id: string
    name: string
    teacher_id: string
  }
}

interface SessionPageProps {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params
  const { user } = useAuth()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [content, setContent] = useState<SessionContent[]>([])
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [myParticipation, setMyParticipation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchSessionDetail()
      subscribeToUpdates()
    }
  }, [user, id])

  const fetchSessionDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sessions/${id}`)
      const data = await response.json()

      if (response.ok) {
        setSession(data.session)
        setContent(data.content || [])
        setParticipants(data.participants || [])
        setMyParticipation(data.myParticipation)
      } else {
        console.error('세션 조회 실패:', data.error)
      }
    } catch (error) {
      console.error('세션 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`session_${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_sessions',
        filter: `id=eq.${id}`
      }, () => {
        fetchSessionDetail()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${id}`
      }, () => {
        fetchSessionDetail()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const joinSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${id}/join`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(data.message)
        fetchSessionDetail()
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('세션 참여 실패:', error)
      alert('세션 참여에 실패했습니다.')
    }
  }

  const leaveSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${id}/join`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(data.message)
        fetchSessionDetail()
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('세션 나가기 실패:', error)
      alert('세션 나가기에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'secondary' | 'default' | 'outline' | 'destructive', text: string, icon: any }> = {
      scheduled: { variant: 'secondary' as const, text: '예정됨', icon: Clock },
      live: { variant: 'default' as const, text: '진행 중', icon: Play },
      completed: { variant: 'outline' as const, text: '완료', icon: CheckCircle },
      cancelled: { variant: 'destructive' as const, text: '취소됨', icon: XCircle }
    }
    return variants[status] || variants.scheduled
  }

  const getContentTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      video: VideoIcon,
      audio: VideoIcon,
      document: FileText,
      presentation: FileText,
      image: FileText,
      link: ExternalLink,
      embed: VideoIcon
    }
    return icons[type] || FileText
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    }
    return `${minutes}분`
  }

  const canJoinSession = () => {
    if (!session) return false
    
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

  const isParticipating = myParticipation && !myParticipation.left_at
  const isTeacher = session?.teacher_id === user?.id

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">세션 정보를 불러오는 중...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">세션을 찾을 수 없습니다</h3>
          <p className="text-muted-foreground">
            세션이 삭제되었거나 접근 권한이 없습니다.
          </p>
        </div>
      </div>
    )
  }

  const statusBadge = getStatusBadge(session.status)
  const StatusIcon = statusBadge.icon
  const startDateTime = formatDateTime(session.scheduled_start)
  const endDateTime = formatDateTime(session.scheduled_end)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 세션 헤더 */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{session.title}</h1>
              <Badge variant={statusBadge.variant}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusBadge.text}
              </Badge>
            </div>
            <p className="text-muted-foreground">{session.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{session.classes.name}</span>
              <span>•</span>
              <span>{session.users.name} 선생님</span>
              {session.subject && (
                <>
                  <span>•</span>
                  <span>{session.subject}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {isTeacher && (
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                설정
              </Button>
            )}
            
            {!isTeacher && canJoinSession() && (
              isParticipating ? (
                <Button 
                  variant="destructive" 
                  onClick={leaveSession}
                >
                  나가기
                </Button>
              ) : (
                <Button onClick={joinSession}>
                  <Play className="w-4 h-4 mr-2" />
                  참여하기
                </Button>
              )
            )}
          </div>
        </div>

        {/* 세션 정보 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{startDateTime.date}</div>
                  <div className="text-sm text-muted-foreground">
                    {startDateTime.time} - {endDateTime.time}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {isTeacher ? `${participants.length}명 참여` : 
                     session.max_participants ? `최대 ${session.max_participants}명` : '제한 없음'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session.allow_late_join ? '지각 참여 허용' : '정시 참여만'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <VideoIcon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {content.length}개 콘텐츠
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session.recording_enabled ? '녹화 중' : '녹화 안함'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 외부 세션 링크 */}
        {session.session_url && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium mb-1">외부 미팅 링크</div>
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
                      {session.passcode && ` | 비밀번호: ${session.passcode}`}
                    </div>
                  )}
                </div>
                <Button asChild variant="outline">
                  <a href={session.session_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    참여
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 탭 콘텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="content">콘텐츠</TabsTrigger>
          <TabsTrigger value="qa">Q&A</TabsTrigger>
          {isTeacher && (
            <TabsTrigger value="participants">참여자</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 세션 기능 */}
            <Card>
              <CardHeader>
                <CardTitle>세션 기능</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>채팅</span>
                  </div>
                  <Badge variant={session.chat_enabled ? 'default' : 'secondary'}>
                    {session.chat_enabled ? '활성화' : '비활성화'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>Q&A</span>
                  </div>
                  <Badge variant={session.qa_enabled ? 'default' : 'secondary'}>
                    {session.qa_enabled ? '활성화' : '비활성화'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="w-4 h-4" />
                    <span>화면 공유</span>
                  </div>
                  <Badge variant={session.screen_sharing_enabled ? 'default' : 'secondary'}>
                    {session.screen_sharing_enabled ? '활성화' : '비활성화'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="w-4 h-4" />
                    <span>녹화</span>
                  </div>
                  <Badge variant={session.recording_enabled ? 'default' : 'secondary'}>
                    {session.recording_enabled ? '활성화' : '비활성화'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>출석 체크</span>
                  </div>
                  <Badge variant={session.attendance_tracking ? 'default' : 'secondary'}>
                    {session.attendance_tracking ? '활성화' : '비활성화'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 내 참여 정보 */}
            {myParticipation && (
              <Card>
                <CardHeader>
                  <CardTitle>내 참여 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>참여 시작</span>
                    <span>{formatDateTime(myParticipation.joined_at).time}</span>
                  </div>
                  {myParticipation.left_at && (
                    <div className="flex justify-between">
                      <span>참여 종료</span>
                      <span>{formatDateTime(myParticipation.left_at).time}</span>
                    </div>
                  )}
                  {myParticipation.duration_minutes && (
                    <div className="flex justify-between">
                      <span>참여 시간</span>
                      <span>{myParticipation.duration_minutes}분</span>
                    </div>
                  )}
                  {myParticipation.participation_score !== null && (
                    <div className="flex justify-between">
                      <span>참여 점수</span>
                      <span>{myParticipation.participation_score}점</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          {content.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">콘텐츠가 없습니다</h3>
                <p className="text-muted-foreground">
                  이 세션에는 아직 추가된 콘텐츠가 없습니다.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {content.map((item) => {
                const ContentIcon = getContentTypeIcon(item.content_type)
                
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <ContentIcon className="w-5 h-5 mt-1 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{item.title}</h4>
                              {item.is_required && (
                                <Badge variant="destructive" className="text-xs">필수</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {item.content_type}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {item.duration && (
                                <span>{formatDuration(item.duration)}</span>
                              )}
                              {item.file_size && (
                                <span>{(item.file_size / 1024 / 1024).toFixed(1)}MB</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm">
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              열기
                            </a>
                          </Button>
                          {item.is_downloadable && (
                            <Button asChild variant="outline" size="sm">
                              <a href={item.url} download>
                                <Download className="w-4 h-4 mr-1" />
                                다운로드
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="qa">
          <QAPanel 
            sessionId={id}
            isTeacher={isTeacher}
            qaEnabled={session.qa_enabled}
            subject={session.subject}
            classId={session.class_id}
          />
        </TabsContent>

        {isTeacher && (
          <TabsContent value="participants" className="space-y-4">
            {participants.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">참여자가 없습니다</h3>
                  <p className="text-muted-foreground">
                    아직 세션에 참여한 학생이 없습니다.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <Card key={participant.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium">{participant.users.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDateTime(participant.joined_at).time}에 참여
                              {participant.left_at && 
                                ` - ${formatDateTime(participant.left_at).time}에 종료`
                              }
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          {participant.duration_minutes && (
                            <span>{participant.duration_minutes}분</span>
                          )}
                          {participant.participation_score !== null && (
                            <Badge variant="outline">
                              {participant.participation_score}점
                            </Badge>
                          )}
                          <Badge 
                            variant={participant.status === 'joined' ? 'default' : 'secondary'}
                          >
                            {participant.status === 'joined' ? '참여 중' : 
                             participant.status === 'left' ? '나감' :
                             participant.status === 'reconnected' ? '재참여' : '알 수 없음'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
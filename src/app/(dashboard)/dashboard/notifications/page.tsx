'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Bell, 
  Plus, 
  Pin, 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle,
  FileText,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Download,
  Filter
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CreateNotificationModal from '@/components/notifications/CreateNotificationModal'

interface Notification {
  id: string
  title: string
  content: string
  type: 'general' | 'urgent' | 'event' | 'homework' | 'reminder'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_pinned: boolean
  expires_at: string | null
  attachment_url: string | null
  attachment_name: string | null
  created_at: string
  updated_at: string
  users: {
    id: string
    name: string
  }
  notification_reads: Array<{
    read_at: string
  }>
}

interface ClassOption {
  id: string
  name: string
  role: string
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const supabase = createClient()
  const userRole = user?.user_metadata?.role || 'student'

  // 사용자의 학급 목록 가져오기
  const fetchClasses = async () => {
    try {
      if (userRole === 'teacher') {
        // 교사의 경우 자신이 담당하는 학급들
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
        // 학생/학부모의 경우 참여한 학급들
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
              id: classData?.id || '',
              name: classData?.name || 'Unknown',
              role: member.role
            }
          })
          .filter(cls => cls.id)
        )
      }
    } catch (error) {
      console.error('학급 조회 실패:', error)
    }
  }

  // 알림 목록 가져오기
  const fetchNotifications = async (classId: string) => {
    try {
      const response = await fetch(`/api/notifications?classId=${classId}`)
      const data = await response.json()

      if (!response.ok) {
        toast({
          title: '오류',
          description: data.error || '알림을 조회할 수 없습니다.',
          variant: 'destructive'
        })
        return
      }

      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('알림 조회 실패:', error)
      toast({
        title: '오류',
        description: '알림 조회 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    }
  }

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast({
          title: '오류',
          description: data.error || '읽음 표시에 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      // 로컬 상태 업데이트
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, notification_reads: [{ read_at: new Date().toISOString() }] }
          : notification
      ))

    } catch (error) {
      console.error('읽음 표시 실패:', error)
    }
  }

  // 알림 타입에 따른 색상
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'event': return 'bg-blue-100 text-blue-800'
      case 'homework': return 'bg-green-100 text-green-800'
      case 'reminder': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'urgent': return '긴급'
      case 'event': return '행사'
      case 'homework': return '숙제'
      case 'reminder': return '안내'
      default: return '일반'
    }
  }

  // 우선순위에 따른 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'normal': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  // 필터링된 알림 목록
  const filteredNotifications = notifications.filter(notification => {
    if (filterType !== 'all' && notification.type !== filterType) return false
    if (showUnreadOnly && notification.notification_reads.length > 0) return false
    return true
  })

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user, userRole])

  useEffect(() => {
    if (selectedClass) {
      fetchNotifications(selectedClass)
      setLoading(false)

      // 실시간 알림 구독
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `class_id=eq.${selectedClass}`
          },
          () => {
            fetchNotifications(selectedClass)
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
            <Bell className="h-6 w-6" />
            알림장
          </h1>
          <p className="text-gray-600 mt-1">중요한 공지사항과 안내를 확인하세요</p>
        </div>
        {userRole === 'teacher' && selectedClass && (
          <CreateNotificationModal 
            classId={selectedClass}
            onNotificationCreated={() => fetchNotifications(selectedClass)}
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
          {/* 필터 및 옵션 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">분류:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">전체</option>
                    <option value="urgent">긴급</option>
                    <option value="event">행사</option>
                    <option value="homework">숙제</option>
                    <option value="reminder">안내</option>
                    <option value="general">일반</option>
                  </select>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={showUnreadOnly ? 'bg-blue-50 border-blue-300' : ''}
                >
                  {showUnreadOnly ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                  {showUnreadOnly ? '전체 보기' : '안읽은 것만'}
                </Button>

                <div className="ml-auto text-sm text-gray-600">
                  총 {filteredNotifications.length}개의 알림
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 알림 목록 */}
          <div className="space-y-4">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => {
                const isRead = notification.notification_reads.length > 0
                const isExpired = notification.expires_at && new Date(notification.expires_at) < new Date()
                
                return (
                  <Card 
                    key={notification.id} 
                    className={`${!isRead ? 'border-blue-200 bg-blue-50' : ''} ${isExpired ? 'opacity-60' : ''}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {notification.is_pinned && (
                            <Pin className="h-4 w-4 text-orange-500 mt-1" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`}
                                title={`우선순위: ${notification.priority}`}
                              />
                              <Badge className={getTypeColor(notification.type)}>
                                {getTypeLabel(notification.type)}
                              </Badge>
                              {!isRead && (
                                <Badge variant="outline" className="text-blue-600 border-blue-300">
                                  안읽음
                                </Badge>
                              )}
                              {isExpired && (
                                <Badge variant="outline" className="text-gray-500">
                                  만료됨
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg">{notification.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {notification.users.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(notification.created_at).toLocaleDateString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {notification.expires_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  만료: {new Date(notification.expires_at).toLocaleDateString('ko-KR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {userRole === 'teacher' && (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="prose max-w-none">
                        <p className="text-gray-800 whitespace-pre-wrap">{notification.content}</p>
                      </div>
                      
                      {notification.attachment_url && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium">
                                {notification.attachment_name || '첨부파일'}
                              </span>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a 
                                href={notification.attachment_url} 
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
                      
                      {!isRead && (
                        <div className="mt-4 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            읽음으로 표시
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
                  <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {showUnreadOnly ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
                  </h3>
                  <p className="text-gray-600">
                    {showUnreadOnly ? '모든 알림을 확인했습니다.' : '아직 등록된 알림이 없습니다.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Send, MessageSquare, Shield, AlertCircle, Check, X, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  content: string
  type: 'text' | 'announcement' | 'homework' | 'question'
  is_approved: boolean
  created_at: string
  sender: {
    id: string
    name: string
    role: string
  }
  class_info: {
    id: string
    name: string
  }
}

interface ClassOption {
  id: string
  name: string
  role: string
}

export default function MessagesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'announcement' | 'homework' | 'question'>('text')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

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

  // 메시지 목록 가져오기
  const fetchMessages = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          type,
          is_approved,
          created_at,
          users (
            id,
            name,
            role
          ),
          classes (
            id,
            name
          )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('메시지 조회 오류:', error)
        return
      }

      const formattedMessages = data.map(msg => {
        const userData = Array.isArray(msg.users) ? msg.users[0] : msg.users
        const classData = Array.isArray(msg.classes) ? msg.classes[0] : msg.classes
        
        return {
          id: msg.id,
          content: msg.content,
          type: msg.type,
          is_approved: msg.is_approved,
          created_at: msg.created_at,
          sender: {
            id: userData?.id || '',
            name: userData?.name || 'Unknown',
            role: userData?.role || 'student'
          },
          class_info: {
            id: classData?.id || '',
            name: classData?.name || 'Unknown'
          }
        }
      })

      setMessages(formattedMessages)
    } catch (error) {
      console.error('메시지 조회 실패:', error)
    }
  }

  // 메시지 전송
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedClass) {
      toast({
        title: '오류',
        description: '메시지 내용과 학급을 선택해주세요.',
        variant: 'destructive'
      })
      return
    }

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            class_id: selectedClass,
            sender_id: user?.id,
            content: newMessage,
            type: messageType,
            is_approved: userRole === 'teacher' // 교사 메시지는 자동 승인
          }
        ])

      if (error) {
        console.error('메시지 전송 오류:', error)
        toast({
          title: '오류',
          description: '메시지 전송에 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: '성공',
        description: userRole === 'teacher' 
          ? '메시지가 전송되었습니다.' 
          : '메시지가 전송되었습니다. 교사 승인 후 표시됩니다.'
      })

      setNewMessage('')
      fetchMessages(selectedClass)

    } catch (error) {
      console.error('메시지 전송 실패:', error)
      toast({
        title: '오류',
        description: '메시지 전송 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }

  // 메시지 승인/거부 (교사만)
  const handleMessageApproval = async (messageId: string, approved: boolean) => {
    try {
      const response = await fetch('/api/messages/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, approved }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: '오류',
          description: data.error || '메시지 승인 처리에 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: '완료',
        description: data.message
      })

      // 실시간 업데이트로 인해 자동으로 새로고침됨
    } catch (error) {
      console.error('메시지 승인 실패:', error)
      toast({
        title: '오류',
        description: '메시지 승인 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    }
  }

  // 메시지 타입에 따른 스타일
  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-100 text-blue-800'
      case 'homework': return 'bg-green-100 text-green-800'
      case 'question': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'announcement': return '공지'
      case 'homework': return '숙제'
      case 'question': return '질문'
      default: return '일반'
    }
  }

  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user, userRole])

  useEffect(() => {
    if (selectedClass) {
      fetchMessages(selectedClass)
      setLoading(false)

      // 실시간 메시지 구독
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `class_id=eq.${selectedClass}`
          },
          () => {
            // 메시지 변경시 목록 새로고침
            fetchMessages(selectedClass)
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
        <h1 className="text-2xl font-bold">메시지</h1>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm text-gray-600">교사 관리 하에 안전한 소통</span>
        </div>
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
          {/* 메시지 작성 */}
          <Card>
            <CardHeader>
              <CardTitle>새 메시지 작성</CardTitle>
              <CardDescription>
                {userRole === 'teacher' 
                  ? '모든 메시지는 즉시 게시됩니다.' 
                  : '메시지는 교사 승인 후 게시됩니다.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 메시지 타입 선택 */}
              <div>
                <label className="text-sm font-medium mb-2 block">메시지 유형</label>
                <div className="flex gap-2">
                  {(['text', 'announcement', 'homework', 'question'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMessageType(type)}
                      disabled={type === 'announcement' && userRole !== 'teacher'}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        messageType === type
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      } ${type === 'announcement' && userRole !== 'teacher' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {getMessageTypeLabel(type)}
                      {type === 'announcement' && userRole !== 'teacher' && ' (교사만)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 메시지 입력 */}
              <div>
                <Textarea
                  placeholder="메시지를 입력하세요..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? '전송 중...' : '메시지 전송'}
              </Button>
            </CardContent>
          </Card>

          {/* 메시지 목록 */}
          <div className="space-y-4">
            {messages.length > 0 ? (
              messages.map((message) => {
                const showToEveryone = message.is_approved || message.sender.id === user?.id || userRole === 'teacher'
                
                if (!showToEveryone) return null

                return (
                  <Card key={message.id} className={`${!message.is_approved ? 'border-yellow-200 bg-yellow-50' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{message.sender.name}</span>
                          <Badge variant={message.sender.role === 'teacher' ? 'default' : 'secondary'}>
                            {message.sender.role === 'teacher' ? '교사' : '학생'}
                          </Badge>
                          <Badge className={getMessageTypeColor(message.type)}>
                            {getMessageTypeLabel(message.type)}
                          </Badge>
                          {!message.is_approved && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              승인 대기
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                      
                      {/* 교사 승인 버튼 */}
                      {userRole === 'teacher' && !message.is_approved && message.sender.role !== 'teacher' && (
                        <div className="mt-3 pt-3 border-t flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleMessageApproval(message.id, true)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMessageApproval(message.id, false)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            거부
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
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    아직 메시지가 없습니다
                  </h3>
                  <p className="text-gray-600">
                    첫 번째 메시지를 작성하여 소통을 시작하세요!
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
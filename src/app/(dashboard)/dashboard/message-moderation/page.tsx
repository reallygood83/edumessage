'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Shield, AlertTriangle, Check, X, Clock, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PendingMessage {
  id: string
  content: string
  type: 'text' | 'announcement' | 'homework' | 'question'
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

export default function MessageModerationPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const userRole = user?.user_metadata?.role || 'student'

  // 승인 대기 중인 메시지 조회
  const fetchPendingMessages = async () => {
    try {
      // 교사가 담당하는 모든 학급의 승인 대기 메시지
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          type,
          created_at,
          users (
            id,
            name,
            role
          ),
          classes (
            id,
            name,
            teacher_id
          )
        `)
        .eq('is_approved', false)
        .eq('classes.teacher_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('승인 대기 메시지 조회 오류:', error)
        return
      }

      const formattedMessages = data.map(msg => {
        const userData = Array.isArray(msg.users) ? msg.users[0] : msg.users
        const classData = Array.isArray(msg.classes) ? msg.classes[0] : msg.classes
        
        return {
          id: msg.id,
          content: msg.content,
          type: msg.type,
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

      setPendingMessages(formattedMessages)
    } catch (error) {
      console.error('승인 대기 메시지 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 메시지 승인/거부
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

      fetchPendingMessages()
    } catch (error) {
      console.error('메시지 승인 실패:', error)
      toast({
        title: '오류',
        description: '메시지 승인 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    }
  }

  // 일괄 승인
  const handleBulkApproval = async (approved: boolean) => {
    if (pendingMessages.length === 0) return

    const confirmMessage = approved 
      ? `${pendingMessages.length}개의 메시지를 모두 승인하시겠습니까?`
      : `${pendingMessages.length}개의 메시지를 모두 거부하시겠습니까?`

    if (!confirm(confirmMessage)) return

    try {
      const promises = pendingMessages.map(message =>
        fetch('/api/messages/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messageId: message.id, approved }),
        })
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.ok).length

      toast({
        title: '완료',
        description: `${successCount}개의 메시지가 ${approved ? '승인' : '거부'}되었습니다.`
      })

      fetchPendingMessages()
    } catch (error) {
      console.error('일괄 처리 실패:', error)
      toast({
        title: '오류',
        description: '일괄 처리 중 오류가 발생했습니다.',
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
    if (user && userRole === 'teacher') {
      fetchPendingMessages()

      // 실시간 업데이트 구독
      const channel = supabase
        .channel('pending-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          () => {
            fetchPendingMessages()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, userRole])

  // 교사가 아닌 경우 접근 거부
  if (userRole !== 'teacher') {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              접근 권한이 없습니다
            </h3>
            <p className="text-gray-600">
              이 페이지는 교사만 접근할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
        <div>
          <h1 className="text-2xl font-bold">메시지 승인 관리</h1>
          <p className="text-gray-600 mt-1">학생들의 메시지를 검토하고 승인하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <Clock className="h-3 w-3 mr-1" />
            {pendingMessages.length}개 대기 중
          </Badge>
        </div>
      </div>

      {/* 통계 및 일괄 처리 */}
      {pendingMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              승인 대기 중인 메시지
            </CardTitle>
            <CardDescription>
              총 {pendingMessages.length}개의 메시지가 승인을 기다리고 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkApproval(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                모두 승인
              </Button>
              <Button
                onClick={() => handleBulkApproval(false)}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                모두 거부
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 승인 대기 메시지 목록 */}
      <div className="space-y-4">
        {pendingMessages.length > 0 ? (
          pendingMessages.map((message) => (
            <Card key={message.id} className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{message.class_info.name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="font-medium">{message.sender.name}</span>
                    <Badge variant="secondary">학생</Badge>
                    <Badge className={getMessageTypeColor(message.type)}>
                      {getMessageTypeLabel(message.type)}
                    </Badge>
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
                <div className="mb-4">
                  <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                    {message.content}
                  </p>
                </div>
                
                <div className="flex gap-2">
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
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                모든 메시지가 처리되었습니다
              </h3>
              <p className="text-gray-600">
                현재 승인 대기 중인 메시지가 없습니다.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
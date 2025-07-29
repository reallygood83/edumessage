'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  User,
  UserCheck,
  Filter,
  Plus,
  Minus,
  Brain,
  Sparkles
} from 'lucide-react'
import QuestionAnalysisPanel from '@/components/ai/QuestionAnalysisPanel'

interface QAQuestion {
  id: string
  question: string
  answer?: string
  status: 'pending' | 'answered' | 'dismissed'
  priority: 'low' | 'normal' | 'high'
  is_anonymous: boolean
  votes: number
  created_at: string
  answered_at?: string
  student?: {
    id: string
    name: string
  }
  teacher?: {
    id: string
    name: string
  }
}

interface QAPanelProps {
  sessionId: string
  isTeacher: boolean
  qaEnabled: boolean
  subject?: string
  classId?: string
}

export default function QAPanel({ sessionId, isTeacher, qaEnabled, subject, classId }: QAPanelProps) {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QAQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAnswerForm, setShowAnswerForm] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [showAIAnalysis, setShowAIAnalysis] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (qaEnabled) {
      fetchQuestions()
      subscribeToChanges()
    }
  }, [sessionId, qaEnabled, statusFilter])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      let url = `/api/sessions/${sessionId}/qa`
      
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setQuestions(data.questions || [])
      } else {
        console.error('질문 조회 실패:', data.error)
      }
    } catch (error) {
      console.error('질문 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`qa_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_qa',
        filter: `session_id=eq.${sessionId}`
      }, () => {
        fetchQuestions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const submitQuestion = async () => {
    if (!newQuestion.trim()) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/sessions/${sessionId}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          priority,
          isAnonymous
        })
      })

      const data = await response.json()

      if (response.ok) {
        setNewQuestion('')
        setPriority('normal')
        setIsAnonymous(false)
        // fetchQuestions() // 실시간 구독으로 자동 업데이트됨
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('질문 제출 실패:', error)
      alert('질문 제출에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitAnswer = async (questionId: string) => {
    if (!answerText.trim()) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answerText,
          questionId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setAnswerText('')
        setShowAnswerForm(null)
        // fetchQuestions() // 실시간 구독으로 자동 업데이트됨
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('답변 제출 실패:', error)
      alert('답변 제출에 실패했습니다.')
    }
  }

  const voteQuestion = async (questionId: string, upvote: boolean) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/qa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          vote: upvote
        })
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error)
      }
    } catch (error) {
      console.error('투표 실패:', error)
      alert('투표에 실패했습니다.')
    }
  }

  const updateQuestionStatus = async (questionId: string, status: string, priority?: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/qa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          status,
          priority
        })
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error)
      }
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'secondary' | 'default' | 'outline', icon: any, text: string }> = {
      pending: { variant: 'secondary' as const, icon: Clock, text: '대기 중' },
      answered: { variant: 'default' as const, icon: CheckCircle, text: '답변 완료' },
      dismissed: { variant: 'outline' as const, icon: XCircle, text: '보류' }
    }
    return variants[status] || variants.pending
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'destructive' | 'secondary' | 'outline', text: string }> = {
      high: { variant: 'destructive' as const, text: '높음' },
      normal: { variant: 'secondary' as const, text: '보통' },
      low: { variant: 'outline' as const, text: '낮음' }
    }
    return variants[priority] || variants.normal
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!qaEnabled) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4" />
            <p>이 세션에서는 Q&A가 비활성화되어 있습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Q&A ({questions.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">전체</option>
              <option value="pending">대기 중</option>
              <option value="answered">답변 완료</option>
              <option value="dismissed">보류</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* 새 질문 작성 (학생만) */}
        {!isTeacher && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="space-y-3">
              <Textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="질문을 입력하세요..."
                rows={3}
                className="resize-none"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                    익명 질문
                  </label>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span>우선순위:</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="low">낮음</option>
                      <option value="normal">보통</option>
                      <option value="high">높음</option>
                    </select>
                  </div>
                </div>
                
                <Button 
                  onClick={submitQuestion} 
                  disabled={!newQuestion.trim() || submitting}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-1" />
                  {submitting ? '제출 중...' : '질문하기'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 질문 목록 */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              질문을 불러오는 중...
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4" />
              <p>아직 질문이 없습니다.</p>
              {!isTeacher && <p className="text-sm">첫 번째 질문을 해보세요!</p>}
            </div>
          ) : (
            questions.map((question) => {
              const statusBadge = getStatusBadge(question.status)
              const priorityBadge = getPriorityBadge(question.priority)
              const StatusIcon = statusBadge.icon

              return (
                <div key={question.id} className="border rounded-lg p-4 space-y-3">
                  {/* 질문 헤더 */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-1">
                        {question.student ? (
                          <>
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{question.student.name}</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">익명</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(question.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityBadge.variant} className="text-xs">
                        {priorityBadge.text}
                      </Badge>
                      <Badge variant={statusBadge.variant} className="text-xs">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusBadge.text}
                      </Badge>
                    </div>
                  </div>

                  {/* 질문 내용 */}
                  <div className="text-sm">
                    <p className="font-medium mb-2">Q: {question.question}</p>
                    
                    {question.answer && (
                      <div className="bg-muted/50 rounded p-3 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium">
                            {question.teacher?.name} 선생님의 답변
                          </span>
                          {question.answered_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(question.answered_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">A: {question.answer}</p>
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex items-center justify-between">
                    {/* 투표 (학생만) */}
                    {!isTeacher && question.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => voteQuestion(question.id, true)}
                          className="h-8 px-2"
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {question.votes}
                        </Button>
                      </div>
                    )}

                    {/* 교사 액션 */}
                    {isTeacher && (
                      <div className="flex items-center gap-2">
                        {question.status === 'pending' && !question.answer && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAnswerForm(showAnswerForm === question.id ? null : question.id)}
                              className="h-8 px-2"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              답변하기
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAIAnalysis(showAIAnalysis === question.id ? null : question.id)}
                              className="h-8 px-2"
                              title="AI 분석"
                            >
                              <Brain className="w-4 h-4 mr-1" />
                              AI 분석
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuestionStatus(question.id, 'dismissed')}
                              className="h-8 px-2"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              보류
                            </Button>
                          </>
                        )}
                        
                        {question.status === 'dismissed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuestionStatus(question.id, 'pending')}
                            className="h-8 px-2"
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            다시 활성화
                          </Button>
                        )}

                        {/* 우선순위 조정 */}
                        {question.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuestionStatus(question.id, 'pending', 'high')}
                              disabled={question.priority === 'high'}
                              className="h-8 w-8 p-0"
                              title="우선순위 높이기"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuestionStatus(question.id, 'pending', 'low')}
                              disabled={question.priority === 'low'}
                              className="h-8 w-8 p-0"
                              title="우선순위 낮추기"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 답변 폼 (교사) */}
                  {isTeacher && showAnswerForm === question.id && (
                    <div className="border-t pt-3 space-y-3">
                      <Textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="답변을 입력하세요..."
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => submitAnswer(question.id)}
                          disabled={!answerText.trim()}
                          size="sm"
                        >
                          답변 등록
                        </Button>
                        <Button 
                          onClick={() => setShowAnswerForm(null)}
                          variant="outline"
                          size="sm"
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* AI 분석 패널 (교사) */}
                  {isTeacher && showAIAnalysis === question.id && (
                    <div className="border-t pt-3">
                      <QuestionAnalysisPanel
                        questionId={question.id}
                        questionText={question.question}
                        subject={subject}
                        sessionId={sessionId}
                        classId={classId}
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
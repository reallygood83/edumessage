'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { subDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain,
  TrendingUp,
  BarChart3,
  Users,
  Clock,
  Target,
  Lightbulb,
  BookOpen,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Calendar,
  PieChart,
  LineChart
} from 'lucide-react'

interface ClassAnalytics {
  id: string
  name: string
  totalQuestions: number
  recentQuestions: number
  avgResponseTime: number
  studentParticipation: number
  topTopics: string[]
  difficultyAreas: string[]
  lastAnalyzed?: string
}

interface AIInsight {
  type: 'trend' | 'recommendation' | 'alert' | 'success'
  title: string
  description: string
  actionable: boolean
  priority: 'high' | 'medium' | 'low'
}

export default function AIInsightsPage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<ClassAnalytics[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('최근 7일')
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchClassAnalytics()
      generateInsights()
    }
  }, [user])

  const fetchClassAnalytics = async () => {
    try {
      setLoading(true)
      
      // 교사의 클래스 정보 조회
      const { data: teacherClasses, error: classError } = await supabase
        .from('classes')
        .select('id, name, description')
        .eq('teacher_id', user?.id)

      if (classError) throw classError

      // 각 클래스별 질문 통계 계산
      const classAnalytics: ClassAnalytics[] = []

      for (const cls of teacherClasses || []) {
        // 클래스의 세션들 조회
        const { data: sessions } = await supabase
          .from('class_sessions')
          .select('id')
          .eq('class_id', cls.id)

        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id)

          // 전체 질문 수
          const { count: totalQuestions } = await supabase
            .from('session_qa')
            .select('*', { count: 'exact', head: true })
            .in('session_id', sessionIds)

          // 최근 7일 질문 수
          const weekAgo = subDays(new Date(), 7)

          const { count: recentQuestions } = await supabase
            .from('session_qa')
            .select('*', { count: 'exact', head: true })
            .in('session_id', sessionIds)
            .gte('created_at', weekAgo.toISOString())

          // 최근 패턴 분석 결과 조회
          const { data: latestAnalysis } = await supabase
            .from('qa_pattern_analysis')
            .select('analysis_result, created_at')
            .eq('class_id', cls.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          let topTopics: string[] = []
          let difficultyAreas: string[] = []

          if (latestAnalysis?.analysis_result) {
            const result = latestAnalysis.analysis_result as any
            topTopics = result.main_topics || []
            difficultyAreas = result.difficulty_areas || []
          }

          classAnalytics.push({
            id: cls.id,
            name: cls.name,
            totalQuestions: totalQuestions || 0,
            recentQuestions: recentQuestions || 0,
            avgResponseTime: Math.random() * 30 + 5, // 임시 데이터
            studentParticipation: Math.random() * 100, // 임시 데이터
            topTopics,
            difficultyAreas,
            lastAnalyzed: latestAnalysis?.created_at
          })
        }
      }

      setClasses(classAnalytics)
      if (classAnalytics.length > 0 && !selectedClass) {
        setSelectedClass(classAnalytics[0].id)
      }

    } catch (error) {
      console.error('클래스 분석 데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = () => {
    // AI 인사이트 생성 (실제로는 AI 모델에서 생성)
    const sampleInsights: AIInsight[] = [
      {
        type: 'trend',
        title: '질문 활동 증가 추세',
        description: '이번 주 학생들의 질문이 지난 주 대비 40% 증가했습니다. 학습 참여도가 높아지고 있는 긍정적인 신호입니다.',
        actionable: false,
        priority: 'low'
      },
      {
        type: 'recommendation',
        title: '수학 개념 보충 수업 권장',
        description: '최근 질문 패턴 분석 결과, 함수 개념에 대한 어려움이 지속적으로 나타나고 있습니다. 추가 설명이나 보충 자료가 필요할 것 같습니다.',
        actionable: true,
        priority: 'high'
      },
      {
        type: 'alert',
        title: '익명 질문 비율 증가',
        description: '익명 질문의 비율이 70%로 증가했습니다. 학생들이 부담을 느끼고 있을 수 있으니 학습 분위기를 점검해보세요.',
        actionable: true,
        priority: 'medium'
      },
      {
        type: 'success',
        title: '답변 만족도 높음',
        description: '최근 제공한 답변들에 대한 학생들의 후속 질문이 긍정적인 방향으로 발전하고 있습니다.',
        actionable: false,
        priority: 'low'
      }
    ]

    setInsights(sampleInsights)
  }

  const analyzeClassPatterns = async (classId: string) => {
    try {
      setAnalyzing(true)
      const response = await fetch('/api/ai/analyze-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          timeRange: selectedTimeRange,
          subject: '일반'
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ 패턴 분석이 완료되었습니다!')
        fetchClassAnalytics()
      } else {
        // 구체적인 에러 메시지 제공
        let errorMessage = '패턴 분석 중 오류가 발생했습니다.'
        
        if (data.error?.includes('API key') || data.error?.includes('GEMINI_API_KEY')) {
          errorMessage = '⚠️ AI 분석 기능을 사용하려면 Gemini API 키 설정이 필요합니다.\n관리자에게 문의하세요.'
        } else if (data.error?.includes('rate limit') || data.error?.includes('quota')) {
          errorMessage = '⏳ AI 분석 사용량이 일시적으로 제한되었습니다.\n잠시 후 다시 시도해주세요.'
        } else if (data.error?.includes('No questions found')) {
          errorMessage = '📝 분석할 질문이 충분하지 않습니다.\n학생들의 질문이 더 등록된 후 시도해주세요.'
        } else if (data.error) {
          errorMessage = `❌ ${data.error}`
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      console.error('패턴 분석 실패:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('🌐 서버 연결에 실패했습니다.\n네트워크 상태를 확인해주세요.')
      } else {
        alert('💥 패턴 분석 중 예상치 못한 오류가 발생했습니다.')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return TrendingUp
      case 'recommendation': return Lightbulb
      case 'alert': return MessageSquare
      case 'success': return Target
      default: return Brain
    }
  }

  const getInsightColor = (type: string, priority: string) => {
    if (type === 'alert') return 'border-red-200 bg-red-50'
    if (type === 'success') return 'border-green-200 bg-green-50'
    if (type === 'recommendation' && priority === 'high') return 'border-orange-200 bg-orange-50'
    return 'border-blue-200 bg-blue-50'
  }

  const selectedClassData = classes.find(c => c.id === selectedClass)

  if (user?.role !== 'teacher') {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">접근 권한 없음</h3>
          <p className="text-muted-foreground">AI 인사이트는 교사만 이용할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" />
            AI 교육 인사이트
            <Sparkles className="w-6 h-6 text-purple-500" />
          </h1>
          <p className="text-muted-foreground">
            AI가 분석한 학생 질문 패턴과 학습 인사이트를 확인하세요
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 클래스 선택 및 필터 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">클래스:</label>
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
          <label className="text-sm font-medium">기간:</label>
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="최근 1일">최근 1일</option>
            <option value="최근 7일">최근 7일</option>
            <option value="최근 30일">최근 30일</option>
            <option value="최근 3개월">최근 3개월</option>
          </select>
        </div>

        <Button 
          onClick={() => selectedClass && analyzeClassPatterns(selectedClass)}
          disabled={analyzing || !selectedClass}
          size="sm"
        >
          {analyzing ? <Brain className="w-4 h-4 animate-pulse mr-1" /> : <BarChart3 className="w-4 h-4 mr-1" />}
          {analyzing ? '분석 중...' : 'AI 분석 실행'}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">AI 데이터를 불러오는 중...</div>
      ) : (
        <>
          {/* 클래스 개요 카드 */}
          {selectedClassData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{selectedClassData.totalQuestions}</div>
                      <div className="text-sm text-muted-foreground">총 질문 수</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{selectedClassData.recentQuestions}</div>
                      <div className="text-sm text-muted-foreground">{selectedTimeRange} 질문</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-orange-500" />
                    <div>
                      <div className="text-2xl font-bold">{selectedClassData.avgResponseTime.toFixed(1)}분</div>
                      <div className="text-sm text-muted-foreground">평균 응답시간</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold">{selectedClassData.studentParticipation.toFixed(0)}%</div>
                      <div className="text-sm text-muted-foreground">학생 참여도</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI 인사이트 섹션 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI 추천 사항 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                AI 추천 사항
              </h2>
              <div className="space-y-3">
                {insights.map((insight, index) => {
                  const IconComponent = getInsightIcon(insight.type)
                  return (
                    <Card key={index} className={getInsightColor(insight.type, insight.priority)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <IconComponent className="w-5 h-5 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{insight.title}</h4>
                              <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'secondary'}>
                                {insight.priority === 'high' ? '높음' : insight.priority === 'medium' ? '보통' : '낮음'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                            {insight.actionable && (
                              <Button size="sm" variant="outline">
                                조치 사항 보기
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* 클래스 상세 분석 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                클래스 상세 분석
              </h2>
              
              {selectedClassData && (
                <div className="space-y-4">
                  {/* 주요 주제 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">🎯 주요 관심 주제</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedClassData.topTopics.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedClassData.topTopics.map((topic, index) => (
                            <Badge key={index} variant="secondary">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          AI 분석을 실행하여 주요 주제를 확인하세요
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* 어려움 영역 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">⚠️ 어려움 영역</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedClassData.difficultyAreas.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedClassData.difficultyAreas.map((area, index) => (
                            <Badge key={index} variant="destructive">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          AI 분석을 실행하여 어려움 영역을 확인하세요
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* 분석 이력 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">📊 분석 이력</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedClassData.lastAnalyzed ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>마지막 분석: {new Date(selectedClassData.lastAnalyzed).toLocaleDateString('ko-KR')}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          아직 AI 분석이 실행되지 않았습니다
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
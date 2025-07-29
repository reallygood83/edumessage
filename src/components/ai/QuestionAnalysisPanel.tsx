'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain,
  Target,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  BookOpen,
  Users,
  BarChart3,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle
} from 'lucide-react'

interface QuestionAnalysis {
  category: string
  confidence: number
  reasoning: string
  keywords: string[]
}

interface FollowUpQuestions {
  understanding_check: string[]
  deeper_thinking: string[]
  practical_application: string[]
  explanation: string
}

interface AnswerSuggestions {
  main_answer: string
  examples: string[]
  analogies: string
  related_concepts: string[]
  additional_resources: string[]
  follow_up_activities: string[]
}

interface PatternAnalysis {
  main_topics: string[]
  difficulty_areas: string[]
  comprehension_level: string
  learning_gaps: string[]
  teaching_suggestions: string[]
  additional_resources: string[]
}

interface QuestionAnalysisPanelProps {
  questionId: string
  questionText: string
  subject?: string
  level?: string
  sessionId?: string
  classId?: string
}

export default function QuestionAnalysisPanel({
  questionId,
  questionText,
  subject = '일반',
  level = '중급',
  sessionId,
  classId
}: QuestionAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<'categorize' | 'follow_up' | 'answer_suggestions' | 'patterns'>('categorize')
  const [loading, setLoading] = useState(false)
  const [categorization, setCategorization] = useState<QuestionAnalysis | null>(null)
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestions | null>(null)
  const [answerSuggestions, setAnswerSuggestions] = useState<AnswerSuggestions | null>(null)
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main']))
  const [error, setError] = useState<string | null>(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  const analyzeQuestion = async (analysisType: string) => {
    try {
      setLoading(true)
      setError(null)
      setApiKeyMissing(false)

      const response = await fetch('/api/ai/analyze-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          analysisType,
          subject,
          level,
          context: ''
        })
      })

      const data = await response.json()

      if (response.ok) {
        switch (analysisType) {
          case 'categorize':
            setCategorization(data.analysis)
            break
          case 'follow_up':
            setFollowUpQuestions(data.analysis)
            break
          case 'answer_suggestions':
            setAnswerSuggestions(data.analysis)
            break
        }
      } else {
        // 특정 에러 유형별 처리
        if (data.error?.includes('API key') || data.error?.includes('GEMINI_API_KEY')) {
          setApiKeyMissing(true)
          setError('Gemini AI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.')
        } else if (data.error?.includes('rate limit') || data.error?.includes('quota')) {
          setError('AI 분석 사용량이 일시적으로 제한되었습니다. 잠시 후 다시 시도해주세요.')
        } else if (data.error?.includes('network') || data.error?.includes('timeout')) {
          setError('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.')
        } else {
          setError(data.error || 'AI 분석 중 오류가 발생했습니다.')
        }
      }
    } catch (error) {
      console.error('AI 분석 실패:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('서버 연결에 실패했습니다. 네트워크 상태를 확인해주세요.')
      } else {
        setError('AI 분석 중 예상치 못한 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const analyzePatterns = async () => {
    try {
      setLoading(true)
      setError(null)
      setApiKeyMissing(false)

      const response = await fetch('/api/ai/analyze-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          classId,
          timeRange: '최근 7일',
          subject
        })
      })

      const data = await response.json()

      if (response.ok) {
        setPatternAnalysis(data.analysis)
      } else {
        // 특정 에러 유형별 처리
        if (data.error?.includes('API key') || data.error?.includes('GEMINI_API_KEY')) {
          setApiKeyMissing(true)
          setError('Gemini AI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.')
        } else if (data.error?.includes('rate limit') || data.error?.includes('quota')) {
          setError('AI 분석 사용량이 일시적으로 제한되었습니다. 잠시 후 다시 시도해주세요.')
        } else if (data.error?.includes('No questions found')) {
          setError('분석할 질문이 충분하지 않습니다. 더 많은 질문이 등록된 후 시도해주세요.')
        } else {
          setError(data.error || '패턴 분석 중 오류가 발생했습니다.')
        }
      }
    } catch (error) {
      console.error('패턴 분석 실패:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('서버 연결에 실패했습니다. 네트워크 상태를 확인해주세요.')
      } else {
        setError('패턴 분석 중 예상치 못한 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      '개념이해': 'bg-blue-100 text-blue-800',
      '문제해결': 'bg-green-100 text-green-800',
      '실습지원': 'bg-purple-100 text-purple-800',
      '심화학습': 'bg-orange-100 text-orange-800',
      '시험준비': 'bg-red-100 text-red-800',
      '진로상담': 'bg-yellow-100 text-yellow-800',
      '기타': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors['기타']
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI 질문 분석
          <Sparkles className="w-4 h-4 text-purple-500" />
        </CardTitle>
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>분석 대상:</strong> "{questionText.substring(0, 100)}{questionText.length > 100 ? '...' : ''}"
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 에러 메시지 */}
        {error && (
          <div className={`p-4 rounded-lg border ${
            apiKeyMissing 
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">
                  {apiKeyMissing ? 'AI 설정 필요' : '분석 오류'}
                </h4>
                <p className="text-sm">{error}</p>
                {apiKeyMissing && (
                  <div className="mt-2 text-xs">
                    <p>📝 해결 방법:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>.env.local 파일에 GEMINI_API_KEY 추가</li>
                      <li>Google AI Studio에서 API 키 발급</li>
                      <li>서버 재시작 후 다시 시도</li>
                    </ul>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setError(null)}
                className="text-current"
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'categorize' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('categorize')}
          >
            <Target className="w-4 h-4 mr-1" />
            카테고리 분석
          </Button>
          <Button
            variant={activeTab === 'follow_up' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('follow_up')}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            후속 질문
          </Button>
          <Button
            variant={activeTab === 'answer_suggestions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('answer_suggestions')}
          >
            <Lightbulb className="w-4 h-4 mr-1" />
            답변 제안
          </Button>
          <Button
            variant={activeTab === 'patterns' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('patterns')}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            패턴 분석
          </Button>
        </div>

        {/* 카테고리 분석 탭 */}
        {activeTab === 'categorize' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">질문 카테고리 분석</h3>
              <Button
                onClick={() => analyzeQuestion('categorize')}
                disabled={loading}
                size="sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                분석하기
              </Button>
            </div>

            {categorization && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryBadgeColor(categorization.category)}>
                    {categorization.category}
                  </Badge>
                  <span className={`text-sm font-medium ${getConfidenceColor(categorization.confidence)}`}>
                    신뢰도: {(categorization.confidence * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">분류 이유</h4>
                  <p className="text-sm">{categorization.reasoning}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">키워드</h4>
                  <div className="flex flex-wrap gap-1">
                    {categorization.keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 후속 질문 탭 */}
        {activeTab === 'follow_up' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">AI 후속 질문 제안</h3>
              <Button
                onClick={() => analyzeQuestion('follow_up')}
                disabled={loading}
                size="sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                생성하기
              </Button>
            </div>

            {followUpQuestions && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">💡 이해도 확인 질문</h4>
                  <ul className="space-y-1">
                    {followUpQuestions.understanding_check.map((question, index) => (
                      <li key={index} className="text-sm text-blue-700">• {question}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">🤔 심화 사고 질문</h4>
                  <ul className="space-y-1">
                    {followUpQuestions.deeper_thinking.map((question, index) => (
                      <li key={index} className="text-sm text-green-700">• {question}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">🔧 실제 적용 질문</h4>
                  <ul className="space-y-1">
                    {followUpQuestions.practical_application.map((question, index) => (
                      <li key={index} className="text-sm text-purple-700">• {question}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">📝 활용 가이드</h4>
                  <p className="text-sm">{followUpQuestions.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 답변 제안 탭 */}
        {activeTab === 'answer_suggestions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">AI 답변 제안</h3>
              <Button
                onClick={() => analyzeQuestion('answer_suggestions')}
                disabled={loading}
                size="sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                생성하기
              </Button>
            </div>

            {answerSuggestions && (
              <div className="space-y-4">
                {/* 주요 답변 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('main')}
                  >
                    <h4 className="font-medium text-blue-800">📝 주요 답변</h4>
                    {expandedSections.has('main') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  {expandedSections.has('main') && (
                    <p className="text-sm text-blue-700 mt-2">{answerSuggestions.main_answer}</p>
                  )}
                </div>

                {/* 예시 */}
                {answerSuggestions.examples.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleSection('examples')}
                    >
                      <h4 className="font-medium text-green-800">🔍 구체적 예시</h4>
                      {expandedSections.has('examples') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                    {expandedSections.has('examples') && (
                      <ul className="space-y-1 mt-2">
                        {answerSuggestions.examples.map((example, index) => (
                          <li key={index} className="text-sm text-green-700">• {example}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* 비유 */}
                {answerSuggestions.analogies && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleSection('analogies')}
                    >
                      <h4 className="font-medium text-yellow-800">🎭 이해를 돕는 비유</h4>
                      {expandedSections.has('analogies') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                    {expandedSections.has('analogies') && (
                      <p className="text-sm text-yellow-700 mt-2">{answerSuggestions.analogies}</p>
                    )}
                  </div>
                )}

                {/* 관련 개념 */}
                {answerSuggestions.related_concepts.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">🔗 관련 개념</h4>
                    <div className="flex flex-wrap gap-1">
                      {answerSuggestions.related_concepts.map((concept, index) => (
                        <Badge key={index} variant="outline" className="text-purple-700 border-purple-300">
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 추가 자료 */}
                {answerSuggestions.additional_resources.length > 0 && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-2">📚 추천 학습 자료</h4>
                    <ul className="space-y-1">
                      {answerSuggestions.additional_resources.map((resource, index) => (
                        <li key={index} className="text-sm text-orange-700">• {resource}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 후속 활동 */}
                {answerSuggestions.follow_up_activities.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">🎯 후속 학습 활동</h4>
                    <ul className="space-y-1">
                      {answerSuggestions.follow_up_activities.map((activity, index) => (
                        <li key={index} className="text-sm text-red-700">• {activity}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 패턴 분석 탭 */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">질문 패턴 분석 (최근 7일)</h3>
              <Button
                onClick={analyzePatterns}
                disabled={loading}
                size="sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <BarChart3 className="w-4 h-4 mr-1" />}
                분석하기
              </Button>
            </div>

            {patternAnalysis && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">📊 주요 관심 주제</h4>
                    <div className="flex flex-wrap gap-1">
                      {patternAnalysis.main_topics.map((topic, index) => (
                        <Badge key={index} className="bg-blue-100 text-blue-800">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">⚠️ 어려움 영역</h4>
                    <div className="flex flex-wrap gap-1">
                      {patternAnalysis.difficulty_areas.map((area, index) => (
                        <Badge key={index} className="bg-red-100 text-red-800">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">📈 전체 이해도 수준</h4>
                  <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
                    {patternAnalysis.comprehension_level}
                  </Badge>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">🎯 학습 공백</h4>
                  <ul className="space-y-1">
                    {patternAnalysis.learning_gaps.map((gap, index) => (
                      <li key={index} className="text-sm text-yellow-700">• {gap}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">💡 교수법 제안</h4>
                  <ul className="space-y-1">
                    {patternAnalysis.teaching_suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-purple-700">• {suggestion}</li>
                    ))}
                  </ul>
                </div>

                {patternAnalysis.additional_resources.length > 0 && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-2">📚 추천 자료</h4>
                    <ul className="space-y-1">
                      {patternAnalysis.additional_resources.map((resource, index) => (
                        <li key={index} className="text-sm text-orange-700">• {resource}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
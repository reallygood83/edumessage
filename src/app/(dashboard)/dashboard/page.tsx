'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, Calendar, BookOpen, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const userRole = user?.user_metadata?.role || 'student'
  const userName = user?.user_metadata?.name || user?.email

  const teacherStats = [
    {
      title: '활성 학급',
      value: '2',
      description: '관리 중인 학급 수',
      icon: Users,
    },
    {
      title: '미읽은 메시지',
      value: '5',
      description: '새로운 학생 질문',
      icon: MessageSquare,
    },
    {
      title: '오늘 수업',
      value: '3',
      description: '예정된 세션',
      icon: Calendar,
    },
    {
      title: '미채점 숙제',
      value: '12',
      description: '채점 대기 중',
      icon: BookOpen,
    },
  ]

  const studentStats = [
    {
      title: '내 학급',
      value: '5학년 3반',
      description: '소속 학급',
      icon: Users,
    },
    {
      title: '새 알림',
      value: '3',
      description: '읽지 않은 알림',
      icon: MessageSquare,
    },
    {
      title: '오늘 수업',
      value: '4',
      description: '예정된 수업',
      icon: Calendar,
    },
    {
      title: '제출할 숙제',
      value: '2',
      description: '마감 임박',
      icon: BookOpen,
    },
  ]

  const stats = userRole === 'teacher' ? teacherStats : studentStats

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          안녕하세요, {userName}님! 👋
        </h1>
        <p className="text-gray-600">
          {userRole === 'teacher' 
            ? '오늘도 학생들과 소통하며 즐거운 수업을 진행해보세요.'
            : '오늘도 즐겁게 학습해보세요!'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
            <CardDescription>
              자주 사용하는 기능들에 빠르게 접근하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {userRole === 'teacher' ? (
              <>
                <button className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  📝 새 알림장 작성
                </button>
                <button className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  📚 새 숙제 배포
                </button>
                <button className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  🎯 수업 세션 생성
                </button>
                <button 
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => window.location.href = '/dashboard/ai-insights'}
                >
                  🧠 AI 교육 인사이트
                </button>
              </>
            ) : (
              <>
                <button className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  ❓ 선생님께 질문하기
                </button>
                <button className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  📝 숙제 제출하기
                </button>
                <button className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  📅 수업 일정 보기
                </button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>
              최근 7일간의 활동 내역
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium">국어 숙제</span>가 제출되었습니다
                  <div className="text-xs text-gray-500">2시간 전</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium">수학 세션</span>이 완료되었습니다
                  <div className="text-xs text-gray-500">어제</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium">새 알림장</span>이 게시되었습니다
                  <div className="text-xs text-gray-500">3일 전</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
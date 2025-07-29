'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, Home, MessageSquare, Calendar, BookOpen, Users, Bell } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  const userRole = user.user_metadata?.role || 'student'

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm">
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-800">EduMessage</h2>
          <p className="text-sm text-gray-600">
            {user.user_metadata?.name || user.email}
          </p>
          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mt-1">
            {userRole === 'teacher' ? '교사' : userRole === 'student' ? '학생' : '학부모'}
          </span>
        </div>
        
        <nav className="mt-4">
          <div className="space-y-1 px-4">
            <a
              href="/dashboard"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              <Home className="mr-3 h-4 w-4" />
              대시보드
            </a>
            
            {userRole === 'teacher' && (
              <>
                <a
                  href="/dashboard/classes"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Users className="mr-3 h-4 w-4" />
                  학급 관리
                </a>
                <a
                  href="/dashboard/message-moderation"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <MessageSquare className="mr-3 h-4 w-4" />
                  메시지 승인
                </a>
                <a
                  href="/dashboard/sessions"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Calendar className="mr-3 h-4 w-4" />
                  수업 세션
                </a>
              </>
            )}
            
            {(userRole === 'student' || userRole === 'parent') && (
              <>
                <a
                  href="/dashboard/join-class"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Users className="mr-3 h-4 w-4" />
                  학급 참여
                </a>
                <a
                  href="/dashboard/sessions"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Calendar className="mr-3 h-4 w-4" />
                  클래스 세션
                </a>
              </>
            )}
            
            <a
              href="/dashboard/messages"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              <MessageSquare className="mr-3 h-4 w-4" />
              메시지
            </a>
            
            <a
              href="/dashboard/notifications"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              <Bell className="mr-3 h-4 w-4" />
              알림장
            </a>
            
            <a
              href="/dashboard/homework"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              <BookOpen className="mr-3 h-4 w-4" />
              숙제
            </a>
          </div>
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
// import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  CalendarIcon, 
  ClockIcon, 
  UsersIcon, 
  VideoIcon,
  MessageSquareIcon,
  HelpCircleIcon,
  ScreenShareIcon,
  MicIcon,
  Plus,
  X,
  FileText,
  ImageIcon,
  ExternalLinkIcon,
  CodeIcon
} from 'lucide-react'

interface Class {
  id: string
  name: string
  description: string
  teacher_id: string
}

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  classes: Class[]
  onSessionCreated: () => void
}

interface SessionContent {
  contentType: string
  title: string
  url: string
  thumbnailUrl?: string
  fileSize?: number
  duration?: number
  orderIndex: number
  isDownloadable: boolean
  isRequired: boolean
  description?: string
}

export default function CreateSessionModal({ 
  isOpen, 
  onClose, 
  classes, 
  onSessionCreated 
}: CreateSessionModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    classId: classes[0]?.id || '',
    title: '',
    description: '',
    subject: '',
    sessionType: 'lecture',
    scheduledStart: '',
    scheduledEnd: '',
    maxParticipants: '',
    allowLateJoin: true,
    recordingEnabled: false,
    chatEnabled: true,
    qaEnabled: true,
    screenSharingEnabled: true,
    attendanceTracking: true,
    sessionUrl: '',
    meetingId: '',
    passcode: ''
  })
  
  const [contents, setContents] = useState<SessionContent[]>([])
  const [showContentForm, setShowContentForm] = useState(false)
  const [newContent, setNewContent] = useState<Partial<SessionContent>>({
    contentType: 'video',
    title: '',
    url: '',
    orderIndex: 0,
    isDownloadable: false,
    isRequired: false
  })

  const sessionTypes = [
    { value: 'lecture', label: '강의' },
    { value: 'discussion', label: '토론' },
    { value: 'workshop', label: '워크숍' },
    { value: 'presentation', label: '발표' },
    { value: 'quiz', label: '퀴즈' },
    { value: 'review', label: '복습' }
  ]

  const contentTypes = [
    { value: 'video', label: '동영상', icon: VideoIcon },
    { value: 'audio', label: '오디오', icon: MicIcon },
    { value: 'document', label: '문서', icon: FileText },
    { value: 'presentation', label: '프레젠테이션', icon: ScreenShareIcon },
    { value: 'image', label: '이미지', icon: ImageIcon },
    { value: 'link', label: '링크', icon: ExternalLinkIcon },
    { value: 'embed', label: '임베드', icon: CodeIcon }
  ]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addContent = () => {
    if (!newContent.title || !newContent.url) {
      alert('제목과 URL을 입력해주세요.')
      return
    }

    const content: SessionContent = {
      contentType: newContent.contentType || 'video',
      title: newContent.title,
      url: newContent.url,
      thumbnailUrl: newContent.thumbnailUrl,
      fileSize: newContent.fileSize,
      duration: newContent.duration,
      orderIndex: contents.length,
      isDownloadable: newContent.isDownloadable || false,
      isRequired: newContent.isRequired || false,
      description: newContent.description
    }

    setContents([...contents, content])
    setNewContent({
      contentType: 'video',
      title: '',
      url: '',
      orderIndex: 0,
      isDownloadable: false,
      isRequired: false
    })
    setShowContentForm(false)
  }

  const removeContent = (index: number) => {
    setContents(contents.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.scheduledStart || !formData.scheduledEnd) {
      alert('필수 필드를 모두 입력해주세요.')
      return
    }

    const startTime = new Date(formData.scheduledStart)
    const endTime = new Date(formData.scheduledEnd)
    const now = new Date()

    if (startTime <= now) {
      alert('시작 시간은 현재 시간보다 이후여야 합니다.')
      return
    }

    if (endTime <= startTime) {
      alert('종료 시간은 시작 시간보다 이후여야 합니다.')
      return
    }

    try {
      setLoading(true)

      // 세션 생성
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null
        })
      })

      const sessionData = await sessionResponse.json()

      if (!sessionResponse.ok) {
        throw new Error(sessionData.error)
      }

      // 콘텐츠 추가
      if (contents.length > 0) {
        for (const content of contents) {
          const contentResponse = await fetch(`/api/sessions/${sessionData.session.id}/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content)
          })

          if (!contentResponse.ok) {
            const contentError = await contentResponse.json()
            console.error('콘텐츠 추가 실패:', contentError.error)
          }
        }
      }

      alert('세션이 성공적으로 생성되었습니다!')
      onSessionCreated()
      onClose()
      
      // 폼 초기화
      setFormData({
        classId: classes[0]?.id || '',
        title: '',
        description: '',
        subject: '',
        sessionType: 'lecture',
        scheduledStart: '',
        scheduledEnd: '',
        maxParticipants: '',
        allowLateJoin: true,
        recordingEnabled: false,
        chatEnabled: true,
        qaEnabled: true,
        screenSharingEnabled: true,
        attendanceTracking: true,
        sessionUrl: '',
        meetingId: '',
        passcode: ''
      })
      setContents([])

    } catch (error) {
      console.error('세션 생성 실패:', error)
      alert(error instanceof Error ? error.message : '세션 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 내일 오전 9시를 기본값으로 설정
  const getDefaultStartTime = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  }

  const getDefaultEndTime = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  }

  if (!formData.scheduledStart) {
    setFormData(prev => ({
      ...prev,
      scheduledStart: getDefaultStartTime(),
      scheduledEnd: getDefaultEndTime()
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 클래스 세션 만들기</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="classId">학급 *</Label>
              <select
                id="classId"
                value={formData.classId}
                onChange={(e) => handleInputChange('classId', e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionType">세션 유형</Label>
              <select
                id="sessionType"
                value={formData.sessionType}
                onChange={(e) => handleInputChange('sessionType', e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {sessionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">세션 제목 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="예: 수학 1단원 - 자연수"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">세션 설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="세션에 대한 간단한 설명을 입력하세요"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">과목</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="예: 수학, 국어, 영어"
            />
          </div>

          {/* 일정 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledStart">시작 시간 *</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="scheduledStart"
                  type="datetime-local"
                  value={formData.scheduledStart}
                  onChange={(e) => handleInputChange('scheduledStart', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledEnd">종료 시간 *</Label>
              <div className="relative">
                <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="scheduledEnd"
                  type="datetime-local"
                  value={formData.scheduledEnd}
                  onChange={(e) => handleInputChange('scheduledEnd', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* 참여자 설정 */}
          <div className="space-y-2">
            <Label htmlFor="maxParticipants">최대 참여자 수</Label>
            <div className="relative">
              <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="maxParticipants"
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                placeholder="제한 없음 (비워두면 제한 없음)"
                className="pl-10"
                min="1"
              />
            </div>
          </div>

          {/* 외부 미팅 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">외부 미팅 연결 (선택사항)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionUrl">세션 URL</Label>
                <Input
                  id="sessionUrl"
                  value={formData.sessionUrl}
                  onChange={(e) => handleInputChange('sessionUrl', e.target.value)}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingId">회의 ID</Label>
                <Input
                  id="meetingId"
                  value={formData.meetingId}
                  onChange={(e) => handleInputChange('meetingId', e.target.value)}
                  placeholder="123-456-789"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passcode">회의 비밀번호</Label>
              <Input
                id="passcode"
                value={formData.passcode}
                onChange={(e) => handleInputChange('passcode', e.target.value)}
                placeholder="선택사항"
              />
            </div>
          </div>

          {/* 세션 기능 설정 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">세션 기능 설정</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <VideoIcon className="w-4 h-4" />
                  <span className="text-sm">녹화</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.recordingEnabled}
                  onChange={(e) => handleInputChange('recordingEnabled', e.target.checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <MessageSquareIcon className="w-4 h-4" />
                  <span className="text-sm">채팅</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.chatEnabled}
                  onChange={(e) => handleInputChange('chatEnabled', e.target.checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <HelpCircleIcon className="w-4 h-4" />
                  <span className="text-sm">Q&A</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.qaEnabled}
                  onChange={(e) => handleInputChange('qaEnabled', e.target.checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <ScreenShareIcon className="w-4 h-4" />
                  <span className="text-sm">화면공유</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.screenSharingEnabled}
                  onChange={(e) => handleInputChange('screenSharingEnabled', e.target.checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  <span className="text-sm">출석체크</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.attendanceTracking}
                  onChange={(e) => handleInputChange('attendanceTracking', e.target.checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  <span className="text-sm">지각 참여</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowLateJoin}
                  onChange={(e) => handleInputChange('allowLateJoin', e.target.checked)}
                />
              </div>
            </div>
          </div>

          {/* 멀티미디어 콘텐츠 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">세션 콘텐츠</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowContentForm(!showContentForm)}
              >
                <Plus className="w-4 h-4 mr-2" />
                콘텐츠 추가
              </Button>
            </div>

            {/* 기존 콘텐츠 목록 */}
            {contents.length > 0 && (
              <div className="space-y-2">
                {contents.map((content, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{content.contentType}</Badge>
                      <span className="font-medium">{content.title}</span>
                      {content.isRequired && <Badge variant="destructive" className="text-xs">필수</Badge>}
                      {content.isDownloadable && <Badge variant="outline" className="text-xs">다운로드</Badge>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContent(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 새 콘텐츠 추가 폼 */}
            {showContentForm && (
              <div className="border rounded p-4 space-y-4 bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>콘텐츠 유형</Label>
                    <select
                      value={newContent.contentType}
                      onChange={(e) => setNewContent({...newContent, contentType: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    >
                      {contentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>제목</Label>
                    <Input
                      value={newContent.title || ''}
                      onChange={(e) => setNewContent({...newContent, title: e.target.value})}
                      placeholder="콘텐츠 제목"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={newContent.url || ''}
                    onChange={(e) => setNewContent({...newContent, url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea
                    value={newContent.description || ''}
                    onChange={(e) => setNewContent({...newContent, description: e.target.value})}
                    placeholder="콘텐츠에 대한 설명"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newContent.isRequired || false}
                      onChange={(e) => setNewContent({...newContent, isRequired: e.target.checked})}
                    />
                    <span className="text-sm">필수 콘텐츠</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newContent.isDownloadable || false}
                      onChange={(e) => setNewContent({...newContent, isDownloadable: e.target.checked})}
                    />
                    <span className="text-sm">다운로드 허용</span>
                  </label>
                </div>
                
                <div className="flex gap-2">
                  <Button type="button" onClick={addContent} size="sm">
                    추가
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowContentForm(false)}
                    size="sm"
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '생성 중...' : '세션 생성'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
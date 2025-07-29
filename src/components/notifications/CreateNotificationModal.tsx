'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  Pin,
  Upload,
  X 
} from 'lucide-react'

interface CreateNotificationModalProps {
  classId: string
  onNotificationCreated: () => void
}

export default function CreateNotificationModal({
  classId,
  onNotificationCreated
}: CreateNotificationModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general' as const,
    priority: 'normal' as const,
    isPinned: false,
    expiresAt: '',
    attachmentUrl: '',
    attachmentName: ''
  })

  const notificationTypes = [
    { value: 'general', label: '일반', color: 'bg-gray-100 text-gray-800' },
    { value: 'urgent', label: '긴급', color: 'bg-red-100 text-red-800' },
    { value: 'event', label: '행사', color: 'bg-blue-100 text-blue-800' },
    { value: 'homework', label: '숙제', color: 'bg-green-100 text-green-800' },
    { value: 'reminder', label: '안내', color: 'bg-yellow-100 text-yellow-800' }
  ]

  const priorities = [
    { value: 'low', label: '낮음', color: 'bg-gray-500' },
    { value: 'normal', label: '보통', color: 'bg-blue-500' },
    { value: 'high', label: '높음', color: 'bg-orange-500' },
    { value: 'urgent', label: '긴급', color: 'bg-red-500' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: '오류',
        description: '제목과 내용을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          ...formData
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: '오류',
          description: data.error || '알림 생성에 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: '성공',
        description: '알림이 생성되었습니다.'
      })

      // 폼 리셋
      setFormData({
        title: '',
        content: '',
        type: 'general',
        priority: 'normal',
        isPinned: false,
        expiresAt: '',
        attachmentUrl: '',
        attachmentName: ''
      })

      setOpen(false)
      onNotificationCreated()

    } catch (error) {
      console.error('알림 생성 실패:', error)
      toast({
        title: '오류',
        description: '알림 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const clearAttachment = () => {
    setFormData(prev => ({
      ...prev,
      attachmentUrl: '',
      attachmentName: ''
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 알림 작성
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            새 알림 작성
          </DialogTitle>
          <DialogDescription>
            학급의 모든 구성원에게 전달할 알림을 작성하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제목 */}
          <div>
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="알림 제목을 입력하세요"
              required
            />
          </div>

          {/* 분류 및 우선순위 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>분류</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {notificationTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                    className={`p-2 text-xs rounded-lg border transition-colors ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Badge className={type.color}>{type.label}</Badge>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>우선순위</Label>
              <div className="space-y-2 mt-2">
                {priorities.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: priority.value as any }))}
                    className={`w-full flex items-center gap-2 p-2 text-sm rounded border transition-colors ${
                      formData.priority === priority.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${priority.color}`} />
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 옵션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isPinned: !prev.isPinned }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  formData.isPinned
                    ? 'border-orange-300 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Pin className="h-4 w-4" />
                상단 고정
              </button>
            </div>

            <div>
              <Label htmlFor="expiresAt">만료일 (선택사항)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                만료일이 지나면 알림이 흐리게 표시됩니다.
              </p>
            </div>
          </div>

          {/* 내용 */}
          <div>
            <Label htmlFor="content">내용 *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="알림 내용을 입력하세요..."
              rows={6}
              required
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <Label>첨부파일 (선택사항)</Label>
            {formData.attachmentUrl ? (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      {formData.attachmentName || '첨부파일'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAttachment}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <Input
                    placeholder="파일 URL"
                    value={formData.attachmentUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <Input
                    placeholder="파일명 (선택사항)"
                    value={formData.attachmentName}
                    onChange={(e) => setFormData(prev => ({ ...prev, attachmentName: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Google Drive, OneDrive 등의 공유 링크를 입력하세요.
            </p>
          </div>

          {/* 미리보기 */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-sm font-medium text-gray-700 mb-2">미리보기</div>
            <div className="bg-white p-4 rounded border">
              <div className="flex items-center gap-2 mb-2">
                {formData.isPinned && <Pin className="h-4 w-4 text-orange-500" />}
                <Badge className={notificationTypes.find(t => t.value === formData.type)?.color}>
                  {notificationTypes.find(t => t.value === formData.type)?.label}
                </Badge>
                <div className={`w-2 h-2 rounded-full ${priorities.find(p => p.value === formData.priority)?.color}`} />
              </div>
              <h3 className="font-semibold">{formData.title || '제목을 입력하세요'}</h3>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">
                {formData.content || '내용을 입력하세요'}
              </p>
              {formData.attachmentUrl && (
                <div className="mt-3 p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    {formData.attachmentName || '첨부파일'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '생성 중...' : '알림 생성'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
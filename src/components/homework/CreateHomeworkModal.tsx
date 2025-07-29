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
  Calendar, 
  FileText, 
  Clock,
  Upload,
  AlertTriangle
} from 'lucide-react'

interface CreateHomeworkModalProps {
  classId: string
  onAssignmentCreated: () => void
}

export default function CreateHomeworkModal({
  classId,
  onAssignmentCreated
}: CreateHomeworkModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    dueDate: '',
    pointsPossible: 100,
    allowLateSubmission: false,
    latePenaltyPercent: 10,
    submissionFormat: 'text' as const,
    instructions: '',
    attachmentUrl: '',
    attachmentName: '',
    isPublished: true
  })

  const submissionFormats = [
    { value: 'text', label: '텍스트만', description: '텍스트로만 제출' },
    { value: 'file', label: '파일만', description: '파일로만 제출' },
    { value: 'both', label: '텍스트 + 파일', description: '텍스트와 파일 모두' }
  ]

  const subjects = [
    '국어', '영어', '수학', '과학', '사회', '도덕', '음악', '미술', '체육', '실과', '기타'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.dueDate) {
      toast({
        title: '오류',
        description: '제목, 설명, 마감일을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    // 마감일 검증
    const dueDate = new Date(formData.dueDate)
    const now = new Date()
    if (dueDate <= now) {
      toast({
        title: '오류',
        description: '마감일은 현재 시간보다 이후여야 합니다.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/homework/assignments', {
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
          description: data.error || '숙제 생성에 실패했습니다.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: '성공',
        description: '숙제가 생성되었습니다.'
      })

      // 폼 리셋
      setFormData({
        title: '',
        description: '',
        subject: '',
        dueDate: '',
        pointsPossible: 100,
        allowLateSubmission: false,
        latePenaltyPercent: 10,
        submissionFormat: 'text',
        instructions: '',
        attachmentUrl: '',
        attachmentName: '',
        isPublished: true
      })

      setOpen(false)
      onAssignmentCreated()

    } catch (error) {
      console.error('숙제 생성 실패:', error)
      toast({
        title: '오류',
        description: '숙제 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 기본 마감일 설정 (내일 23:59)
  const getDefaultDueDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59)
    return tomorrow.toISOString().slice(0, 16)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 숙제 내기
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            새 숙제 만들기
          </DialogTitle>
          <DialogDescription>
            학급 학생들에게 내어줄 숙제를 만들어보세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">숙제 제목 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="예: 2단원 연습문제 풀이"
                required
              />
            </div>

            <div>
              <Label htmlFor="subject">과목</Label>
              <select
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md"
              >
                <option value="">과목 선택</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="pointsPossible">총점</Label>
              <Input
                id="pointsPossible"
                type="number"
                min="1"
                max="1000"
                value={formData.pointsPossible}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsPossible: parseInt(e.target.value) || 100 }))}
              />
            </div>
          </div>

          {/* 마감일 */}
          <div>
            <Label htmlFor="dueDate">마감일 *</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate || getDefaultDueDate()}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              required
            />
          </div>

          {/* 제출 형식 */}
          <div>
            <Label>제출 형식</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {submissionFormats.map((format) => (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, submissionFormat: format.value as any }))}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    formData.submissionFormat === format.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{format.label}</div>
                  <div className="text-xs text-gray-500">{format.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 지각 제출 설정 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowLateSubmission"
                checked={formData.allowLateSubmission}
                onChange={(e) => setFormData(prev => ({ ...prev, allowLateSubmission: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="allowLateSubmission">지각 제출 허용</Label>
            </div>

            {formData.allowLateSubmission && (
              <div className="ml-6">
                <Label htmlFor="latePenaltyPercent">지각 제출 감점 비율 (%)</Label>
                <Input
                  id="latePenaltyPercent"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.latePenaltyPercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, latePenaltyPercent: parseInt(e.target.value) || 0 }))}
                  className="w-32"
                />
                <p className="text-xs text-gray-500 mt-1">
                  마감일 이후 제출 시 점수에서 차감될 비율
                </p>
              </div>
            )}
          </div>

          {/* 숙제 설명 */}
          <div>
            <Label htmlFor="description">숙제 설명 *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="학생들이 해야 할 과제에 대해 자세히 설명해주세요..."
              rows={4}
              required
            />
          </div>

          {/* 제출 안내 */}
          <div>
            <Label htmlFor="instructions">제출 안내 (선택사항)</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="제출 방법, 주의사항 등을 안내해주세요..."
              rows={3}
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <Label>첨부파일 (선택사항)</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <Input
                  placeholder="파일 URL (Google Drive, OneDrive 등)"
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
            <p className="text-xs text-gray-500 mt-1">
              Google Drive, OneDrive 등의 공유 링크를 입력하세요.
            </p>
          </div>

          {/* 발행 설정 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="isPublished">즉시 발행</Label>
            <p className="text-xs text-gray-500">
              체크 해제하면 임시 저장됩니다.
            </p>
          </div>

          {/* 미리보기 */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-sm font-medium text-gray-700 mb-3">미리보기</div>
            <div className="bg-white p-4 rounded border">
              <div className="flex items-center gap-2 mb-3">
                {formData.subject && (
                  <Badge variant="outline">{formData.subject}</Badge>
                )}
                <Badge className="bg-blue-100 text-blue-800">
                  <Clock className="h-3 w-3 mr-1" />
                  {formData.pointsPossible}점
                </Badge>
                {!formData.isPublished && (
                  <Badge variant="outline" className="text-orange-600">
                    임시 저장
                  </Badge>
                )}
              </div>
              
              <h3 className="font-semibold text-lg mb-2">
                {formData.title || '숙제 제목을 입력하세요'}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Calendar className="h-3 w-3" />
                마감: {formData.dueDate ? 
                  new Date(formData.dueDate).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '마감일을 설정하세요'
                }
              </div>
              
              <p className="text-gray-600 mb-3 whitespace-pre-wrap">
                {formData.description || '숙제 설명을 입력하세요'}
              </p>
              
              {formData.instructions && (
                <div className="p-3 bg-blue-50 rounded mb-3">
                  <h4 className="font-medium text-blue-800 text-sm mb-1">제출 안내</h4>
                  <p className="text-blue-700 text-sm whitespace-pre-wrap">{formData.instructions}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Upload className="h-4 w-4" />
                제출 형식: {submissionFormats.find(f => f.value === formData.submissionFormat)?.label}
                {formData.allowLateSubmission && (
                  <>
                    <span>•</span>
                    <span className="text-orange-600">
                      지각 제출 시 {formData.latePenaltyPercent}% 감점
                    </span>
                  </>
                )}
              </div>
              
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
              {loading ? '생성 중...' : '숙제 만들기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
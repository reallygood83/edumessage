'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { X, Save, Edit } from 'lucide-react'

interface HomeworkAssignment {
  id: string
  title: string
  description: string
  subject: string | null
  due_date: string
  points_possible: number
  allow_late_submission: boolean
  late_penalty_percent: number
  submission_format: 'text' | 'file' | 'both'
  instructions: string | null
  attachment_url: string | null
  attachment_name: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

interface EditHomeworkModalProps {
  homework: HomeworkAssignment
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function EditHomeworkModal({ homework, isOpen, onClose, onUpdate }: EditHomeworkModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    due_date: '',
    points_possible: 100,
    allow_late_submission: false,
    late_penalty_percent: 10,
    submission_format: 'both' as 'text' | 'file' | 'both',
    instructions: '',
    is_published: false
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (homework && isOpen) {
      setFormData({
        title: homework.title,
        description: homework.description,
        subject: homework.subject || '',
        due_date: homework.due_date.split('T')[0], // Extract date part for input[type="date"]
        points_possible: homework.points_possible,
        allow_late_submission: homework.allow_late_submission,
        late_penalty_percent: homework.late_penalty_percent,
        submission_format: homework.submission_format,
        instructions: homework.instructions || '',
        is_published: homework.is_published
      })
    }
  }, [homework, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const response = await fetch(`/api/homework/assignments/${homework.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          due_date: new Date(formData.due_date).toISOString()
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ 숙제가 성공적으로 수정되었습니다!')
        onUpdate()
        onClose()
      } else {
        alert(`❌ 오류: ${data.error}`)
      }
    } catch (error) {
      console.error('숙제 수정 실패:', error)
      alert('숙제 수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              숙제 수정
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">기본 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">숙제 제목</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="subject">과목</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {/* 제출 정보 */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">제출 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_date">마감일</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="submission_format">제출 형식</Label>
                  <select
                    id="submission_format"
                    value={formData.submission_format}
                    onChange={(e) => setFormData(prev => ({ ...prev, submission_format: e.target.value as any }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="text">텍스트만</option>
                    <option value="file">파일만</option>
                    <option value="both">텍스트 + 파일</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="points_possible">총 점수</Label>
                  <Input
                    id="points_possible"
                    type="number"
                    value={formData.points_possible}
                    onChange={(e) => setFormData(prev => ({ ...prev, points_possible: parseInt(e.target.value) }))}
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="late_penalty">지각 제출 벌점 (%)</Label>
                  <Input
                    id="late_penalty"
                    type="number"
                    value={formData.late_penalty_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, late_penalty_percent: parseInt(e.target.value) }))}
                    min="0"
                    max="100"
                    disabled={!formData.allow_late_submission}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allow_late_submission}
                    onChange={(e) => setFormData(prev => ({ ...prev, allow_late_submission: e.target.checked }))}
                  />
                  <span>지각 제출 허용</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  />
                  <span>학생에게 공개</span>
                </label>
              </div>
            </div>

            {/* 상세 지침 */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">상세 지침</h3>
              
              <div>
                <Label htmlFor="instructions">과제 지침</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  rows={4}
                  placeholder="학생들이 따라야 할 구체적인 지침을 입력하세요..."
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                취소
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? '수정 중...' : '수정하기'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'teacher' | 'student' | 'parent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'teacher' | 'student' | 'parent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'teacher' | 'student' | 'parent'
          created_at?: string
          updated_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          code: string
          teacher_id: string
          school_name: string
          grade: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string
          teacher_id: string
          school_name: string
          grade: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          teacher_id?: string
          school_name?: string
          grade?: number
          created_at?: string
          updated_at?: string
        }
      }
      class_members: {
        Row: {
          id: string
          class_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          class_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          class_id: string
          sender_id: string
          content: string
          type: 'text' | 'announcement' | 'homework' | 'question'
          is_approved: boolean
          attachments: Json[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          sender_id: string
          content: string
          type?: 'text' | 'announcement' | 'homework' | 'question'
          is_approved?: boolean
          attachments?: Json[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          sender_id?: string
          content?: string
          type?: 'text' | 'announcement' | 'homework' | 'question'
          is_approved?: boolean
          attachments?: Json[]
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          class_id: string
          teacher_id: string
          title: string
          description: string
          scheduled_at: string
          tags: string[]
          embeds: Json[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          teacher_id: string
          title: string
          description?: string
          scheduled_at: string
          tags?: string[]
          embeds?: Json[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          teacher_id?: string
          title?: string
          description?: string
          scheduled_at?: string
          tags?: string[]
          embeds?: Json[]
          created_at?: string
          updated_at?: string
        }
      }
      homework: {
        Row: {
          id: string
          class_id: string
          teacher_id: string
          title: string
          description: string
          due_date: string
          attachments: Json[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          teacher_id: string
          title: string
          description: string
          due_date: string
          attachments?: Json[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          teacher_id?: string
          title?: string
          description?: string
          due_date?: string
          attachments?: Json[]
          created_at?: string
          updated_at?: string
        }
      }
      homework_submissions: {
        Row: {
          id: string
          homework_id: string
          student_id: string
          content: string
          attachments: Json[]
          grade: number | null
          feedback: string | null
          submitted_at: string
          graded_at: string | null
        }
        Insert: {
          id?: string
          homework_id: string
          student_id: string
          content?: string
          attachments?: Json[]
          grade?: number | null
          feedback?: string | null
          submitted_at?: string
          graded_at?: string | null
        }
        Update: {
          id?: string
          homework_id?: string
          student_id?: string
          content?: string
          attachments?: Json[]
          grade?: number | null
          feedback?: string | null
          submitted_at?: string
          graded_at?: string | null
        }
      }
    }
  }
}
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attempt_answers: {
        Row: {
          answer_text: string
          attempt_id: string
          id: string
          marked_for_review: boolean
          marks_awarded: number | null
          question_id: string
          selected_option: number | null
          updated_at: string
        }
        Insert: {
          answer_text?: string
          attempt_id: string
          id?: string
          marked_for_review?: boolean
          marks_awarded?: number | null
          question_id: string
          selected_option?: number | null
          updated_at?: string
        }
        Update: {
          answer_text?: string
          attempt_id?: string
          id?: string
          marked_for_review?: boolean
          marks_awarded?: number | null
          question_id?: string
          selected_option?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          deadline: string
          exam_id: string
          id: string
          score: number
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          total_marks: number
        }
        Insert: {
          deadline: string
          exam_id: string
          id?: string
          score?: number
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          total_marks?: number
        }
        Update: {
          deadline?: string
          exam_id?: string
          id?: string
          score?: number
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          end_at: string | null
          id: string
          settings: Json
          start_at: string | null
          status: string
          subject: string
          teacher_id: string
          title: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          duration_minutes?: number
          end_at?: string | null
          id?: string
          settings?: Json
          start_at?: string | null
          status?: string
          subject: string
          teacher_id: string
          title: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          end_at?: string | null
          id?: string
          settings?: Json
          start_at?: string | null
          status?: string
          subject?: string
          teacher_id?: string
          title?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          contact_number: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          requested_role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          username: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          contact_number?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          contact_number?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          approval_status: string
          correct_answer: number
          created_at: string
          created_by: string
          difficulty: string
          exam_id: string | null
          explanation: string
          id: string
          marks: number
          model_answer: string
          options: Json
          question_text: string
          question_type: string
          topic: string
          word_limit: number | null
        }
        Insert: {
          approval_status?: string
          correct_answer: number
          created_at?: string
          created_by?: string
          difficulty?: string
          exam_id?: string | null
          explanation?: string
          id?: string
          marks?: number
          model_answer?: string
          options: Json
          question_text: string
          question_type: string
          topic?: string
          word_limit?: number | null
        }
        Update: {
          approval_status?: string
          correct_answer?: number
          created_at?: string
          created_by?: string
          difficulty?: string
          exam_id?: string | null
          explanation?: string
          id?: string
          marks?: number
          model_answer?: string
          options?: Json
          question_text?: string
          question_type?: string
          topic?: string
          word_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _finalize_attempt: { Args: { _attempt_id: string }; Returns: undefined }
      _finalize_expired: { Args: { _student: string }; Returns: undefined }
      admin_approve_teacher: { Args: { _user_id: string }; Returns: undefined }
      admin_grant_admin: { Args: { _user_id: string }; Returns: undefined }
      admin_set_account_status: {
        Args: {
          _status: Database["public"]["Enums"]["account_status"]
          _user_id: string
        }
        Returns: undefined
      }
      get_attempt: { Args: { _attempt_id: string }; Returns: Json }
      grade_short_answer: {
        Args: { _answer_id: string; _marks: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      manage_exam: {
        Args: { _action: string; _id: string }
        Returns: undefined
      }
      request_teacher_access: { Args: never; Returns: undefined }
      save_answer: {
        Args: {
          _attempt_id: string
          _question_id: string
          _review: boolean
          _selected: number
          _text: string
        }
        Returns: undefined
      }
      save_exam: {
        Args: { _exam: Json; _question_ids: string[] }
        Returns: string
      }
      staff_attempt_detail: { Args: { _attempt_id: string }; Returns: Json }
      staff_exam_attempts: { Args: { _exam_id: string }; Returns: Json }
      start_attempt: { Args: { _exam_id: string }; Returns: string }
      student_exams: { Args: never; Returns: Json }
      submit_attempt: { Args: { _attempt_id: string }; Returns: undefined }
    }
    Enums: {
      account_status: "active" | "pending" | "inactive"
      app_role: "student" | "teacher" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "pending", "inactive"],
      app_role: ["student", "teacher", "admin"],
    },
  },
} as const

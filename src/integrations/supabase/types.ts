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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      candidates: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          email: string
          id: string
          interviews: Json | null
          name: string
          notes: Json | null
          phone: string | null
          position_id: string | null
          rejection_reason: string | null
          resume_file_name: string | null
          resume_text: string | null
          resume_url: string | null
          source: string | null
          stage: string | null
          talent_pool_reason: string | null
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          email: string
          id?: string
          interviews?: Json | null
          name: string
          notes?: Json | null
          phone?: string | null
          position_id?: string | null
          rejection_reason?: string | null
          resume_file_name?: string | null
          resume_text?: string | null
          resume_url?: string | null
          source?: string | null
          stage?: string | null
          talent_pool_reason?: string | null
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          email?: string
          id?: string
          interviews?: Json | null
          name?: string
          notes?: Json | null
          phone?: string | null
          position_id?: string | null
          rejection_reason?: string | null
          resume_file_name?: string | null
          resume_text?: string | null
          resume_url?: string | null
          source?: string | null
          stage?: string | null
          talent_pool_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_candidates_position"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      google_tokens: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_positions: {
        Row: {
          benefits: string[] | null
          created_at: string
          department: string
          description: string | null
          endpoint_id: string | null
          id: string
          location: string
          n8n_webhook_path: string | null
          requirements: string[] | null
          responsibilities: string[] | null
          salary_range: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string
          department: string
          description?: string | null
          endpoint_id?: string | null
          id?: string
          location: string
          n8n_webhook_path?: string | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary_range?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          created_at?: string
          department?: string
          description?: string | null
          endpoint_id?: string | null
          id?: string
          location?: string
          n8n_webhook_path?: string | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary_range?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      metas_diarias_agg: {
        Row: {
          created_at: string | null
          data: string
          faturamento_total: number | null
          meta_faturamento: number | null
          meta_repasse: number | null
          repasse_total: number | null
          ticket_medio: number | null
          total_pedidos: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          faturamento_total?: number | null
          meta_faturamento?: number | null
          meta_repasse?: number | null
          repasse_total?: number | null
          ticket_medio?: number | null
          total_pedidos?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          faturamento_total?: number | null
          meta_faturamento?: number | null
          meta_repasse?: number | null
          repasse_total?: number | null
          ticket_medio?: number | null
          total_pedidos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      metas_diarias_time: {
        Row: {
          created_at: string | null
          data: string
          fat: number | null
          repasse: number | null
          time: string
          tm: number | null
          tt_pedidos: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          fat?: number | null
          repasse?: number | null
          time: string
          tm?: number | null
          tt_pedidos?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          fat?: number | null
          repasse?: number | null
          time?: string
          tm?: number | null
          tt_pedidos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      metas_diarias_vendedor: {
        Row: {
          created_at: string | null
          data: string
          fat: number | null
          repasse: number | null
          tm: number | null
          tt_pedidos: number | null
          updated_at: string | null
          vendedor: string
        }
        Insert: {
          created_at?: string | null
          data: string
          fat?: number | null
          repasse?: number | null
          tm?: number | null
          tt_pedidos?: number | null
          updated_at?: string | null
          vendedor: string
        }
        Update: {
          created_at?: string | null
          data?: string
          fat?: number | null
          repasse?: number | null
          tm?: number | null
          tt_pedidos?: number | null
          updated_at?: string | null
          vendedor?: string
        }
        Relationships: []
      }
      metas_jobs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          payload: Json
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id: string
          payload: Json
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          payload?: Json
          status?: string | null
        }
        Relationships: []
      }
      metas_mensais_agg: {
        Row: {
          ano: number
          faturamento_total: number | null
          lucro_bruto_total: number | null
          mes: number
          repasse_total: number | null
          taxa_total: number | null
          ticket_medio: number | null
          total_pedidos: number | null
        }
        Insert: {
          ano: number
          faturamento_total?: number | null
          lucro_bruto_total?: number | null
          mes: number
          repasse_total?: number | null
          taxa_total?: number | null
          ticket_medio?: number | null
          total_pedidos?: number | null
        }
        Update: {
          ano?: number
          faturamento_total?: number | null
          lucro_bruto_total?: number | null
          mes?: number
          repasse_total?: number | null
          taxa_total?: number | null
          ticket_medio?: number | null
          total_pedidos?: number | null
        }
        Relationships: []
      }
      metas_mensais_vendedor: {
        Row: {
          ano: number
          fat: number | null
          lb: number | null
          mes: number
          pedidos: number | null
          repasse: number | null
          taxa: number | null
          tm: number | null
          vendedor: string
        }
        Insert: {
          ano: number
          fat?: number | null
          lb?: number | null
          mes: number
          pedidos?: number | null
          repasse?: number | null
          taxa?: number | null
          tm?: number | null
          vendedor: string
        }
        Update: {
          ano?: number
          fat?: number | null
          lb?: number | null
          mes?: number
          pedidos?: number | null
          repasse?: number | null
          taxa?: number | null
          tm?: number | null
          vendedor?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
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
      has_hr_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      metas_decrement_agg: {
        Args: {
          p_ano: number
          p_mes: number
          p_rep: number
          p_tax: number
          p_val: number
        }
        Returns: undefined
      }
      metas_decrement_vend: {
        Args: {
          p_ano: number
          p_mes: number
          p_rep: number
          p_tax: number
          p_val: number
          p_vendedor: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "hr_admin" | "hr_user" | "viewer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["hr_admin", "hr_user", "viewer"],
    },
  },
} as const

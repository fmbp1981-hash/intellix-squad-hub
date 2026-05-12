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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_configs: {
        Row: {
          active: boolean
          agent_key: string | null
          created_at: string
          id: string
          llm_config_key: string
          name: string
          persona: string | null
          position_x: number
          position_y: number
          role: Database["public"]["Enums"]["agent_role"]
          show_in_office: boolean
          skill_name: string | null
          squad_id: string
          squad_name: string | null
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          agent_key?: string | null
          created_at?: string
          id?: string
          llm_config_key?: string
          name: string
          persona?: string | null
          position_x?: number
          position_y?: number
          role: Database["public"]["Enums"]["agent_role"]
          show_in_office?: boolean
          skill_name?: string | null
          squad_id: string
          squad_name?: string | null
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          agent_key?: string | null
          created_at?: string
          id?: string
          llm_config_key?: string
          name?: string
          persona?: string | null
          position_x?: number
          position_y?: number
          role?: Database["public"]["Enums"]["agent_role"]
          show_in_office?: boolean
          skill_name?: string | null
          squad_id?: string
          squad_name?: string | null
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_configs_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squad_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_configs_audit: {
        Row: {
          action: string
          agent_id: string | null
          agent_name: string | null
          created_at: string | null
          id: number
          persona_length: number | null
          source: string | null
          squad_name: string | null
        }
        Insert: {
          action: string
          agent_id?: string | null
          agent_name?: string | null
          created_at?: string | null
          id?: number
          persona_length?: number | null
          source?: string | null
          squad_name?: string | null
        }
        Update: {
          action?: string
          agent_id?: string | null
          agent_name?: string | null
          created_at?: string | null
          id?: number
          persona_length?: number | null
          source?: string | null
          squad_name?: string | null
        }
        Relationships: []
      }
      agent_prompts: {
        Row: {
          agent_key: string | null
          cost_cents: number | null
          created_at: string
          id: string
          model: string | null
          prompt: string
          response: string | null
          run_id: string | null
          step_number: number | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          agent_key?: string | null
          cost_cents?: number | null
          created_at?: string
          id?: string
          model?: string | null
          prompt: string
          response?: string | null
          run_id?: string | null
          step_number?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          agent_key?: string | null
          cost_cents?: number | null
          created_at?: string
          id?: string
          model?: string | null
          prompt?: string
          response?: string | null
          run_id?: string | null
          step_number?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      content_calendar: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          based_on_report_id: string | null
          created_at: string
          id: string
          notes_for_felipe: string | null
          posts_json: Json
          rejection_reason: string | null
          status: string
          updated_at: string
          week_start: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          based_on_report_id?: string | null
          created_at?: string
          id?: string
          notes_for_felipe?: string | null
          posts_json: Json
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          week_start: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          based_on_report_id?: string | null
          created_at?: string
          id?: string
          notes_for_felipe?: string | null
          posts_json?: Json
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_based_on_report_id_fkey"
            columns: ["based_on_report_id"]
            isOneToOne: false
            referencedRelation: "trends_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      content_drafts: {
        Row: {
          calendar_id: string
          created_at: string
          frameworks_used: Json | null
          id: string
          instagram_json: Json | null
          linkedin_json: Json | null
          open_questions: Json | null
          post_number: number
          status: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          frameworks_used?: Json | null
          id?: string
          instagram_json?: Json | null
          linkedin_json?: Json | null
          open_questions?: Json | null
          post_number: number
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          frameworks_used?: Json | null
          id?: string
          instagram_json?: Json | null
          linkedin_json?: Json | null
          open_questions?: Json | null
          post_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_drafts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "content_calendar"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_configs: {
        Row: {
          config_key: string
          cost_tier: string | null
          fallback_model: string | null
          fallback_provider: string | null
          max_tokens: number
          model: string
          notes: string | null
          provider: string
          recommended_model: string | null
          temperature: number
          updated_at: string
        }
        Insert: {
          config_key: string
          cost_tier?: string | null
          fallback_model?: string | null
          fallback_provider?: string | null
          max_tokens?: number
          model: string
          notes?: string | null
          provider: string
          recommended_model?: string | null
          temperature?: number
          updated_at?: string
        }
        Update: {
          config_key?: string
          cost_tier?: string | null
          fallback_model?: string | null
          fallback_provider?: string | null
          max_tokens?: number
          model?: string
          notes?: string | null
          provider?: string
          recommended_model?: string | null
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string | null
          channel: string
          created_at: string
          error: string | null
          id: string
          link: string | null
          priority: string
          read_at: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          category?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          link?: string | null
          priority?: string
          read_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          category?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          link?: string | null
          priority?: string
          read_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      published_posts: {
        Row: {
          channel: string
          created_at: string
          draft_id: string | null
          external_post_url: string | null
          id: string
          metrics_json: Json | null
          published_at: string | null
          scheduled_for: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          draft_id?: string | null
          external_post_url?: string | null
          id?: string
          metrics_json?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          draft_id?: string | null
          external_post_url?: string | null
          id?: string
          metrics_json?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "published_posts_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "content_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      review_results: {
        Row: {
          areas_of_excellence: Json | null
          coherence_issues_json: Json | null
          copy_issues_json: Json | null
          created_at: string
          draft_id: string | null
          id: string
          next_action: string | null
          ready_for_felipe: boolean
          review_notes: string | null
          summary_for_felipe: string | null
          verdict: string
          visual_brief_id: string | null
          visual_issues_json: Json | null
        }
        Insert: {
          areas_of_excellence?: Json | null
          coherence_issues_json?: Json | null
          copy_issues_json?: Json | null
          created_at?: string
          draft_id?: string | null
          id?: string
          next_action?: string | null
          ready_for_felipe?: boolean
          review_notes?: string | null
          summary_for_felipe?: string | null
          verdict: string
          visual_brief_id?: string | null
          visual_issues_json?: Json | null
        }
        Update: {
          areas_of_excellence?: Json | null
          coherence_issues_json?: Json | null
          copy_issues_json?: Json | null
          created_at?: string
          draft_id?: string | null
          id?: string
          next_action?: string | null
          ready_for_felipe?: boolean
          review_notes?: string | null
          summary_for_felipe?: string | null
          verdict?: string
          visual_brief_id?: string | null
          visual_issues_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "review_results_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "content_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_results_visual_brief_id_fkey"
            columns: ["visual_brief_id"]
            isOneToOne: false
            referencedRelation: "visual_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_files: {
        Row: {
          content_md: string
          created_at: string
          file_category: string
          file_path: string
          id: string
          is_always_loaded: boolean
          load_when_context: Json | null
          skill_name: string
          updated_at: string
          version: number
        }
        Insert: {
          content_md: string
          created_at?: string
          file_category: string
          file_path: string
          id?: string
          is_always_loaded?: boolean
          load_when_context?: Json | null
          skill_name: string
          updated_at?: string
          version?: number
        }
        Update: {
          content_md?: string
          created_at?: string
          file_category?: string
          file_path?: string
          id?: string
          is_always_loaded?: boolean
          load_when_context?: Json | null
          skill_name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      sprite_assets: {
        Row: {
          base64: string
          created_at: string | null
          height: number | null
          id: string
          key: string
          mime_type: string
          name: string
          width: number | null
        }
        Insert: {
          base64: string
          created_at?: string | null
          height?: number | null
          id?: string
          key: string
          mime_type?: string
          name: string
          width?: number | null
        }
        Update: {
          base64?: string
          created_at?: string | null
          height?: number | null
          id?: string
          key?: string
          mime_type?: string
          name?: string
          width?: number | null
        }
        Relationships: []
      }
      squad_configs: {
        Row: {
          active: boolean
          created_at: string
          default_llm_config: string
          department: string
          description: string | null
          id: string
          key: string
          name: string
          squad_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_llm_config?: string
          department: string
          description?: string | null
          id?: string
          key: string
          name: string
          squad_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_llm_config?: string
          department?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          squad_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_context: {
        Row: {
          content: string
          context_key: string
          id: string
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          content: string
          context_key: string
          id?: string
          title: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          content?: string
          context_key?: string
          id?: string
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      trends_reports: {
        Row: {
          created_at: string
          id: string
          items_json: Json
          run_date: string
          source_agent: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_json: Json
          run_date?: string
          source_agent?: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          items_json?: Json
          run_date?: string
          source_agent?: string
          week_start?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      visual_briefs: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          instagram_brief_json: Json | null
          linkedin_brief_json: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          instagram_brief_json?: Json | null
          linkedin_brief_json?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          instagram_brief_json?: Json | null
          linkedin_brief_json?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_briefs_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "content_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dashboard_summary: { Args: never; Returns: Json }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      restore_agent_configs: {
        Args: never
        Returns: {
          message: string
          restored_count: number
        }[]
      }
      trigger_crm_event: {
        Args: { p_event: string; p_id: string }
        Returns: undefined
      }
    }
    Enums: {
      agent_role:
        | "lead-analyst"
        | "specialist"
        | "strategist"
        | "reviewer"
        | "manager"
      internal_job_kind:
        | "daily-standup"
        | "weekly-review"
        | "on-demand-brief"
        | "incident-response"
        | "gestao"
      internal_job_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "aborted"
      notification_channel: "app" | "whatsapp" | "email"
      notification_status:
        | "pending"
        | "sent"
        | "failed"
        | "skipped"
        | "digested"
      run_step_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "skipped"
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
      agent_role: [
        "lead-analyst",
        "specialist",
        "strategist",
        "reviewer",
        "manager",
      ],
      internal_job_kind: [
        "daily-standup",
        "weekly-review",
        "on-demand-brief",
        "incident-response",
        "gestao",
      ],
      internal_job_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "aborted",
      ],
      notification_channel: ["app", "whatsapp", "email"],
      notification_status: ["pending", "sent", "failed", "skipped", "digested"],
      run_step_status: ["pending", "running", "completed", "failed", "skipped"],
    },
  },
} as const

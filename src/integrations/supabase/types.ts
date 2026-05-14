export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      competitor_profiles: {
        Row: {
          analyzed_at: string | null
          avg_engagement_rate: number | null
          dominant_format: string | null
          editorial_insights: string | null
          handle_or_url: string
          id: string
          platform: string | null
          posting_frequency: string | null
          posts_analyzed: number | null
          raw_data: Json | null
          recommended_adaptations: Json | null
        }
        Insert: {
          analyzed_at?: string | null
          avg_engagement_rate?: number | null
          dominant_format?: string | null
          editorial_insights?: string | null
          handle_or_url: string
          id?: string
          platform?: string | null
          posting_frequency?: string | null
          posts_analyzed?: number | null
          raw_data?: Json | null
          recommended_adaptations?: Json | null
        }
        Update: {
          analyzed_at?: string | null
          avg_engagement_rate?: number | null
          dominant_format?: string | null
          editorial_insights?: string | null
          handle_or_url?: string
          id?: string
          platform?: string | null
          posting_frequency?: string | null
          posts_analyzed?: number | null
          raw_data?: Json | null
          recommended_adaptations?: Json | null
        }
        Relationships: []
      }
      content_calendar: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          format: string | null
          hook_suggestion: string | null
          id: string
          notes: string | null
          pillar: string | null
          scheduled_for: string
          status: string | null
          theme: string
          trends_curated_ids: Json | null
          week_start: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          format?: string | null
          hook_suggestion?: string | null
          id?: string
          notes?: string | null
          pillar?: string | null
          scheduled_for: string
          status?: string | null
          theme: string
          trends_curated_ids?: Json | null
          week_start: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          format?: string | null
          hook_suggestion?: string | null
          id?: string
          notes?: string | null
          pillar?: string | null
          scheduled_for?: string
          status?: string | null
          theme?: string
          trends_curated_ids?: Json | null
          week_start?: string
        }
        Relationships: []
      }
      content_drafts: {
        Row: {
          calendar_id: string | null
          caption: string
          created_at: string | null
          cta: string | null
          forbidden_terms_found: string[] | null
          hashtags: string[] | null
          hook: string
          id: string
          slide_structure: Json | null
          status: string | null
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          calendar_id?: string | null
          caption: string
          created_at?: string | null
          cta?: string | null
          forbidden_terms_found?: string[] | null
          hashtags?: string[] | null
          hook: string
          id?: string
          slide_structure?: Json | null
          status?: string | null
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          calendar_id?: string | null
          caption?: string
          created_at?: string | null
          cta?: string | null
          forbidden_terms_found?: string[] | null
          hashtags?: string[] | null
          hook?: string
          id?: string
          slide_structure?: Json | null
          status?: string | null
          updated_at?: string | null
          word_count?: number | null
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
      design_dna_extracted: {
        Row: {
          avg_words_per_slide: number | null
          body_font: string | null
          brand_dark: string | null
          brand_light: string | null
          brand_primary: string | null
          competitor_profile_id: string | null
          confidence_score: number | null
          copy_framework: string | null
          created_at: string | null
          cta_slide_style: string | null
          emoji_usage: string | null
          hashtag_count: number | null
          heading_font: string | null
          hook_patterns: Json | null
          id: string
          layout_style: string | null
          notes: string | null
          text_density: string | null
          uses_face: boolean | null
          uses_illustrations: boolean | null
          uses_photography: boolean | null
        }
        Insert: {
          avg_words_per_slide?: number | null
          body_font?: string | null
          brand_dark?: string | null
          brand_light?: string | null
          brand_primary?: string | null
          competitor_profile_id?: string | null
          confidence_score?: number | null
          copy_framework?: string | null
          created_at?: string | null
          cta_slide_style?: string | null
          emoji_usage?: string | null
          hashtag_count?: number | null
          heading_font?: string | null
          hook_patterns?: Json | null
          id?: string
          layout_style?: string | null
          notes?: string | null
          text_density?: string | null
          uses_face?: boolean | null
          uses_illustrations?: boolean | null
          uses_photography?: boolean | null
        }
        Update: {
          avg_words_per_slide?: number | null
          body_font?: string | null
          brand_dark?: string | null
          brand_light?: string | null
          brand_primary?: string | null
          competitor_profile_id?: string | null
          confidence_score?: number | null
          copy_framework?: string | null
          created_at?: string | null
          cta_slide_style?: string | null
          emoji_usage?: string | null
          hashtag_count?: number | null
          heading_font?: string | null
          hook_patterns?: Json | null
          id?: string
          layout_style?: string | null
          notes?: string | null
          text_density?: string | null
          uses_face?: boolean | null
          uses_illustrations?: boolean | null
          uses_photography?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "design_dna_extracted_competitor_profile_id_fkey"
            columns: ["competitor_profile_id"]
            isOneToOne: false
            referencedRelation: "competitor_profiles"
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
          calendar_id: string | null
          comments: number | null
          draft_id: string | null
          id: string
          impressions: number | null
          instagram_url: string | null
          likes: number | null
          metrics_collected_at: string | null
          notes: string | null
          published_at: string
          reach: number | null
          reel_views: number | null
          saves: number | null
          shares: number | null
        }
        Insert: {
          calendar_id?: string | null
          comments?: number | null
          draft_id?: string | null
          id?: string
          impressions?: number | null
          instagram_url?: string | null
          likes?: number | null
          metrics_collected_at?: string | null
          notes?: string | null
          published_at?: string
          reach?: number | null
          reel_views?: number | null
          saves?: number | null
          shares?: number | null
        }
        Update: {
          calendar_id?: string | null
          comments?: number | null
          draft_id?: string | null
          id?: string
          impressions?: number | null
          instagram_url?: string | null
          likes?: number | null
          metrics_collected_at?: string | null
          notes?: string | null
          published_at?: string
          reach?: number | null
          reel_views?: number | null
          saves?: number | null
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "published_posts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "content_calendar"
            referencedColumns: ["id"]
          },
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
          checklist: Json | null
          draft_id: string | null
          id: string
          issues_found: string[] | null
          reviewed_at: string | null
          status: string
          suggestions: string | null
        }
        Insert: {
          checklist?: Json | null
          draft_id?: string | null
          id?: string
          issues_found?: string[] | null
          reviewed_at?: string | null
          status: string
          suggestions?: string | null
        }
        Update: {
          checklist?: Json | null
          draft_id?: string | null
          id?: string
          issues_found?: string[] | null
          reviewed_at?: string | null
          status?: string
          suggestions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_results_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "content_drafts"
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
      strategy_context: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
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
      trends_curated: {
        Row: {
          angulo_editorial: string | null
          batch_id: string | null
          categoria: string | null
          curated_at: string | null
          fonte: string | null
          formato_sugerido: string | null
          id: string
          is_top_5_semana: boolean | null
          is_viral_candidate: boolean | null
          potencial_engajamento: string | null
          relevancia_score: number | null
          titulo_original: string
          trends_raw_id: string | null
          url: string | null
          used_in_post: boolean | null
        }
        Insert: {
          angulo_editorial?: string | null
          batch_id?: string | null
          categoria?: string | null
          curated_at?: string | null
          fonte?: string | null
          formato_sugerido?: string | null
          id?: string
          is_top_5_semana?: boolean | null
          is_viral_candidate?: boolean | null
          potencial_engajamento?: string | null
          relevancia_score?: number | null
          titulo_original: string
          trends_raw_id?: string | null
          url?: string | null
          used_in_post?: boolean | null
        }
        Update: {
          angulo_editorial?: string | null
          batch_id?: string | null
          categoria?: string | null
          curated_at?: string | null
          fonte?: string | null
          formato_sugerido?: string | null
          id?: string
          is_top_5_semana?: boolean | null
          is_viral_candidate?: boolean | null
          potencial_engajamento?: string | null
          relevancia_score?: number | null
          titulo_original?: string
          trends_raw_id?: string | null
          url?: string | null
          used_in_post?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "trends_curated_trends_raw_id_fkey"
            columns: ["trends_raw_id"]
            isOneToOne: false
            referencedRelation: "trends_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      trends_raw: {
        Row: {
          batch_id: string
          collected_at: string | null
          content_snippet: string | null
          id: string
          published_at: string | null
          raw_metadata: Json | null
          source: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          batch_id?: string
          collected_at?: string | null
          content_snippet?: string | null
          id?: string
          published_at?: string | null
          raw_metadata?: Json | null
          source?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          batch_id?: string
          collected_at?: string | null
          content_snippet?: string | null
          id?: string
          published_at?: string | null
          raw_metadata?: Json | null
          source?: string | null
          title?: string | null
          url?: string | null
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
          accent_color: string | null
          bg_color: string | null
          canva_master_prompt: string | null
          competitor_dna_id: string | null
          cover_style: string | null
          created_at: string | null
          draft_id: string | null
          font_body: string | null
          font_heading: string | null
          id: string
          primary_color: string | null
          slide_specs: Json | null
          uses_face: boolean | null
        }
        Insert: {
          accent_color?: string | null
          bg_color?: string | null
          canva_master_prompt?: string | null
          competitor_dna_id?: string | null
          cover_style?: string | null
          created_at?: string | null
          draft_id?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          primary_color?: string | null
          slide_specs?: Json | null
          uses_face?: boolean | null
        }
        Update: {
          accent_color?: string | null
          bg_color?: string | null
          canva_master_prompt?: string | null
          competitor_dna_id?: string | null
          cover_style?: string | null
          created_at?: string | null
          draft_id?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          primary_color?: string | null
          slide_specs?: Json | null
          uses_face?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "visual_briefs_competitor_dna_id_fkey"
            columns: ["competitor_dna_id"]
            isOneToOne: false
            referencedRelation: "design_dna_extracted"
            referencedColumns: ["id"]
          },
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
        | "content-curator"
        | "intelligence-analyst"
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
        "content-curator",
        "intelligence-analyst",
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

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
          created_at: string
          id: string
          llm_config_key: string
          name: string
          persona: string | null
          position_x: number
          position_y: number
          role: Database["public"]["Enums"]["agent_role"]
          squad_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          llm_config_key?: string
          name: string
          persona?: string | null
          position_x?: number
          position_y?: number
          role: Database["public"]["Enums"]["agent_role"]
          squad_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          llm_config_key?: string
          name?: string
          persona?: string | null
          position_x?: number
          position_y?: number
          role?: Database["public"]["Enums"]["agent_role"]
          squad_id?: string
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
      run_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          priority: number
          run_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          priority?: number
          run_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          priority?: number
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_queue_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "squad_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_steps: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          cost_cents: number | null
          created_at: string
          error: string | null
          id: string
          input: Json
          latency_ms: number | null
          output_markdown: string | null
          run_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["run_step_status"]
          step_index: number
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          latency_ms?: number | null
          output_markdown?: string | null
          run_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_step_status"]
          step_index: number
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          latency_ms?: number | null
          output_markdown?: string | null
          run_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_step_status"]
          step_index?: number
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "run_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "squad_runs"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at?: string
        }
        Relationships: []
      }
      squad_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          drive_file_id: string | null
          drive_file_url: string | null
          id: string
          opensquad_run_id: string | null
          output_markdown: string | null
          phase_id: string | null
          squad_name: string
          started_at: string | null
          state_snapshot: Json | null
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          drive_file_id?: string | null
          drive_file_url?: string | null
          id?: string
          opensquad_run_id?: string | null
          output_markdown?: string | null
          phase_id?: string | null
          squad_name: string
          started_at?: string | null
          state_snapshot?: Json | null
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          drive_file_id?: string | null
          drive_file_url?: string | null
          id?: string
          opensquad_run_id?: string | null
          output_markdown?: string | null
          phase_id?: string | null
          squad_name?: string
          started_at?: string | null
          state_snapshot?: Json | null
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_runs_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "workspace_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          phases: Json
          squads: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          phases?: Json
          squads?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          phases?: Json
          squads?: Json
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
      workspace_phases: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_index: number
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_index: number
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_phases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          client_name: string
          created_at: string | null
          description: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          engagement_name: string
          id: string
          owner_id: string | null
          slug: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_name: string
          created_at?: string | null
          description?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          engagement_name: string
          id?: string
          owner_id?: string | null
          slug: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_name?: string
          created_at?: string | null
          description?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          engagement_name?: string
          id?: string
          owner_id?: string | null
          slug?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      agent_role:
        | "lead-analyst"
        | "specialist"
        | "strategist"
        | "reviewer"
        | "manager"
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
      run_step_status: ["pending", "running", "completed", "failed", "skipped"],
    },
  },
} as const

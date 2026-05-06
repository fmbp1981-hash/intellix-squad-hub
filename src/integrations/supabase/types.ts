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
        Relationships: [
          {
            foreignKeyName: "agent_prompts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "squad_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agile_projects: {
        Row: {
          ai_scrum_master: boolean | null
          client_name: string | null
          completed_points: number | null
          created_at: string
          current_velocity: number | null
          definition_of_done: string | null
          description: string | null
          engagement_id: string | null
          id: string
          name: string
          product_owner_id: string | null
          project_type: string
          sprint_duration_days: number
          status: string
          total_story_points: number | null
          updated_at: string
          velocity_baseline: number | null
          wip_limit_in_progress: number | null
          wip_limit_review: number | null
          workspace_id: string | null
        }
        Insert: {
          ai_scrum_master?: boolean | null
          client_name?: string | null
          completed_points?: number | null
          created_at?: string
          current_velocity?: number | null
          definition_of_done?: string | null
          description?: string | null
          engagement_id?: string | null
          id?: string
          name: string
          product_owner_id?: string | null
          project_type?: string
          sprint_duration_days?: number
          status?: string
          total_story_points?: number | null
          updated_at?: string
          velocity_baseline?: number | null
          wip_limit_in_progress?: number | null
          wip_limit_review?: number | null
          workspace_id?: string | null
        }
        Update: {
          ai_scrum_master?: boolean | null
          client_name?: string | null
          completed_points?: number | null
          created_at?: string
          current_velocity?: number | null
          definition_of_done?: string | null
          description?: string | null
          engagement_id?: string | null
          id?: string
          name?: string
          product_owner_id?: string | null
          project_type?: string
          sprint_duration_days?: number
          status?: string
          total_story_points?: number | null
          updated_at?: string
          velocity_baseline?: number | null
          wip_limit_in_progress?: number | null
          wip_limit_review?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agile_projects_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agile_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          diff: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          diff?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          diff?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      briefings: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          source: string | null
          title: string
          workspace_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          source?: string | null
          title: string
          workspace_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          source?: string | null
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_cnpj: string | null
          client_name: string
          created_at: string
          deal_id: string | null
          end_date: string | null
          id: string
          payment_terms: Json
          scope_md: string
          signed_at: string | null
          start_date: string
          status: string
          total_value: number
          updated_at: string
        }
        Insert: {
          client_cnpj?: string | null
          client_name: string
          created_at?: string
          deal_id?: string | null
          end_date?: string | null
          id?: string
          payment_terms?: Json
          scope_md: string
          signed_at?: string | null
          start_date: string
          status?: string
          total_value: number
          updated_at?: string
        }
        Update: {
          client_cnpj?: string | null
          client_name?: string
          created_at?: string
          deal_id?: string | null
          end_date?: string | null
          id?: string
          payment_terms?: Json
          scope_md?: string
          signed_at?: string | null
          start_date?: string
          status?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          company_name: string
          created_at: string
          expected_close: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          pricing_model: string | null
          probability: number | null
          proposal_url: string | null
          scope_summary: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          company_name: string
          created_at?: string
          expected_close?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          pricing_model?: string | null
          probability?: number | null
          proposal_url?: string | null
          scope_summary: string
          status?: string
          updated_at?: string
          value: number
        }
        Update: {
          company_name?: string
          created_at?: string
          expected_close?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          pricing_model?: string | null
          probability?: number | null
          proposal_url?: string | null
          scope_summary?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      directives: {
        Row: {
          active: boolean
          body: string
          created_at: string
          department: string | null
          id: string
          issued_by: string | null
          squad_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          department?: string | null
          id?: string
          issued_by?: string | null
          squad_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          department?: string | null
          id?: string
          issued_by?: string | null
          squad_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      engagement_plans: {
        Row: {
          auto_advance: boolean
          completed_squads: Json
          created_at: string
          current_squad: string | null
          id: string
          squads_ordered: Json
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          auto_advance?: boolean
          completed_squads?: Json
          created_at?: string
          current_squad?: string | null
          id?: string
          squads_ordered?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          auto_advance?: boolean
          completed_squads?: Json
          created_at?: string
          current_squad?: string | null
          id?: string
          squads_ordered?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          blocker_note: string | null
          contract_id: string | null
          created_at: string
          end_date: string | null
          health: string
          id: string
          name: string
          start_date: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          blocker_note?: string | null
          contract_id?: string | null
          created_at?: string
          end_date?: string | null
          health?: string
          id?: string
          name: string
          start_date: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          blocker_note?: string | null
          contract_id?: string | null
          created_at?: string
          end_date?: string | null
          health?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      epics: {
        Row: {
          acceptance_criteria: string | null
          business_value: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          moscow: string | null
          okr_id: string | null
          priority: number | null
          project_id: string
          squad_run_id: string | null
          status: string
          story_points_completed: number | null
          story_points_estimated: number | null
          title: string
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          business_value?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          moscow?: string | null
          okr_id?: string | null
          priority?: number | null
          project_id: string
          squad_run_id?: string | null
          status?: string
          story_points_completed?: number | null
          story_points_estimated?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          business_value?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          moscow?: string | null
          okr_id?: string | null
          priority?: number | null
          project_id?: string
          squad_run_id?: string | null
          status?: string
          story_points_completed?: number | null
          story_points_estimated?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epics_okr_id_fkey"
            columns: ["okr_id"]
            isOneToOne: false
            referencedRelation: "okrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "agile_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epics_squad_run_id_fkey"
            columns: ["squad_run_id"]
            isOneToOne: false
            referencedRelation: "squad_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      gestao_briefings: {
        Row: {
          content_markdown: string
          created_at: string
          directives_json: Json
          id: string
          insights: Json
          job_id: string | null
          recommendations: Json
          trigger_question: string | null
          triggered_by: string
          type: string
        }
        Insert: {
          content_markdown: string
          created_at?: string
          directives_json?: Json
          id?: string
          insights?: Json
          job_id?: string | null
          recommendations?: Json
          trigger_question?: string | null
          triggered_by?: string
          type: string
        }
        Update: {
          content_markdown?: string
          created_at?: string
          directives_json?: Json
          id?: string
          insights?: Json
          job_id?: string | null
          recommendations?: Json
          trigger_question?: string | null
          triggered_by?: string
          type?: string
        }
        Relationships: []
      }
      gestao_directives: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          briefing_id: string | null
          cancelled_reason: string | null
          completed_at: string | null
          created_at: string
          dispatched_at: string | null
          dispatched_job_id: string | null
          id: string
          job_id: string
          job_input: Json
          okr_id: string | null
          priority: string
          rationale: string | null
          status: string
          target_department: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          briefing_id?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          dispatched_at?: string | null
          dispatched_job_id?: string | null
          id?: string
          job_id: string
          job_input?: Json
          okr_id?: string | null
          priority?: string
          rationale?: string | null
          status?: string
          target_department: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          briefing_id?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          dispatched_at?: string | null
          dispatched_job_id?: string | null
          id?: string
          job_id?: string
          job_input?: Json
          okr_id?: string | null
          priority?: string
          rationale?: string | null
          status?: string
          target_department?: string
        }
        Relationships: [
          {
            foreignKeyName: "gestao_directives_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "gestao_briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestao_directives_okr_id_fkey"
            columns: ["okr_id"]
            isOneToOne: false
            referencedRelation: "okrs"
            referencedColumns: ["id"]
          },
        ]
      }
      impediments: {
        Row: {
          ai_suggested_resolution: string | null
          created_at: string
          description: string | null
          id: string
          impact: string
          project_id: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          sprint_id: string | null
          status: string
          story_id: string | null
          title: string
        }
        Insert: {
          ai_suggested_resolution?: string | null
          created_at?: string
          description?: string | null
          id?: string
          impact: string
          project_id: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sprint_id?: string | null
          status?: string
          story_id?: string | null
          title: string
        }
        Update: {
          ai_suggested_resolution?: string | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string
          project_id?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sprint_id?: string | null
          status?: string
          story_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "impediments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "agile_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impediments_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impediments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          department: string | null
          estimated_tokens: number | null
          id: string
          job_id: string | null
          job_input: Json
          kind: Database["public"]["Enums"]["internal_job_kind"]
          output_markdown: string | null
          parent_directive_id: string | null
          payload: Json
          scheduled_for: string | null
          sla_deadline: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["internal_job_status"]
          trigger_source: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          estimated_tokens?: number | null
          id?: string
          job_id?: string | null
          job_input?: Json
          kind: Database["public"]["Enums"]["internal_job_kind"]
          output_markdown?: string | null
          parent_directive_id?: string | null
          payload?: Json
          scheduled_for?: string | null
          sla_deadline?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["internal_job_status"]
          trigger_source?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          estimated_tokens?: number | null
          id?: string
          job_id?: string | null
          job_input?: Json
          kind?: Database["public"]["Enums"]["internal_job_kind"]
          output_markdown?: string | null
          parent_directive_id?: string | null
          payload?: Json
          scheduled_for?: string | null
          sla_deadline?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["internal_job_status"]
          trigger_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_jobs_parent_directive_id_fkey"
            columns: ["parent_directive_id"]
            isOneToOne: false
            referencedRelation: "gestao_directives"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          due_date: string
          id: string
          issue_date: string
          milestone: string | null
          number: string
          paid_at: string | null
          status: string
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          issue_date: string
          milestone?: string | null
          number: string
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          issue_date?: string
          milestone?: string | null
          number?: string
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          geography: string | null
          id: string
          last_contact_at: string | null
          notes: string | null
          score: number | null
          score_reasons: Json
          segment: string | null
          source: string
          status: string
          ticket_estimate: number | null
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          geography?: string | null
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          score?: number | null
          score_reasons?: Json
          segment?: string | null
          source: string
          status?: string
          ticket_estimate?: number | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          geography?: string | null
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          score?: number | null
          score_reasons?: Json
          segment?: string | null
          source?: string
          status?: string
          ticket_estimate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      llm_configs: {
        Row: {
          config_key: string
          fallback_model: string | null
          fallback_provider: string | null
          max_tokens: number
          model: string
          notes: string | null
          provider: string
          temperature: number
          updated_at: string
        }
        Insert: {
          config_key: string
          fallback_model?: string | null
          fallback_provider?: string | null
          max_tokens?: number
          model: string
          notes?: string | null
          provider: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          config_key?: string
          fallback_model?: string | null
          fallback_provider?: string | null
          max_tokens?: number
          model?: string
          notes?: string | null
          provider?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          categories: Json
          channels: Json
          created_at: string
          digest_interval_minutes: number
          digest_mode: boolean
          id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: Json
          channels?: Json
          created_at?: string
          digest_interval_minutes?: number
          digest_mode?: boolean
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: Json
          channels?: Json
          created_at?: string
          digest_interval_minutes?: number
          digest_mode?: boolean
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error: string | null
          id: string
          link: string | null
          priority: string
          read_at: string | null
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error?: string | null
          id?: string
          link?: string | null
          priority?: string
          read_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error?: string | null
          id?: string
          link?: string | null
          priority?: string
          read_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      okrs: {
        Row: {
          active: boolean
          created_at: string
          current_value: number | null
          department: string
          id: string
          key_result: string | null
          key_results: Json
          metric_unit: string | null
          objective: string
          owner_id: string | null
          progress: number
          quarter: string
          status: string
          target_value: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_value?: number | null
          department: string
          id?: string
          key_result?: string | null
          key_results?: Json
          metric_unit?: string | null
          objective: string
          owner_id?: string | null
          progress?: number
          quarter: string
          status?: string
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_value?: number | null
          department?: string
          id?: string
          key_result?: string | null
          key_results?: Json
          metric_unit?: string | null
          objective?: string
          owner_id?: string | null
          progress?: number
          quarter?: string
          status?: string
          target_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_step_outputs: {
        Row: {
          agent_key: string | null
          agent_name: string | null
          cost_cents: number | null
          created_at: string
          duration_ms: number | null
          id: string
          output_markdown: string | null
          run_id: string | null
          status: string
          step_number: number
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          agent_key?: string | null
          agent_name?: string | null
          cost_cents?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          output_markdown?: string | null
          run_id?: string | null
          status?: string
          step_number: number
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          agent_key?: string | null
          agent_name?: string | null
          cost_cents?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          output_markdown?: string | null
          run_id?: string | null
          status?: string
          step_number?: number
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_step_outputs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "squad_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      release_plans: {
        Row: {
          created_at: string
          description: string | null
          epics_included: string[] | null
          id: string
          project_id: string
          release_notes: string | null
          status: string
          target_date: string | null
          total_points: number | null
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          epics_included?: string[] | null
          id?: string
          project_id: string
          release_notes?: string | null
          status?: string
          target_date?: string | null
          total_points?: number | null
          version: string
        }
        Update: {
          created_at?: string
          description?: string | null
          epics_included?: string[] | null
          id?: string
          project_id?: string
          release_notes?: string | null
          status?: string
          target_date?: string | null
          total_points?: number | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "agile_projects"
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
      sprint_metrics: {
        Row: {
          avg_cycle_time_days: number | null
          completed_points: number
          created_at: string
          id: string
          ideal_remaining: number
          project_id: string
          recorded_date: string
          remaining_points: number
          sprint_id: string
          total_scope: number
          wip_count: number | null
        }
        Insert: {
          avg_cycle_time_days?: number | null
          completed_points: number
          created_at?: string
          id?: string
          ideal_remaining: number
          project_id: string
          recorded_date: string
          remaining_points: number
          sprint_id: string
          total_scope: number
          wip_count?: number | null
        }
        Update: {
          avg_cycle_time_days?: number | null
          completed_points?: number
          created_at?: string
          id?: string
          ideal_remaining?: number
          project_id?: string
          recorded_date?: string
          remaining_points?: number
          sprint_id?: string
          total_scope?: number
          wip_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "agile_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_metrics_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          added_points: number | null
          committed_points: number | null
          completed_points: number | null
          created_at: string
          end_date: string
          goal: string
          id: string
          name: string | null
          number: number
          planning_done: boolean | null
          planning_notes: string | null
          project_id: string
          removed_points: number | null
          retro_actions: Json | null
          retrospective_done: boolean | null
          retrospective_notes: string | null
          review_done: boolean | null
          review_notes: string | null
          start_date: string
          status: string
          updated_at: string
          velocity: number | null
        }
        Insert: {
          added_points?: number | null
          committed_points?: number | null
          completed_points?: number | null
          created_at?: string
          end_date: string
          goal: string
          id?: string
          name?: string | null
          number: number
          planning_done?: boolean | null
          planning_notes?: string | null
          project_id: string
          removed_points?: number | null
          retro_actions?: Json | null
          retrospective_done?: boolean | null
          retrospective_notes?: string | null
          review_done?: boolean | null
          review_notes?: string | null
          start_date: string
          status?: string
          updated_at?: string
          velocity?: number | null
        }
        Update: {
          added_points?: number | null
          committed_points?: number | null
          completed_points?: number | null
          created_at?: string
          end_date?: string
          goal?: string
          id?: string
          name?: string | null
          number?: number
          planning_done?: boolean | null
          planning_notes?: string | null
          project_id?: string
          removed_points?: number | null
          retro_actions?: Json | null
          retrospective_done?: boolean | null
          retrospective_notes?: string | null
          review_done?: boolean | null
          review_notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          velocity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "agile_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_checkpoints: {
        Row: {
          context_md: string | null
          created_at: string
          id: string
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          run_id: string | null
          status: string
          step_number: number
        }
        Insert: {
          context_md?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string | null
          status?: string
          step_number: number
        }
        Update: {
          context_md?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string | null
          status?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "squad_checkpoints_run_id_fkey"
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
      tasks: {
        Row: {
          actual_hours: number | null
          assignee: string | null
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          status: string
          story_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assignee?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          status?: string
          story_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assignee?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          status?: string
          story_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
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
      token_usage: {
        Row: {
          budget_usd: number | null
          id: string
          period_month: string
          scope: string
          total_cost_usd: number
          total_tokens: number
          updated_at: string
        }
        Insert: {
          budget_usd?: number | null
          id?: string
          period_month: string
          scope: string
          total_cost_usd?: number
          total_tokens?: number
          updated_at?: string
        }
        Update: {
          budget_usd?: number | null
          id?: string
          period_month?: string
          scope?: string
          total_cost_usd?: number
          total_tokens?: number
          updated_at?: string
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
      user_stories: {
        Row: {
          acceptance_criteria: string
          accepted_at: string | null
          action: string
          assignee_department: string | null
          benefit: string
          blocked: boolean | null
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          epic_id: string | null
          id: string
          invest_estimable: boolean | null
          invest_independent: boolean | null
          invest_negotiable: boolean | null
          invest_small: boolean | null
          invest_testable: boolean | null
          invest_valuable: boolean | null
          moscow: string | null
          persona: string
          priority: number | null
          project_id: string
          sprint_id: string | null
          started_at: string | null
          status: string
          story_points: number | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string
          accepted_at?: string | null
          action: string
          assignee_department?: string | null
          benefit: string
          blocked?: boolean | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          epic_id?: string | null
          id?: string
          invest_estimable?: boolean | null
          invest_independent?: boolean | null
          invest_negotiable?: boolean | null
          invest_small?: boolean | null
          invest_testable?: boolean | null
          invest_valuable?: boolean | null
          moscow?: string | null
          persona: string
          priority?: number | null
          project_id: string
          sprint_id?: string | null
          started_at?: string | null
          status?: string
          story_points?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string
          accepted_at?: string | null
          action?: string
          assignee_department?: string | null
          benefit?: string
          blocked?: boolean | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          epic_id?: string | null
          id?: string
          invest_estimable?: boolean | null
          invest_independent?: boolean | null
          invest_negotiable?: boolean | null
          invest_small?: boolean | null
          invest_testable?: boolean | null
          invest_valuable?: boolean | null
          moscow?: string | null
          persona?: string
          priority?: number | null
          project_id?: string
          sprint_id?: string | null
          started_at?: string | null
          status?: string
          story_points?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_story_sprint"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "agile_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      velocity_history: {
        Row: {
          committed: number
          completed: number
          created_at: string
          id: string
          project_id: string
          sprint_id: string
          sprint_number: number
          velocity: number
        }
        Insert: {
          committed: number
          completed: number
          created_at?: string
          id?: string
          project_id: string
          sprint_id: string
          sprint_number: number
          velocity: number
        }
        Update: {
          committed?: number
          completed?: number
          created_at?: string
          id?: string
          project_id?: string
          sprint_id?: string
          sprint_number?: number
          velocity?: number
        }
        Relationships: [
          {
            foreignKeyName: "velocity_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "agile_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "velocity_history_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_configs: {
        Row: {
          active: boolean
          admin_number: string
          created_at: string
          id: string
          instance_name: string | null
          instance_token: string
          instance_url: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          admin_number: string
          created_at?: string
          id?: string
          instance_name?: string | null
          instance_token: string
          instance_url: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          admin_number?: string
          created_at?: string
          id?: string
          instance_name?: string | null
          instance_token?: string
          instance_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      workspace_contexts: {
        Row: {
          content: string
          context_type: string
          created_at: string
          id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          content?: string
          context_type: string
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          content?: string
          context_type?: string
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_contexts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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

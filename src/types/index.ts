export type UserRole = 'admin' | 'analyst' | 'viewer';

export type AgentStatus = 'idle' | 'working' | 'done' | 'checkpoint' | 'delivering';
export type SquadStatus = 'idle' | 'running' | 'completed' | 'failed';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type PhaseStatus = 'pending' | 'active' | 'completed';

export interface AgentState {
  id: string;
  name: string;
  icon: string;
  status: AgentStatus;
  desk: { col: number; row: number };
  gender: 'male' | 'female';
}

export interface HandoffInfo {
  from: string;
  to: string;
  message: string;
  completedAt: string;
}

export interface SquadState {
  squad: string;
  status: SquadStatus;
  step: { current: number; total: number; label: string };
  agents: AgentState[];
  handoff?: HandoffInfo;
  startedAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  phases: string[];
  squads: string[];
  created_at: string;
}

export interface Workspace {
  id: string;
  slug: string;
  client_name: string;
  engagement_name: string;
  description: string | null;
  template_id: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePhase {
  id: string;
  workspace_id: string;
  name: string;
  order_index: number;
  status: PhaseStatus;
  created_at: string;
}

export interface SquadRun {
  id: string;
  workspace_id: string;
  phase_id: string | null;
  squad_name: string;
  status: RunStatus;
  state_snapshot: SquadState | null;
  opensquad_run_id: string | null;
  output_markdown: string | null;
  drive_file_id: string | null;
  drive_file_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
}

export const AVAILABLE_SQUADS = [
  { id: 'rh',         label: 'Recursos Humanos', icon: '👥', color: '#7c3aed' },
  { id: 'financeiro', label: 'Financeiro',        icon: '💰', color: '#06b6d4' },
  { id: 'comercial',  label: 'Comercial',         icon: '📈', color: '#10b981' },
  { id: 'operacoes',  label: 'Operações',         icon: '⚙️', color: '#f59e0b' },
  { id: 'ti',         label: 'Tecnologia',        icon: '💻', color: '#ec4899' },
  { id: 'marketing',  label: 'Marketing',         icon: '📣', color: '#f97316' },
] as const;

export type SquadId = typeof AVAILABLE_SQUADS[number]['id'];

// ===== CRM Types =====
export type LeadStatus = 'new' | 'contacted' | 'qualifying' | 'qualified' | 'disqualified' | 'converted';
export type DealStatus = 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'stalled';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'active' | 'completed' | 'cancelled';
export type InvoiceStatus = 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type EngagementHealth = 'green' | 'yellow' | 'red';
export type EngagementStatus = 'planning' | 'active' | 'blocked' | 'completed' | 'cancelled';
export type Department = 'gestao' | 'comercial' | 'marketing' | 'financeiro' | 'operacoes' | 'ti';

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: string;
  segment: string | null;
  geography: string | null;
  ticket_estimate: number | null;
  status: LeadStatus;
  score: number | null;
  score_reasons: string[];
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  lead_id: string | null;
  company_name: string;
  scope_summary: string;
  pricing_model: string | null;
  value: number;
  probability: number | null;
  expected_close: string | null;
  status: DealStatus;
  lost_reason: string | null;
  proposal_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTerm { milestone: string; amount: number; due_days: number }

export interface Contract {
  id: string;
  deal_id: string | null;
  client_name: string;
  client_cnpj: string | null;
  scope_md: string;
  total_value: number;
  payment_terms: PaymentTerm[];
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  contract_id: string | null;
  number: string;
  amount: number;
  milestone: string | null;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  status: InvoiceStatus;
  created_at: string;
}

export interface Engagement {
  id: string;
  contract_id: string | null;
  workspace_id: string | null;
  name: string;
  start_date: string;
  end_date: string | null;
  status: EngagementStatus;
  blocker_note: string | null;
  health: EngagementHealth;
  created_at: string;
  updated_at: string;
}

export interface OKR {
  id: string;
  quarter: string;
  department: string;
  objective: string;
  key_result: string | null;
  metric_unit: string | null;
  target_value: number | null;
  current_value: number | null;
  status: 'on_track' | 'at_risk' | 'off_track' | 'completed';
  active: boolean;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface GestaoBriefing {
  id: string;
  type: 'daily_standup' | 'on_demand' | 'incident_response' | 'weekly_review';
  triggered_by: 'schedule' | 'felipe' | 'auto';
  trigger_question: string | null;
  job_id: string | null;
  content_markdown: string;
  insights: string[];
  recommendations: string[];
  directives_json: unknown[];
  created_at: string;
}

export interface GestaoDirective {
  id: string;
  briefing_id: string | null;
  target_department: Department;
  job_id: string;
  job_input: Record<string, unknown>;
  rationale: string | null;
  priority: 'critical' | 'high' | 'normal' | 'low';
  okr_id: string | null;
  status: 'pending' | 'approved' | 'dispatched' | 'completed' | 'cancelled' | 'rejected';
  cancelled_reason: string | null;
  approved_by: string | null;
  dispatched_job_id: string | null;
  created_at: string;
  approved_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
}

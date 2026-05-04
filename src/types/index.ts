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

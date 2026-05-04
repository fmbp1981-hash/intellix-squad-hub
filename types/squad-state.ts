export interface Agent {
  id: string
  name: string
  icon: string
  status: 'idle' | 'working' | 'done' | 'checkpoint' | 'delivering'
  desk: { col: number; row: number }
  gender?: 'male' | 'female'
}

export interface SquadState {
  squad: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  step: { current: number; total: number; label: string }
  agents: Agent[]
  handoff: {
    from: string
    to: string
    message: string
    completedAt: string
  } | null
  startedAt: string | null
  updatedAt: string
  completedAt?: string
}

export type WsMessage =
  | { type: 'SNAPSHOT'; squads: string[]; activeStates: Record<string, SquadState> }
  | { type: 'SQUAD_UPDATE'; squad: string; state: SquadState }
  | { type: 'SQUAD_INACTIVE'; squad: string }

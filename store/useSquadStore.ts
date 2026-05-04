import { create } from 'zustand'
import type { SquadState } from '@/types/squad-state'

interface SquadStore {
  connected: boolean
  squads: string[]
  activeStates: Record<string, SquadState>
  setConnected: (v: boolean) => void
  setSnapshot: (squads: string[], activeStates: Record<string, SquadState>) => void
  updateSquadState: (squad: string, state: SquadState) => void
  setSquadInactive: (squad: string) => void
}

export const useSquadStore = create<SquadStore>((set) => ({
  connected: false,
  squads: [],
  activeStates: {},
  setConnected: (connected) => set({ connected }),
  setSnapshot: (squads, activeStates) => set({ squads, activeStates }),
  updateSquadState: (squad, state) =>
    set(s => ({ activeStates: { ...s.activeStates, [squad]: state } })),
  setSquadInactive: (squad) =>
    set(s => {
      const next = { ...s.activeStates }
      delete next[squad]
      return { activeStates: next, squads: s.squads.filter(q => q !== squad) }
    }),
}))

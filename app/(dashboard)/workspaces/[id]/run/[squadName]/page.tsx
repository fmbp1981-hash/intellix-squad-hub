'use client'
import { useSquadSocket } from '@/hooks/useSquadSocket'
import { useSquadStore } from '@/store/useSquadStore'
import { OfficeViewerDynamic } from '@/components/office/OfficeViewerDynamic'
import { Badge } from '@/components/ui/badge'
import { use } from 'react'

interface Props {
  params: Promise<{ id: string; squadName: string }>
}

export default function RunPage({ params }: Props) {
  const { id: workspaceId, squadName } = use(params)
  useSquadSocket(workspaceId)

  const state = useSquadStore(s => s.activeStates[squadName])
  const connected = useSquadStore(s => s.connected)

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-white capitalize">{squadName}</h1>
        <Badge variant={connected ? 'default' : 'secondary'} className={connected ? 'bg-green-600' : ''}>
          {connected ? 'Conectado' : 'Reconectando...'}
        </Badge>
        {state && (
          <span className="text-gray-400 text-sm">
            Step {state.step.current}/{state.step.total} — {state.step.label}
          </span>
        )}
      </div>
      <div className="flex-1">
        <OfficeViewerDynamic squadName={squadName} />
      </div>
      {state?.handoff && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-gray-300">
          <span className="text-gray-500">Handoff: </span>
          {state.handoff.message}
        </div>
      )}
    </div>
  )
}

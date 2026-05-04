import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Run {
  id: string
  squadName: string
  status: string
  startedAt: string | null
  completedAt: string | null
  driveFileUrl: string | null
}

interface RunHistoryProps {
  runs: Run[]
  workspaceId: string
}

const statusColor = (s: string) => ({
  running: 'bg-yellow-600', completed: 'bg-green-600',
  failed: 'bg-red-600', pending: 'bg-gray-600',
}[s] ?? 'bg-gray-600')

export function RunHistory({ runs, workspaceId }: RunHistoryProps) {
  return (
    <div className="space-y-2">
      {runs.map(run => (
        <div key={run.id} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg p-3">
          <Badge className={`${statusColor(run.status)} text-xs capitalize min-w-20 justify-center`}>
            {run.status}
          </Badge>
          <span className="text-white font-medium capitalize">{run.squadName}</span>
          <span className="text-gray-500 text-sm ml-auto">
            {run.startedAt ? new Date(run.startedAt).toLocaleString('pt-BR') : '—'}
          </span>
          <Link href={`/workspaces/${workspaceId}/runs/${run.id}`}
            className="text-blue-400 text-sm hover:underline">
            Ver output
          </Link>
          {run.driveFileUrl && (
            <a href={run.driveFileUrl} target="_blank" rel="noopener noreferrer"
              className="text-green-400 text-sm hover:underline">
              Drive
            </a>
          )}
        </div>
      ))}
      {runs.length === 0 && (
        <p className="text-gray-500 text-sm py-8 text-center">Nenhum run ainda.</p>
      )}
    </div>
  )
}

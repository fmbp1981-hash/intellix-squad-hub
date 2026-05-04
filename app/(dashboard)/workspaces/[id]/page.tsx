import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RunHistory } from '@/components/workspace/RunHistory'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces').select('*').eq('id', id).single()

  if (!workspace) notFound()

  const { data: runs } = await supabase
    .from('squad_runs')
    .select('id, squad_name, status, started_at, completed_at, drive_file_url')
    .eq('workspace_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{workspace.client_name}</h1>
          <p className="text-gray-400">{workspace.engagement_name}</p>
          {workspace.drive_folder_url && (
            <a href={workspace.drive_folder_url} target="_blank" rel="noopener noreferrer"
              className="text-green-400 text-sm hover:underline">
              Pasta no Drive →
            </a>
          )}
        </div>
        <Button asChild>
          <Link href={`/workspaces/${id}/run/rh`}>Rodar Squad</Link>
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-medium text-white mb-3">Runs Recentes</h2>
        <RunHistory
          runs={runs?.map(r => ({
            id: r.id, squadName: r.squad_name, status: r.status,
            startedAt: r.started_at, completedAt: r.completed_at,
            driveFileUrl: r.drive_file_url,
          })) ?? []}
          workspaceId={id}
        />
        <Link href={`/workspaces/${id}/runs`} className="text-blue-400 text-sm hover:underline">
          Ver histórico completo →
        </Link>
      </div>
    </div>
  )
}

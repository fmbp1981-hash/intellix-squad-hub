import { createClient } from '@/lib/supabase/server'
import { RunHistory } from '@/components/workspace/RunHistory'

export default async function RunsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: runs } = await supabase
    .from('squad_runs')
    .select('id, squad_name, status, started_at, completed_at, drive_file_url')
    .eq('workspace_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Histórico de Runs</h2>
      <RunHistory
        runs={runs?.map(r => ({
          id: r.id, squadName: r.squad_name, status: r.status,
          startedAt: r.started_at, completedAt: r.completed_at,
          driveFileUrl: r.drive_file_url,
        })) ?? []}
        workspaceId={id}
      />
    </div>
  )
}

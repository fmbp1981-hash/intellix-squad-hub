import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runSquad, getWorkspaceDir } from '@/lib/execution/squad-runner'
import { watchSquadState } from '@/lib/execution/state-watcher'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; squadName: string }> }
) {
  const { workspaceId, squadName } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('slug')
    .eq('id', workspaceId)
    .single()

  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const { data: run } = await supabase.from('squad_runs').insert({
    workspace_id: workspaceId,
    squad_name: squadName,
    status: 'running',
    started_at: new Date().toISOString(),
  }).select().single()

  const workspaceDir = getWorkspaceDir(workspace.slug)

  watchSquadState(
    workspaceDir,
    workspaceId,
    squadName,
    async (_wid, _squad, state) => {
      await supabase.from('squad_runs')
        .update({ state_snapshot: state as unknown as Record<string, unknown> })
        .eq('id', run!.id)
    },
    async (_wid, _squad, _runId) => {
      await supabase.from('squad_runs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', run!.id)

      void fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/export/${run!.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, workspaceSlug: workspace.slug, squadName }),
      })
    }
  )

  void runSquad(workspaceDir, squadName).then(async ({ exitCode }) => {
    if (exitCode !== 0) {
      await supabase.from('squad_runs')
        .update({ status: 'failed' })
        .eq('id', run!.id)
    }
  })

  return NextResponse.json({ runId: run!.id, status: 'running' })
}

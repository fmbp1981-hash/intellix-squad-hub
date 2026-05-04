import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const supabase = await createClient()

  const { data: runs } = await supabase
    .from('squad_runs')
    .select('squad_name, state_snapshot, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'running')

  const activeStates: Record<string, unknown> = {}
  runs?.forEach(r => {
    if (r.state_snapshot) activeStates[r.squad_name] = r.state_snapshot
  })

  return NextResponse.json({
    type: 'SNAPSHOT',
    squads: Object.keys(activeStates),
    activeStates,
  })
}

import { createClient } from '@/lib/supabase/server'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function WorkspacesPage() {
  const supabase = await createClient()
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*, squad_runs(id, status)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Workspaces</h1>
        <Button asChild><Link href="/workspaces/new">+ Novo Workspace</Link></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces?.map(ws => (
          <WorkspaceCard
            key={ws.id}
            id={ws.id}
            clientName={ws.client_name}
            engagementName={ws.engagement_name}
            description={ws.description}
            activeRuns={ws.squad_runs?.filter((r: { status: string }) => r.status === 'running').length ?? 0}
          />
        ))}
        {(!workspaces || workspaces.length === 0) && (
          <p className="text-gray-500 col-span-3 py-12 text-center">
            Nenhum workspace ainda. <Link href="/workspaces/new" className="text-blue-400 underline">Criar o primeiro</Link>
          </p>
        )}
      </div>
    </div>
  )
}

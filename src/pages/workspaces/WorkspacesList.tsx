import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderPlus, Plus } from 'lucide-react';
import { IntelliXBrand } from "@/components/brand/IntelliXBrand";

import { Button } from '@/components/ui/button';
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard';
import { WorkspaceCardSkeleton } from '@/components/workspace/WorkspaceCardSkeleton';
import {
  getRunsSummaryByWorkspaces,
  getWorkspaces,
} from '@/lib/supabase/workspaces';

export default function WorkspacesList() {
  const workspacesQ = useQuery({ queryKey: ['workspaces'], queryFn: getWorkspaces });

  const ids = workspacesQ.data?.map((w) => w.id) ?? [];
  const summariesQ = useQuery({
    queryKey: ['workspaces', 'runs-summary', ids],
    queryFn: () => getRunsSummaryByWorkspaces(ids),
    enabled: ids.length > 0,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Engagements ativos e concluídos da <IntelliXBrand />.
          </p>
        </div>
        <Button asChild className="bg-gradient-brand text-primary-foreground hover:opacity-90">
          <Link to="/workspaces/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Novo Workspace
          </Link>
        </Button>
      </header>

      {workspacesQ.isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <WorkspaceCardSkeleton />
          <WorkspaceCardSkeleton />
          <WorkspaceCardSkeleton />
        </div>
      )}

      {workspacesQ.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar workspaces. Verifique a conexão com o Supabase.
        </div>
      )}

      {workspacesQ.data && workspacesQ.data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand-soft">
            <FolderPlus className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Nenhum workspace ainda
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Crie o primeiro engagement para começar a rodar squads e gerar relatórios.
          </p>
          <Button
            asChild
            className="mt-5 bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            <Link to="/workspaces/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Criar primeiro workspace
            </Link>
          </Button>
        </div>
      )}

      {workspacesQ.data && workspacesQ.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspacesQ.data.map((w) => (
            <WorkspaceCard
              key={w.id}
              workspace={w}
              summary={summariesQ.data?.get(w.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

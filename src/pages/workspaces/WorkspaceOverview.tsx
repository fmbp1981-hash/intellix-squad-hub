import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderOpen, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SquadCard } from '@/components/workspace/SquadCard';
import { RecentRunsList } from '@/components/workspace/RecentRunsList';
import {
  getSquadRuns,
  getTemplates,
  getWorkspace,
} from '@/lib/supabase/workspaces';
import { AVAILABLE_SQUADS } from '@/types';

export default function WorkspaceOverview() {
  const { id } = useParams<{ id: string }>();

  const wsQ = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => getWorkspace(id!),
    enabled: !!id,
  });
  const runsQ = useQuery({
    queryKey: ['squad_runs', id],
    queryFn: () => getSquadRuns(id!),
    enabled: !!id,
  });
  const templatesQ = useQuery({ queryKey: ['templates'], queryFn: getTemplates });

  if (wsQ.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!wsQ.data) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Workspace não encontrado
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O engagement solicitado não existe ou foi removido.
        </p>
        <Button asChild className="mt-5 bg-gradient-brand text-primary-foreground">
          <Link to="/workspaces">Voltar para Workspaces</Link>
        </Button>
      </div>
    );
  }

  const ws = wsQ.data;
  const template = templatesQ.data?.find((t) => t.id === ws.template_id);
  const allowedSquads = template?.squads ?? AVAILABLE_SQUADS.map((s) => s.id);
  const squads = AVAILABLE_SQUADS.filter((s) => allowedSquads.includes(s.id));
  const recentRuns = (runsQ.data ?? []).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/workspaces">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Workspaces
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold text-foreground">
            {ws.client_name}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">{ws.engagement_name}</p>
          {template && (
            <span className="mt-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {template.name}
            </span>
          )}
          {ws.description && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{ws.description}</p>
          )}
        </div>

        {ws.drive_folder_url && (
          <Button
            asChild
            variant="outline"
            className="border-secondary/40 text-secondary hover:bg-secondary/10 hover:text-secondary"
          >
            <a href={ws.drive_folder_url} target="_blank" rel="noopener noreferrer">
              <FolderOpen className="mr-1.5 h-4 w-4" />
              Abrir pasta no Drive
            </a>
          </Button>
        )}
      </header>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Squads disponíveis
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {squads.map((s) => (
            <SquadCard
              key={s.id}
              workspaceId={ws.id}
              squadId={s.id}
              label={s.label}
              icon={s.icon}
              color={s.color}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">Runs recentes</h2>
          {(runsQ.data?.length ?? 0) > 5 && (
            <Link
              to={`/workspaces/${ws.id}/runs`}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver histórico completo →
            </Link>
          )}
        </div>
        {runsQ.isLoading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : (
          <RecentRunsList workspaceId={ws.id} runs={recentRuns} />
        )}
      </section>
    </div>
  );
}

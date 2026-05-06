import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, FileText, Loader2, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RunStatusBadge } from '@/components/workspace/RunStatusBadge';
import { AgentList } from '@/components/run/AgentList';
import { HandoffCard } from '@/components/run/HandoffCard';
import { RunTimer } from '@/components/run/RunTimer';
import { OfficeViewer } from '@/components/office/OfficeViewer';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  createSquadRun,
  getLatestRunFor,
  getWorkspace,
} from '@/lib/supabase/workspaces';
import { AVAILABLE_SQUADS, type SquadRun, type SquadState } from '@/types';

export default function RunDashboard() {
  const { id, squad } = useParams<{ id: string; squad: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const squadInfo = AVAILABLE_SQUADS.find((s) => s.id === squad);

  const [run, setRun] = useState<SquadRun | null>(null);
  const [starting, setStarting] = useState(false);

  const wsQ = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => getWorkspace(id!),
    enabled: !!id,
  });

  // Carrega o último run desse workspace+squad
  useEffect(() => {
    if (!id || !squad) return;
    let active = true;
    getLatestRunFor(id, squad).then((r) => {
      if (active) setRun(r);
    });
    return () => {
      active = false;
    };
  }, [id, squad]);

  // Subscribe Realtime quando há run com status acompanhável
  useEffect(() => {
    if (!run?.id) return;
    const channel = supabase
      .channel(`run-${run.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'squad_runs',
          filter: `id=eq.${run.id}`,
        },
        (payload) => {
          setRun(payload.new as SquadRun);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [run?.id]);

  const startRun = async () => {
    if (!id || !squad || !user) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-start', {
        body: { squad_key: squad, workspace_id: id, input: {} },
      });
      if (error) {
        toast.error('Erro ao iniciar o squad', {
          description: error.message ?? 'Falha desconhecida',
        });
        return;
      }
      if (data?.run_id) {
        const fresh = await import('@/api/squadRuns').then((m) =>
          m.getSquadRunById(data.run_id),
        );
        if (fresh) setRun(fresh);
      }
      toast.success('Squad iniciado!', { description: 'Aguardando agentes…' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Falha ao iniciar squad', { description: message });
    } finally {
      setStarting(false);
    }
  };

  if (!squadInfo) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-muted-foreground">Squad inválido.</p>
      </div>
    );
  }

  if (wsQ.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const state: SquadState | null = run?.state_snapshot ?? null;
  const isLive = run?.status === 'running' || run?.status === 'pending';
  const progress = state?.step
    ? Math.min(100, Math.round((state.step.current / state.step.total) * 100))
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to={`/workspaces/${id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para workspace
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: `${squadInfo.color}22`, color: squadInfo.color }}
          >
            {squadInfo.icon}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {squadInfo.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              {wsQ.data?.client_name} · {wsQ.data?.engagement_name}
            </p>
          </div>
        </div>

        {run && (
          <div className="flex items-center gap-3">
            <RunStatusBadge status={run.status} />
            <RunTimer startedAt={run.started_at} running={isLive} />
          </div>
        )}
      </header>

      {!run || run.status === 'completed' || run.status === 'failed' ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          {run?.status === 'completed' && (
            <div className="mb-6 rounded-lg border border-success/30 bg-success/10 p-4 text-left">
              <p className="font-display text-sm font-semibold text-success">
                Squad concluído com sucesso
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Relatório disponível para visualização e download.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/workspaces/${id}/runs/${run.id}`}>
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Ver Relatório
                  </Link>
                </Button>
                {run.drive_file_url && (
                  <Button asChild size="sm" variant="outline" className="border-secondary/40 text-secondary hover:bg-secondary/10">
                    <a href={run.drive_file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Abrir no Drive
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {run?.status === 'failed' && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-left">
              <p className="font-display text-sm font-semibold text-destructive">
                Squad falhou
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Houve um erro durante a execução. Tente novamente.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {run ? 'Iniciar nova execução deste squad' : 'Pronto para iniciar este squad?'}
          </p>
          <Button
            onClick={startRun}
            disabled={starting}
            className="mt-4 bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {starting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando…
              </>
            ) : run ? (
              <>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Tentar novamente
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-4 w-4" />
                Iniciar Squad
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          {state?.step && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{state.step.label}</span>
                <span className="font-mono text-muted-foreground">
                  Passo {state.step.current} de {state.step.total}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <OfficeViewer squadState={state} />

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Agentes do squad
              </h3>
              <AgentList agents={state?.agents ?? []} />
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Última troca
              </h3>
              {state?.handoff ? (
                <HandoffCard handoff={state.handoff} />
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">
                  Nenhum handoff registrado ainda.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* navigate hint when run completes */}
      <span className="hidden">{navigate ? '' : ''}</span>
    </div>
  );
}

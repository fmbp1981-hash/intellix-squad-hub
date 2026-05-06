import { useState } from "react";
import { Loader2, Play, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEngagementPlan } from "@/hooks/useEngagementPlan";
import { supabase } from "@/integrations/supabase/client";
import { CheckpointModal } from "./CheckpointModal";

export function EngagementPanel({ workspaceId }: { workspaceId: string }) {
  const { plan, runs, loading, eligibleSquads, progress, checkpointRun } =
    useEngagementPlan(workspaceId);
  const [advancing, setAdvancing] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nenhum plano de engagement criado para este workspace.
      </div>
    );
  }

  async function startNext(squad: string) {
    setAdvancing(true);
    try {
      const { error } = await supabase.functions.invoke("engagement-next-squad", {
        body: { workspaceId, squad },
      });
      if (error) throw error;
      toast.success(`Squad ${squad} iniciado`);
    } catch (e) {
      toast.error("Falha ao iniciar squad", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setAdvancing(false);
    }
  }

  const completed = plan.completed_squads ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Progresso</p>
            <p className="font-display text-2xl font-semibold">{progress}%</p>
          </div>
          <Badge variant="outline" className="capitalize">{plan.status}</Badge>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {completed.length} de {plan.squads_ordered.length} squads concluídos
          {plan.auto_advance ? " · auto-advance ON" : " · manual"}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-sm font-semibold text-foreground">Sequência</h3>
        {plan.squads_ordered.map((s, i) => {
          const isDone = completed.includes(s.squad);
          const isCurrent = plan.current_squad === s.squad;
          const run = runs.find((r) => r.squad_name === s.squad);
          const eligible = eligibleSquads.some((e) => e.squad === s.squad);
          return (
            <div
              key={s.squad}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium truncate">{s.squad}</span>
                {run?.status && (
                  <Badge variant="secondary" className="text-[10px]">
                    {run.status}
                  </Badge>
                )}
              </div>
              {!isDone && !isCurrent && eligible && !plan.auto_advance && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={advancing}
                  onClick={() => startNext(s.squad)}
                >
                  <Play className="mr-1 h-3 w-3" />
                  Iniciar
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {checkpointRun && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm">Checkpoint aguardando aprovação</p>
            <p className="text-xs text-muted-foreground">
              Squad {checkpointRun.squad_name} pausado para revisão humana.
            </p>
          </div>
          <CheckpointModal runId={checkpointRun.id} />
        </div>
      )}
    </div>
  );
}

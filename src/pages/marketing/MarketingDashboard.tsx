import { useState } from "react";
import { useMarketingSquad, triggerWeeklyResearch, getWeekStart } from "@/hooks/useMarketingSquad";
import { useContentCalendar } from "@/hooks/useContentCalendar";
import { WeeklyPipelineCard } from "@/components/marketing/WeeklyPipelineCard";
import { CalendarWeekView } from "@/components/marketing/CalendarWeekView";
import { CheckpointApproval } from "@/components/marketing/CheckpointApproval";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function MarketingDashboard() {
  const qc = useQueryClient();
  const { calendar, drafts, pendingApprovals, weekStart } = useMarketingSquad();
  const { approve, reject } = useContentCalendar(weekStart);
  const [triggering, setTriggering] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [checkpointId, setCheckpointId] = useState<string | null>(null);

  const draftPautas = calendar.data?.filter((c) => c.status === "draft") ?? [];
  const pendingCheckpoint = draftPautas[0] ?? null;

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerWeeklyResearch();
      toast.success("Pesquisa semanal iniciada!", { description: "Lúcio está coletando dados das 4 fontes." });
    } catch {
      toast.error("Erro ao iniciar pesquisa");
    } finally {
      setTriggering(false);
    }
  };

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      await approve.mutateAsync(id);
      toast.success("Pauta aprovada! Téo está gerando a copy…");
      setCheckpointId(null);
    } catch {
      toast.error("Erro ao aprovar pauta");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id: string, notes: string) => {
    await reject.mutateAsync({ id, notes });
    toast.info("Pauta rejeitada.");
    setCheckpointId(null);
  };

  // KPIs simples
  const postsApproved  = drafts.data?.filter((d) => d.status === "approved").length ?? 0;
  const postsReview    = drafts.data?.filter((d) => d.status === "review").length ?? 0;
  const calendarItems  = calendar.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Marketing Squad</h1>
          <p className="text-sm text-muted-foreground">@ai_intellix · Semana de {weekStart}</p>
        </div>
        <Button onClick={handleTrigger} disabled={triggering}>
          {triggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Iniciar pesquisa
        </Button>
      </div>

      {/* Pipeline */}
      <WeeklyPipelineCard
        currentStage={calendarItems > 0 ? (postsApproved > 0 ? "revisao" : "copy") : "pauta"}
        completedStages={[
          ...(calendar.data?.length ? ["pesquisa", "curadoria", "pauta"] : []),
          ...(drafts.data?.length ? ["copy", "visual"] : []),
          ...(postsApproved > 0 ? ["revisao"] : []),
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pautas criadas",    value: calendarItems },
          { label: "Aguardando aprovação", value: pendingApprovals },
          { label: "Em revisão",        value: postsReview },
          { label: "Posts aprovados",   value: postsApproved },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Calendário da semana */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-foreground">Próximos 3 posts</p>
          <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ["marketing-calendar"] })}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CalendarWeekView
          items={calendar.data ?? []}
          onPostClick={(id) => setCheckpointId(id)}
        />
      </div>

      {/* Checkpoint modal */}
      {checkpointId && pendingCheckpoint && (
        <CheckpointApproval
          open
          title={`Aprovar pauta: ${pendingCheckpoint.theme}`}
          description={`Pilar ${pendingCheckpoint.pillar} · ${pendingCheckpoint.format} · ${new Date(pendingCheckpoint.scheduled_for).toLocaleDateString("pt-BR")}`}
          onApprove={() => handleApprove(checkpointId)}
          onReject={(notes) => handleReject(checkpointId, notes)}
          onClose={() => setCheckpointId(null)}
          loading={!!approving}
        />
      )}
    </div>
  );
}

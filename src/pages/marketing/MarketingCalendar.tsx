import { useState } from "react";
import { useContentCalendar } from "@/hooks/useContentCalendar";
import { CalendarWeekView } from "@/components/marketing/CalendarWeekView";
import { CheckpointApproval } from "@/components/marketing/CheckpointApproval";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getWeekStart } from "@/hooks/useMarketingSquad";

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

export default function MarketingCalendar() {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [checkpointId, setCheckpointId] = useState<string | null>(null);
  const { query, approve, reject } = useContentCalendar(weekStart);

  const items = query.data ?? [];
  const selected = items.find((i) => i.id === checkpointId);

  const handleApprove = async () => {
    if (!checkpointId) return;
    try {
      await approve.mutateAsync(checkpointId);
      toast.success("Pauta aprovada! Téo está gerando copy…");
      setCheckpointId(null);
    } catch {
      toast.error("Erro ao aprovar");
    }
  };

  const handleReject = async (notes: string) => {
    if (!checkpointId) return;
    await reject.mutateAsync({ id: checkpointId, notes });
    toast.info("Pauta rejeitada.");
    setCheckpointId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Calendário Editorial</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {new Date(weekStart).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} —{" "}
            {new Date(addWeeks(weekStart, 1)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
          <Button size="sm" variant="outline" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setWeekStart(getWeekStart())}>
            Hoje
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <CalendarWeekView items={items} onPostClick={setCheckpointId} />
      )}

      {checkpointId && selected && (
        <CheckpointApproval
          open
          title={selected.theme}
          description={`${selected.pillar} · ${selected.format} · ${new Date(selected.scheduled_for).toLocaleDateString("pt-BR")}`}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setCheckpointId(null)}
          loading={approve.isPending}
        />
      )}
    </div>
  );
}

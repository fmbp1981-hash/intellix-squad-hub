import { useState } from "react";
import { Plus, AlertCircle, Briefcase, Users, CheckCircle2, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "@/components/metrics/MetricCard";
import { MetricsRow } from "@/components/layout/MetricsRow";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { NewEngagementDialog } from "@/components/engagement/NewEngagementDialog";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useEngagementsOverview } from "@/hooks/useEngagementsOverview";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: engs = [], isLoading: engsLoading } = useEngagementsOverview({ onlyActive: true, limit: 20 });
  const [createOpen, setCreateOpen] = useState(false);

  const blockedEngs = engs.filter((e) => e.status === "blocked" || e.health === "red");
  const capacityPct = stats && stats.agents_total > 0
    ? Math.round((stats.agents_busy / stats.agents_total) * 100)
    : 0;
  const freeAgents = stats ? Math.max(0, stats.agents_total - stats.agents_busy) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Como está a operação hoje?</p>
        </div>
      </div>

      {/* 4 metric cards no topo */}
      {statsLoading ? (
        <MetricsRow>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </MetricsRow>
      ) : (
        <MetricsRow>
          <MetricCard
            label="Engagements ativos"
            value={stats?.active_engagements ?? 0}
            hint={`${stats?.by_status.active ?? 0} em curso · ${stats?.by_status.planning ?? 0} em planejamento · ${stats?.by_status.blocked ?? 0} bloqueados`}
          />
          <MetricCard
            label="Capacidade do squad"
            value={`${capacityPct}%`}
            hint={`${freeAgents} agente(s) livre(s) de ${stats?.agents_total ?? 0}`}
            trend={capacityPct > 80
              ? { dir: "up", label: "Saturado" }
              : capacityPct > 50
              ? { dir: "flat", label: "Normal" }
              : { dir: "down", label: "Folga" }}
          />
          <MetricCard
            label="Tokens hoje"
            value={(stats?.tokens_today ?? 0).toLocaleString("pt-BR")}
            hint={`${stats?.agents_busy ?? 0} run(s) em execução agora`}
          />
          <MetricCard
            label="Custo LLM hoje"
            value={`US$ ${(stats?.cost_today_usd ?? 0).toFixed(2)}`}
            hint="Total de chamadas via llm-invoke"
          />
        </MetricsRow>
      )}

      {/* Atenção precisa */}
      {blockedEngs.length > 0 && (
        <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Atenção precisa</h2>
            <span className="text-xs text-rose-400/70">{blockedEngs.length}</span>
          </div>
          <ul className="space-y-2">
            {blockedEngs.map((e) => (
              <li key={e.id}>
                <EngagementCard e={e} onClick={() => navigate(`/engagements/${e.id}`)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lista de engagements ativos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Engagements em curso
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/engagements")}>
            Ver todos →
          </Button>
        </div>
        {engsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : engs.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <ul className="space-y-2">
            {engs.filter((e) => !blockedEngs.includes(e)).map((e) => (
              <li key={e.id}>
                <EngagementCard e={e} onClick={() => navigate(`/engagements/${e.id}`)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* FAB */}
      <Button
        size="lg"
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-6 right-6 h-14 rounded-full px-6 shadow-xl"
      >
        <Plus className="mr-2 h-5 w-5" /> Novo engagement
      </Button>

      <NewEngagementDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const items = [
    { icon: Briefcase, label: "Capture briefings com Bia (SDR)" },
    { icon: Users,     label: "Squad classifica e aloca módulos ESP" },
    { icon: CheckCircle2, label: "Roberto valida módulos no fim" },
    { icon: DollarSign,    label: "Felipe libera nos gates de pagamento" },
  ];
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
      <p className="text-sm font-medium text-foreground">Nenhum engagement ativo no momento.</p>
      <ul className="mx-auto mt-4 grid max-w-xl grid-cols-1 gap-2 text-left text-xs text-muted-foreground sm:grid-cols-2">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 rounded-lg border bg-background p-2">
            <Icon className="h-4 w-4 text-primary" />
            {label}
          </li>
        ))}
      </ul>
      <Button className="mt-4" onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" /> Criar primeiro engagement
      </Button>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { Building2, X } from "lucide-react";
import { useSquadOverview } from "@/hooks/useSquadOverview";
import { AgentCard } from "@/components/squad/AgentCard";
import { MetricCard } from "@/components/metrics/MetricCard";
import { MetricsRow } from "@/components/layout/MetricsRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Squad() {
  const navigate = useNavigate();
  const { data, isLoading } = useSquadOverview();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Squad</h1>
          <p className="text-sm text-muted-foreground">O time tem capacidade?</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/escritorio")}>
          <Building2 className="mr-2 h-4 w-4" /> Escritório virtual
        </Button>
      </div>

      {/* 3 cards topo */}
      {isLoading || !data ? (
        <MetricsRow className="lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </MetricsRow>
      ) : (
        <MetricsRow className="lg:grid-cols-3">
          <MetricCard
            label="Agentes ocupados"
            value={`${data.totals.busy}/${data.totals.total}`}
            hint={`${data.totals.total - data.totals.busy} disponível(is)`}
          />
          <MetricCard
            label="Tokens hoje"
            value={data.totals.tokens_today.toLocaleString("pt-BR")}
            hint="Soma input+output das corridas de hoje"
          />
          <MetricCard
            label="Custo LLM hoje"
            value={`US$ ${data.totals.cost_today_usd.toFixed(2)}`}
            hint="Custo agregado por agent_runs.cost_usd"
          />
        </MetricsRow>
      )}

      {/* Grid de agentes */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Agentes
        </h2>
        {isLoading || !data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : data.agents.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card/40 p-8 text-center text-sm text-muted-foreground">
            Nenhum agente ativo configurado.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.agents.map((a) => (
              <AgentCard key={a.id} agent={a} onClick={() => navigate(`/settings/agents?id=${a.id}`)} />
            ))}
          </div>
        )}
      </section>

      {/* Runs em execução */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Runs em execução
        </h2>
        {!data || data.active_runs.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Nenhuma corrida LLM em execução agora.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5">Agente</th>
                  <th className="px-3 py-2.5">Job</th>
                  <th className="px-3 py-2.5">Engagement</th>
                  <th className="px-3 py-2.5">Provider/Model</th>
                  <th className="px-3 py-2.5">Duração</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {data.active_runs.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5 font-medium">{r.agent_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.job_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.engagement_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.llm_provider}/{r.llm_model}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{humanDuration(r.duration_ms ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button variant="ghost" size="sm" disabled title="Cancelar (em breve)">
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function humanDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

import { useNavigate } from "react-router-dom";
import {
  Area, AreaChart, Bar, BarChart, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MetricCard } from "@/components/metrics/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetricsOverview, type MetricSeries } from "@/hooks/useMetricsOverview";

type MetricKey = "velocity" | "cycle-time" | "on-time" | "llm-cost" | "win-rate" | "nps";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 11,
  padding: "4px 8px",
};

function MiniBar({ data, color }: { data: MetricSeries["points"]; color: string }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MiniLine({ data, color }: { data: MetricSeries["points"]; color: string }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MiniArea({ data, color, gradId }: { data: MetricSeries["points"]; color: string; gradId: string }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" hide />
        <YAxis hide />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function trendOf(s: MetricSeries, lowerIsBetter = false): { dir: "up" | "down" | "flat"; pct: number } | undefined {
  if (s.delta_pct === null) return undefined;
  if (s.delta_pct === 0) return { dir: "flat", pct: 0 };
  const goodWhenUp = !lowerIsBetter;
  const isUp = s.delta_pct > 0;
  return { dir: (isUp === goodWhenUp ? "up" : "down"), pct: s.delta_pct };
}

function formatValue(s: MetricSeries, suffix: string, prefix = ""): string {
  if (s.current === null) return "—";
  const v = s.current;
  return `${prefix}${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix}`;
}

export default function Metrics() {
  const navigate = useNavigate();
  const { data, isLoading } = useMetricsOverview();
  const go = (key: MetricKey) => navigate(`/metrics/${key}`);

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Métricas</h1>
          <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Métricas</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores de execução, comercial e satisfação dos últimos 6 meses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Velocity (sprint)"
          value={formatValue(data.velocity, " pts")}
          hint={data.velocity.points.length ? `${data.velocity.points.length} sprint(s) na série` : "Sem sprints concluídos"}
          trend={trendOf(data.velocity)}
          chart={<MiniBar data={data.velocity.points} color="hsl(262 83% 58%)" />}
          onClick={() => go("velocity")}
        />
        <MetricCard
          label="Cycle time"
          value={formatValue(data.cycle_time, " d")}
          hint={data.cycle_time.points.length ? "Média semanal de stories concluídas" : "Sem stories concluídas no período"}
          trend={trendOf(data.cycle_time, true)}
          chart={<MiniLine data={data.cycle_time.points} color="hsl(199 89% 48%)" />}
          onClick={() => go("cycle-time")}
        />
        <MetricCard
          label="On-time delivery"
          value={formatValue(data.on_time, "%")}
          hint="Sprints que cumpriram os pontos comprometidos"
          trend={trendOf(data.on_time)}
          chart={<MiniArea data={data.on_time.points} color="hsl(160 84% 39%)" gradId="ontime-grad" />}
          onClick={() => go("on-time")}
        />
        <MetricCard
          label="Custo LLM (6 meses)"
          value={formatValue(data.llm_cost, "", "US$ ")}
          hint="Mês corrente — soma das chamadas via llm-invoke"
          trend={trendOf(data.llm_cost, true)}
          chart={<MiniArea data={data.llm_cost.points} color="hsl(38 92% 50%)" gradId="llm-grad" />}
          onClick={() => go("llm-cost")}
        />
        <MetricCard
          label="Win rate comercial"
          value={formatValue(data.win_rate, "%")}
          hint="Deals won / (won + lost) no mês"
          trend={trendOf(data.win_rate)}
          chart={<MiniBar data={data.win_rate.points} color="hsl(330 81% 60%)" />}
          onClick={() => go("win-rate")}
        />
        <MetricCard
          label="NPS"
          value={formatValue(data.nps, "")}
          hint={data.nps.points.length ? "Score líquido — promotores menos detratores" : "Aguardando integração com pesquisas"}
          trend={trendOf(data.nps)}
          chart={<MiniLine data={data.nps.points} color="hsl(280 89% 65%)" />}
          onClick={() => go("nps")}
        />
      </div>
    </div>
  );
}

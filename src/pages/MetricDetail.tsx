import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetricsOverview, type MetricSeries } from "@/hooks/useMetricsOverview";

type MetricKey = "velocity" | "cycle-time" | "on-time" | "llm-cost" | "win-rate" | "nps";

interface MetricMeta {
  title: string;
  subtitle: string;
  unit: string;
  prefix?: string;
  kind: "bar" | "line" | "area";
  color: string;
  lowerIsBetter?: boolean;
  buildInsights: (s: MetricSeries) => string[];
}

const META: Record<MetricKey, MetricMeta> = {
  velocity: {
    title: "Velocity",
    subtitle: "Pontos entregues por sprint concluído",
    unit: "pts",
    kind: "bar",
    color: "hsl(262 83% 58%)",
    buildInsights: (s) => {
      const out: string[] = [];
      if (!s.points.length) return ["Sem sprints concluídos no período."];
      const avg = Math.round(s.points.reduce((a, b) => a + b.value, 0) / s.points.length);
      out.push(`Média da série: ${avg} pts.`);
      if (s.delta_pct !== null) out.push(`Variação ${s.delta_pct > 0 ? "+" : ""}${s.delta_pct}% do início ao fim.`);
      const max = s.points.reduce((m, p) => (p.value > m.value ? p : m), s.points[0]);
      out.push(`Melhor sprint: ${max.label} (${max.value} pts).`);
      return out;
    },
  },
  "cycle-time": {
    title: "Cycle time",
    subtitle: "Dias médios entre início e conclusão de stories",
    unit: "dias",
    kind: "line",
    color: "hsl(199 89% 48%)",
    lowerIsBetter: true,
    buildInsights: (s) => {
      if (!s.points.length) return ["Sem stories concluídas nas últimas 6 semanas."];
      const avg = (s.points.reduce((a, b) => a + b.value, 0) / s.points.length).toFixed(1);
      const out = [`Média da série: ${avg} dias.`];
      if (s.delta_pct !== null) {
        const verb = s.delta_pct < 0 ? "redução" : s.delta_pct > 0 ? "aumento" : "estável";
        out.push(`Tendência: ${verb} de ${Math.abs(s.delta_pct)}% no período.`);
      }
      return out;
    },
  },
  "on-time": {
    title: "On-time delivery",
    subtitle: "Sprints que entregaram pelo menos os pontos comprometidos",
    unit: "%",
    kind: "area",
    color: "hsl(160 84% 39%)",
    buildInsights: (s) => {
      if (!s.points.length) return ["Sem sprints concluídos no período."];
      const avg = Math.round(s.points.reduce((a, b) => a + b.value, 0) / s.points.length);
      return [
        `Média on-time da série: ${avg}%.`,
        s.delta_pct !== null
          ? `Variação ${s.delta_pct > 0 ? "+" : ""}${s.delta_pct} pp do início ao fim.`
          : "Pouca série para projeção.",
      ];
    },
  },
  "llm-cost": {
    title: "Custo LLM",
    subtitle: "Gasto mensal em USD com chamadas via llm-invoke",
    unit: "USD",
    prefix: "US$ ",
    kind: "area",
    color: "hsl(38 92% 50%)",
    lowerIsBetter: true,
    buildInsights: (s) => {
      if (!s.points.length) return ["Sem chamadas registradas no período."];
      const total = s.points.reduce((a, b) => a + b.value, 0);
      return [
        `Gasto acumulado da série: US$ ${total.toFixed(2)}.`,
        s.delta_pct !== null
          ? `Mês atual ${s.delta_pct > 0 ? "+" : ""}${s.delta_pct}% vs. mês inicial.`
          : "Pouco volume para conclusão.",
      ];
    },
  },
  "win-rate": {
    title: "Win rate comercial",
    subtitle: "Deals fechados (won) sobre o total decidido (won + lost)",
    unit: "%",
    kind: "bar",
    color: "hsl(330 81% 60%)",
    buildInsights: (s) => {
      if (!s.points.length) return ["Sem deals decididos no período."];
      const avg = Math.round(s.points.reduce((a, b) => a + b.value, 0) / s.points.length);
      return [
        `Win rate médio: ${avg}%.`,
        s.delta_pct !== null
          ? `Variação ${s.delta_pct > 0 ? "+" : ""}${s.delta_pct} pp do início ao fim.`
          : "Série curta — variação não significativa.",
      ];
    },
  },
  nps: {
    title: "NPS",
    subtitle: "Net Promoter Score — promotores menos detratores",
    unit: "score",
    kind: "line",
    color: "hsl(280 89% 65%)",
    buildInsights: () => [
      "Pesquisa de NPS ainda não integrada.",
      "Configure a coleta para que esse indicador comece a popular.",
    ],
  },
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

function Chart({ meta, data }: { meta: MetricMeta; data: MetricSeries["points"] }) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sem dados para a série.
      </div>
    );
  }
  if (meta.kind === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
          <Bar dataKey="value" fill={meta.color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (meta.kind === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="detail-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2.5} fill="url(#detail-grad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const SERIES_KEY: Record<MetricKey, keyof ReturnType<typeof useMetricsOverview>["data"] extends infer T ? (T extends Record<string, MetricSeries> ? keyof T : never) : never> = {
  velocity: "velocity",
  "cycle-time": "cycle_time",
  "on-time": "on_time",
  "llm-cost": "llm_cost",
  "win-rate": "win_rate",
  nps: "nps",
};

export default function MetricDetail() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMetricsOverview();

  const meta = key && (key as MetricKey) in META ? META[key as MetricKey] : undefined;

  if (!meta) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/metrics")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <p className="text-sm text-muted-foreground">Métrica não encontrada.</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/metrics")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Métricas
        </Button>
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const series = data[SERIES_KEY[key as MetricKey]];
  const last = series.current;
  const delta = series.delta_pct;
  const goodWhenUp = !meta.lowerIsBetter;
  const isPositiveTrend = delta !== null && delta !== 0 && (delta > 0 ? goodWhenUp : !goodWhenUp);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/metrics")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Métricas
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor atual</p>
          <p className="mt-2 text-3xl font-semibold">
            {last === null ? "—" : `${meta.prefix ?? ""}${last.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`}
            {last !== null && <span className="ml-1 text-base text-muted-foreground">{meta.unit}</span>}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Variação no período</p>
          <p className={`mt-2 text-3xl font-semibold ${
            delta === null ? "text-muted-foreground" :
            isPositiveTrend ? "text-emerald-500" : delta === 0 ? "text-muted-foreground" : "text-rose-500"
          }`}>
            {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}%`}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pontos coletados</p>
          <p className="mt-2 text-3xl font-semibold">{series.points.length}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Série histórica</h2>
        <div className="h-72">
          <Chart meta={meta} data={series.points} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Insights</h2>
        <ul className="space-y-2 text-sm">
          {meta.buildInsights(series).map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

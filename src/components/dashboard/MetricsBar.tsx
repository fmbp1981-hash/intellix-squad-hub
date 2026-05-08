import { DollarSign, TrendingUp, Building2, Rocket, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/hooks/useDashboard";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v || 0);

interface MetricCard {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;       // tailwind text color class
  glow: string;        // inline hex for box-shadow glow
  topColor: string;    // gradient stop for top border
}

export function MetricsBar({ data }: { data: DashboardSummary }) {
  const cards: MetricCard[] = [
    {
      icon: DollarSign,
      label: "MRR (mês)",
      value: fmtBRL(data.mrr),
      color: "text-emerald-400",
      glow: "hsl(160 84% 39% / 0.25)",
      topColor: "hsl(160 84% 39%)",
    },
    {
      icon: TrendingUp,
      label: "Pipeline",
      value: fmtBRL(data.pipeline_value),
      sub: `${data.pipeline_count} deals`,
      color: "text-cyan-400",
      glow: "hsl(189 94% 43% / 0.25)",
      topColor: "hsl(189 94% 43%)",
    },
    {
      icon: Building2,
      label: "Engagements",
      value: String(data.engagements?.total ?? 0),
      sub: "ativos",
      color: "text-violet-400",
      glow: "hsl(262 83% 58% / 0.3)",
      topColor: "hsl(262 83% 58%)",
    },
    {
      icon: Rocket,
      label: "Sprints",
      value: String(data.sprints_active ?? 0),
      sub: "em andamento",
      color: "text-amber-400",
      glow: "hsl(38 92% 50% / 0.25)",
      topColor: "hsl(38 92% 50%)",
    },
    {
      icon: Cpu,
      label: "Jobs IA",
      value: String(data.jobs_running ?? 0),
      sub: "rodando agora",
      color: "text-pink-400",
      glow: "hsl(330 86% 60% / 0.25)",
      topColor: "hsl(330 86% 60%)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((c, i) => (
        <MetricCardItem key={c.label} card={c} delay={i} />
      ))}
    </div>
  );
}

function MetricCardItem({ card: c, delay }: { card: MetricCard; delay: number }) {
  return (
    <div
      className={cn(
        "fade-in-up relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5",
        `fade-in-up-delay-${delay + 1}`
      )}
      style={{
        background: "hsl(240 17% 9%)",
        border: "1px solid hsl(240 16% 18%)",
        boxShadow: `0 1px 3px hsl(240 27% 2% / 0.8), 0 0 0 0 transparent`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 8px 24px -4px ${c.glow}, 0 1px 3px hsl(240 27% 2% / 0.8)`;
        (e.currentTarget as HTMLDivElement).style.borderColor =
          `${c.topColor.replace("hsl(", "hsl(").replace(")", " / 0.3)")}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 1px 3px hsl(240 27% 2% / 0.8)`;
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "hsl(240 16% 18%)";
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${c.topColor}, transparent)`,
          opacity: 0.6,
        }}
      />

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {c.label}
        </p>
        <div
          className={cn("flex h-7 w-7 items-center justify-center rounded-lg", c.color)}
          style={{ background: `${c.glow}` }}
        >
          <c.icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <p className={cn("mt-3 font-display text-2xl font-bold tracking-tight", c.color)}>
        {c.value}
      </p>

      {c.sub && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{c.sub}</p>
      )}
    </div>
  );
}

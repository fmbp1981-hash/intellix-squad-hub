import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Building2, Rocket, Cpu } from "lucide-react";
import type { DashboardSummary } from "@/hooks/useDashboard";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);

export function MetricsBar({ data }: { data: DashboardSummary }) {
  const cards = [
    { icon: DollarSign, label: "MRR (mês)", value: fmtBRL(data.mrr), accent: "text-emerald-400" },
    { icon: TrendingUp, label: "Pipeline", value: fmtBRL(data.pipeline_value), sub: `${data.pipeline_count} deals`, accent: "text-cyan-400" },
    { icon: Building2, label: "Engagements", value: String(data.engagements?.total ?? 0), sub: "ativos", accent: "text-violet-400" },
    { icon: Rocket, label: "Sprints", value: String(data.sprints_active ?? 0), sub: "em andamento", accent: "text-amber-400" },
    { icon: Cpu, label: "Jobs IA", value: String(data.jobs_running ?? 0), sub: "rodando agora", accent: "text-pink-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <c.icon className={`h-4 w-4 ${c.accent}`} />
          </div>
          <p className="mt-2 text-2xl font-bold">{c.value}</p>
          {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
        </Card>
      ))}
    </div>
  );
}

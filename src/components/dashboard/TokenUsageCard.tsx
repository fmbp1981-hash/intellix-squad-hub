import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardSummary } from "@/hooks/useDashboard";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v || 0);

export function TokenUsageCard({ tokens }: { tokens: DashboardSummary["tokens"] }) {
  const consumed = Number(tokens?.consumed_usd ?? 0);
  const budget = Number(tokens?.budget_usd ?? 0);
  const pct = budget > 0 ? Math.min(100, (consumed / budget) * 100) : 0;
  const period = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Uso de tokens</h2>
        <span className="text-xs capitalize text-muted-foreground">{period}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{fmt(consumed)}</span>
        <span className="text-sm text-muted-foreground">/ {budget > 0 ? fmt(budget) : "sem budget"}</span>
      </div>
      <Progress value={pct} className="mt-3 h-2" />
      <p className="mt-2 text-xs text-muted-foreground">{pct.toFixed(1)}% do orçamento</p>
    </Card>
  );
}

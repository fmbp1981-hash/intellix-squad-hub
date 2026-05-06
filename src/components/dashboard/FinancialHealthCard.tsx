import { Card } from "@/components/ui/card";
import type { DashboardSummary } from "@/hooks/useDashboard";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function FinancialHealthCard({ summary }: { summary: DashboardSummary["invoices_summary"] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Saúde financeira</h2>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pendentes</p>
          <p className="mt-1 text-xl font-bold text-amber-400">{fmtBRL(summary?.pending ?? 0)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Vencidas</p>
          <p className="mt-1 text-xl font-bold text-rose-400">{fmtBRL(summary?.overdue ?? 0)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Próx. 7 dias</p>
          <p className="mt-1 text-xl font-bold text-cyan-400">{fmtBRL(summary?.next_7_days ?? 0)}</p>
        </div>
      </div>
    </Card>
  );
}

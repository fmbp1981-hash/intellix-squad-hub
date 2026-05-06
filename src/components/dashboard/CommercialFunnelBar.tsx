import { Card } from "@/components/ui/card";
import type { DashboardSummary } from "@/hooks/useDashboard";

const LEAD_STAGES = ["new", "qualifying", "qualified"];
const DEAL_STAGES = ["discovery", "proposal", "negotiation", "won"];

export function CommercialFunnelBar({
  funnel,
  dealsFunnel,
}: {
  funnel: DashboardSummary["funnel"];
  dealsFunnel: DashboardSummary["deals_funnel"];
}) {
  const stages = [
    ...LEAD_STAGES.map((s) => ({ label: s, count: funnel?.[s] ?? 0 })),
    ...DEAL_STAGES.map((s) => ({ label: s, count: dealsFunnel?.[s] ?? 0 })),
  ];
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Funil comercial</h2>
      <div className="flex items-end gap-2 overflow-x-auto">
        {stages.map((s) => {
          const h = Math.max(20, (s.count / max) * 100);
          return (
            <div key={s.label} className="flex min-w-[60px] flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary/20 transition-all"
                style={{ height: `${h}px` }}
              />
              <span className="text-xs font-semibold">{s.count}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

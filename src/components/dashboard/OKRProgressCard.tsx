import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardSummary } from "@/hooks/useDashboard";

const STATUS_COLOR: Record<string, string> = {
  on_track: "text-emerald-400",
  at_risk: "text-amber-400",
  off_track: "text-rose-400",
};

const STATUS_LABEL: Record<string, string> = {
  on_track: "🟢 on-track",
  at_risk: "🟡 at-risk",
  off_track: "🔴 off-track",
};

export function OKRProgressCard({ okrs }: { okrs: DashboardSummary["okrs"] }) {
  if (!okrs?.length) return null;
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">OKRs ativos</h2>
      <div className="space-y-4">
        {okrs.map((o) => (
          <div key={o.id} className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {o.department}
                </span>
                <br />
                {o.objective}
              </p>
              <span className={`shrink-0 text-xs ${STATUS_COLOR[o.status] || "text-muted-foreground"}`}>
                {STATUS_LABEL[o.status] || o.status}
              </span>
            </div>
            <Progress value={Number(o.progress) || 0} className="h-1.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>
                {o.current_value ?? 0} / {o.target_value ?? "—"}
              </span>
              <span>{Math.round(Number(o.progress) || 0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertCircle, Activity } from "lucide-react";
import type { DashboardSummary } from "@/hooks/useDashboard";

const ICONS: Record<string, any> = {
  squad_run: Activity,
  internal_job: Loader2,
  crm_activity: CheckCircle2,
};

const STATUS_VARIANT = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (["completed", "done", "won", "qualified"].includes(status)) return "default";
  if (["failed", "blocked", "lost", "overdue"].includes(status)) return "destructive";
  if (["running", "in_progress", "pending"].includes(status)) return "secondary";
  return "outline";
};

const fmtTime = (s: string) => {
  if (!s) return "";
  const d = new Date(s);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return "agora";
  if (diff < 60) return `há ${Math.floor(diff)} min`;
  if (diff < 1440) return `há ${Math.floor(diff / 60)} h`;
  return d.toLocaleDateString("pt-BR");
};

export function UnifiedFeedCard({ feed }: { feed: DashboardSummary["feed"] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Últimas atividades</h2>
        <span className="text-xs text-muted-foreground">últimas 24h</span>
      </div>
      {feed.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma atividade recente.
        </p>
      ) : (
        <ul className="space-y-2">
          {feed.map((item) => {
            const Icon = ICONS[item.type] || AlertCircle;
            return (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-3 rounded-md border border-border/50 bg-card/50 px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtTime(item.at)}</p>
                </div>
                <Badge variant={STATUS_VARIANT(item.status)} className="shrink-0 text-[10px]">
                  {item.status}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

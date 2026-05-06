import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import type { DashboardSummary } from "@/hooks/useDashboard";

export function AgileProjectsGrid({ projects }: { projects: DashboardSummary["projects"] }) {
  if (!projects?.length) return null;
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Projetos Ágeis</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {projects.map((p) => {
          const total = p.total_story_points ?? 0;
          const done = p.completed_points ?? 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="block rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.client_name || "Sem cliente"}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">{p.status}</Badge>
              </div>
              <div className="mt-3 space-y-1">
                <Progress value={pct} className="h-1.5" />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{done}/{total} pts</span>
                  <span>{pct}%</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

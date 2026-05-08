import { useDashboard } from "@/hooks/useDashboard";
import { MetricsBar } from "@/components/dashboard/MetricsBar";
import { UnifiedFeedCard } from "@/components/dashboard/UnifiedFeedCard";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useGestao } from "@/hooks/useGestao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertCircle } from "lucide-react";

export default function PainelPage() {
  const { data, loading, error } = useDashboard();
  const { directives } = useGestao();

  const pendentes = directives.filter((d: any) => d.status === "pending");

  if (loading) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {error || "Não foi possível carregar o painel."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardGreeting />
      <MetricsBar data={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UnifiedFeedCard feed={data.feed} />
        </div>

        {pendentes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Ágata — Alertas ({pendentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendentes.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-foreground">{d.title}</span>
                  <Badge variant="outline" className="ml-2 shrink-0 capitalize">
                    {d.priority ?? "normal"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

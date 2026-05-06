import { useDashboard } from "@/hooks/useDashboard";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { MetricsBar } from "@/components/dashboard/MetricsBar";
import { UnifiedFeedCard } from "@/components/dashboard/UnifiedFeedCard";
import { AgileProjectsGrid } from "@/components/dashboard/AgileProjectsGrid";
import { OKRProgressCard } from "@/components/dashboard/OKRProgressCard";
import { CommercialFunnelBar } from "@/components/dashboard/CommercialFunnelBar";
import { FinancialHealthCard } from "@/components/dashboard/FinancialHealthCard";
import { TokenUsageCard } from "@/components/dashboard/TokenUsageCard";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data, loading, error } = useDashboard();

  if (loading) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {error || "Não foi possível carregar o dashboard."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardGreeting />
      <QuickActionsBar />
      <MetricsBar data={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UnifiedFeedCard feed={data.feed} />
        </div>
        <TokenUsageCard tokens={data.tokens} />
      </div>

      <AgileProjectsGrid projects={data.projects} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OKRProgressCard okrs={data.okrs} />
        <div className="space-y-4">
          <CommercialFunnelBar funnel={data.funnel} dealsFunnel={data.deals_funnel} />
          <FinancialHealthCard summary={data.invoices_summary} />
        </div>
      </div>
    </div>
  );
}

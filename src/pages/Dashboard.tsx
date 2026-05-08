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
import { AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data, loading, error } = useDashboard();

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div
          className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center"
          style={{
            background: "hsl(240 17% 9%)",
            border: "1px solid hsl(0 84% 60% / 0.2)",
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">Falha ao carregar o dashboard</p>
          <p className="text-xs text-muted-foreground">
            {error || "Verifique a conexão com o Supabase."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardGreeting />
      <QuickActionsBar />
      <MetricsBar data={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="fade-in-up fade-in-up-delay-3 lg:col-span-2">
          <UnifiedFeedCard feed={data.feed} />
        </div>
        <div className="fade-in-up fade-in-up-delay-4">
          <TokenUsageCard tokens={data.tokens} />
        </div>
      </div>

      <div className="fade-in-up fade-in-up-delay-4">
        <AgileProjectsGrid projects={data.projects} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="fade-in-up fade-in-up-delay-5">
          <OKRProgressCard okrs={data.okrs} />
        </div>
        <div className="fade-in-up fade-in-up-delay-5 space-y-4">
          <CommercialFunnelBar funnel={data.funnel} dealsFunnel={data.deals_funnel} />
          <FinancialHealthCard summary={data.invoices_summary} />
        </div>
      </div>
    </div>
  );
}

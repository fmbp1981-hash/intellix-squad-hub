import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

const ROUTE_LABELS: Record<string, string> = {
  "/painel": "Painel",
  "/escritorio": "Escritório",
  "/pipeline": "Pipeline",
  "/jobs": "Jobs",
  "/squads": "Squads",
  "/projetos": "Projetos",
  "/config": "Configurações",
  "/dashboard": "Dashboard",
  "/marketing": "Marketing",
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  const key = Object.keys(ROUTE_LABELS)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname.startsWith(k));
  return key ? ROUTE_LABELS[key] : "";
}

export function AppLayout() {
  const title = usePageTitle();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex h-14 shrink-0 items-center justify-between px-6"
          style={{
            background: "hsl(240 17% 9% / 0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid hsl(240 16% 14%)",
          }}
        >
          <div className="flex items-center gap-2">
            {title && (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Status badge */}
            <span className="hidden items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Sistema operacional
            </span>

            <NotificationBell />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <OnboardingWizard />
    </div>
  );
}

import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkeletonPage } from "@/components/ui/SkeletonPage";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import PainelPage from "./pages/painel/PainelPage";

// OpenSquad v2.1 — 5 telas planas
const Engagements = lazy(() => import("./pages/Engagements"));
const EngagementDetail = lazy(() => import("./pages/EngagementDetail"));
const Squad = lazy(() => import("./pages/Squad"));
const Metrics = lazy(() => import("./pages/Metrics"));
const MetricDetail = lazy(() => import("./pages/MetricDetail"));
const SettingsFlat = lazy(() => import("./pages/Settings"));
const TemplatesSettings = lazy(() => import("./pages/settings-v2/TemplatesSettings"));
const UsersSettings = lazy(() => import("./pages/settings-v2/UsersSettings"));

// Lazy: heavier sections
const WorkspacesList = lazy(() => import("./pages/workspaces/WorkspacesList"));
const NewWorkspace = lazy(() => import("./pages/workspaces/NewWorkspace"));
const WorkspaceOverview = lazy(() => import("./pages/workspaces/WorkspaceOverview"));
const RunDashboard = lazy(() => import("./pages/workspaces/RunDashboard"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const SettingsLayout = lazy(() => import("./pages/settings/SettingsLayout"));
const WhatsAppSettings = lazy(() => import("./pages/settings/WhatsAppSettings"));
const ModelSettings = lazy(() => import("./pages/settings/ModelSettings"));
const EmailTemplatesPage = lazy(() => import("./pages/settings/EmailTemplatesPage"));
const AgentsSettings = lazy(() => import("./pages/settings/AgentsSettings"));
const SquadsSettings = lazy(() => import("./pages/settings/SquadsSettings"));
const BudgetsSettings = lazy(() => import("./pages/settings/BudgetsSettings"));
const ProfileSettings = lazy(() => import("./pages/settings/ProfileSettings"));
const DriveSetupSettings = lazy(() => import("./pages/settings/DriveSetupSettings"));
const ExportsPage = lazy(() => import("./pages/ExportsPage"));
const NotificationPreferences = lazy(() =>
  import("./components/notifications/NotificationPreferences").then((m) => ({ default: m.NotificationPreferences }))
);
const OfficePage = lazy(() => import("./pages/office/OfficePage"));
const OfficeGestao = lazy(() => import("./pages/office/OfficeGestao"));
const JobsPage = lazy(() => import("./pages/jobs/JobsPage"));
const CrmLayout = lazy(() => import("./pages/crm/CrmLayout"));
const CrmDashboard = lazy(() => import("./pages/crm/CrmDashboard"));
const LeadList = lazy(() => import("./pages/crm/LeadList"));
const DealKanban = lazy(() => import("./pages/crm/DealKanban"));
const ContractList = lazy(() => import("./pages/crm/ContractList"));
const InvoiceList = lazy(() => import("./pages/crm/InvoiceList"));
const EngagementList = lazy(() => import("./pages/crm/EngagementList"));
const CrmForecast = lazy(() => import("./pages/crm/CrmForecast"));
const CrmActivities = lazy(() => import("./pages/crm/CrmActivities"));
const CrmAutomations = lazy(() => import("./pages/crm/CrmAutomations"));
const IntegrationsPage = lazy(() => import("./pages/settings/IntegrationsPage"));
const ProjectsList = lazy(() => import("./pages/projects/ProjectsList"));
const NewProject = lazy(() => import("./pages/projects/NewProject"));
const ProjectOverview = lazy(() => import("./pages/projects/ProjectOverview"));
const ProductBacklogPage = lazy(() => import("./pages/projects/ProductBacklogPage"));
const SprintBoardPage = lazy(() => import("./pages/projects/SprintBoardPage"));
const SprintsPage = lazy(() => import("./pages/projects/SprintsPage"));
const ProjectMetricsPage = lazy(() => import("./pages/projects/ProjectMetricsPage"));
const ImpedimentsPage = lazy(() => import("./pages/projects/ImpedimentsPage"));
const EscritorioPage = lazy(() => import("./pages/escritorio/EscritorioPage"));
const PipelinePage = lazy(() => import("./pages/pipeline/PipelinePage"));
const SquadsListPage = lazy(() => import("./pages/squads/SquadsListPage"));
const SquadDetailPage = lazy(() => import("./pages/squads/SquadDetailPage"));
const ProjetoDetailPage = lazy(() => import("./pages/projetos/ProjetoDetailPage"));
const ConfigPage = lazy(() => import("./pages/config/ConfigPage"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<SkeletonPage />}>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* OpenSquad v2.1 — 5 telas planas */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/engagements" element={<Engagements />} />
                  <Route path="/engagements/:id" element={<EngagementDetail />} />
                  <Route path="/squad" element={<Squad />} />
                  <Route path="/metrics" element={<Metrics />} />
                  <Route path="/metrics/:key" element={<MetricDetail />} />

                  {/* Rotas legadas */}
                  <Route path="/painel" element={<PainelPage />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/workspaces" element={<WorkspacesList />} />
                  <Route path="/workspaces/new" element={<NewWorkspace />} />
                  <Route path="/workspaces/:id" element={<WorkspaceOverview />} />
                  <Route path="/workspaces/:id/run/:squad" element={<RunDashboard />} />
                  <Route
                    path="/workspaces/:id/runs"
                    element={<Placeholder title="Histórico de Runs" step="Prompt 6" description="Lista de execuções com status e links de output." />}
                  />
                  <Route
                    path="/workspaces/:id/runs/:runId"
                    element={<Placeholder title="Output Viewer" step="Prompt 6" description="Markdown do relatório renderizado + link Drive." />}
                  />
                  {/* Settings flat (cards-link grid + sub-rotas planas) */}
                  <Route path="/settings" element={<SettingsFlat />} />
                  <Route path="/settings/agents" element={<AgentsSettings />} />
                  <Route path="/settings/templates" element={<TemplatesSettings />} />
                  <Route path="/settings/squads" element={<SquadsSettings />} />
                  <Route path="/settings/users" element={<UsersSettings />} />
                  <Route path="/settings/integrations" element={<IntegrationsPage />} />
                  <Route path="/settings/notifications" element={<NotificationPreferences />} />
                  <Route path="/settings/whatsapp" element={<WhatsAppSettings />} />
                  <Route path="/settings/models" element={<ModelSettings />} />
                  <Route path="/settings/email-templates" element={<EmailTemplatesPage />} />
                  <Route path="/settings/budgets" element={<BudgetsSettings />} />
                  <Route path="/settings/profile" element={<ProfileSettings />} />
                  <Route path="/settings/drive" element={<DriveSetupSettings />} />
                  {/* Legado: SettingsLayout antigo */}
                  <Route path="/settings-legacy" element={<SettingsLayout />}>
                    <Route index element={<SettingsPage />} />
                  </Route>
                  <Route path="/exports" element={<ExportsPage />} />
                  <Route path="/office" element={<OfficePage />} />
                  <Route path="/office/gestao" element={<OfficeGestao />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/crm" element={<CrmLayout />}>
                    <Route index element={<CrmDashboard />} />
                    <Route path="leads" element={<LeadList />} />
                    <Route path="deals" element={<DealKanban />} />
                    <Route path="forecast" element={<CrmForecast />} />
                    <Route path="activities" element={<CrmActivities />} />
                    <Route path="automations" element={<CrmAutomations />} />
                    <Route path="contracts" element={<ContractList />} />
                    <Route path="invoices" element={<InvoiceList />} />
                    <Route path="engagements" element={<EngagementList />} />
                  </Route>

                  <Route path="/projects" element={<ProjectsList />} />
                  <Route path="/projects/new" element={<NewProject />} />
                  <Route path="/projects/:id" element={<ProjectOverview />} />
                  <Route path="/projects/:id/backlog" element={<ProductBacklogPage />} />
                  <Route path="/projects/:id/board" element={<SprintBoardPage />} />
                  <Route path="/projects/:id/sprints" element={<SprintsPage />} />
                  <Route path="/projects/:id/metrics" element={<ProjectMetricsPage />} />
                  <Route path="/projects/:id/impediments" element={<ImpedimentsPage />} />
                  <Route path="/projects/:id/roadmap" element={<Placeholder title="Roadmap" step="Lote C" description="Release Plan visual." />} />

                  <Route path="/escritorio" element={<EscritorioPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/squads" element={<SquadsListPage />} />
                  <Route path="/squads/new" element={<NewWorkspace />} />
                  <Route path="/squads/:id" element={<SquadDetailPage />} />
                  <Route path="/squads/:id/run/:squad" element={<RunDashboard />} />
                  <Route path="/projetos" element={<ProjectsList />} />
                  <Route path="/projetos/new" element={<NewProject />} />
                  <Route path="/projetos/:id" element={<ProjetoDetailPage />} />
                  <Route path="/config" element={<ConfigPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;

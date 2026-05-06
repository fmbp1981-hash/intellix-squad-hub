import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import WorkspacesList from "./pages/workspaces/WorkspacesList";
import NewWorkspace from "./pages/workspaces/NewWorkspace";
import WorkspaceOverview from "./pages/workspaces/WorkspaceOverview";
import RunDashboard from "./pages/workspaces/RunDashboard";
import SettingsPage from "./pages/settings/SettingsPage";
import OfficePage from "./pages/office/OfficePage";
import OfficeGestao from "./pages/office/OfficeGestao";
import JobsPage from "./pages/jobs/JobsPage";
import CrmLayout from "./pages/crm/CrmLayout";
import CrmDashboard from "./pages/crm/CrmDashboard";
import LeadList from "./pages/crm/LeadList";
import DealKanban from "./pages/crm/DealKanban";
import ContractList from "./pages/crm/ContractList";
import InvoiceList from "./pages/crm/InvoiceList";
import EngagementList from "./pages/crm/EngagementList";
import CrmForecast from "./pages/crm/CrmForecast";
import CrmActivities from "./pages/crm/CrmActivities";
import CrmAutomations from "./pages/crm/CrmAutomations";
import IntegrationsPage from "./pages/settings/IntegrationsPage";
import ProjectsList from "./pages/projects/ProjectsList";
import NewProject from "./pages/projects/NewProject";
import ProjectOverview from "./pages/projects/ProjectOverview";
import ProductBacklogPage from "./pages/projects/ProductBacklogPage";
import SprintBoardPage from "./pages/projects/SprintBoardPage";
import SprintsPage from "./pages/projects/SprintsPage";
import ProjectMetricsPage from "./pages/projects/ProjectMetricsPage";
import ImpedimentsPage from "./pages/projects/ImpedimentsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/workspaces" replace />} />
              <Route path="/workspaces" element={<WorkspacesList />} />
              <Route path="/workspaces/new" element={<NewWorkspace />} />
              <Route path="/workspaces/:id" element={<WorkspaceOverview />} />
              <Route path="/workspaces/:id/run/:squad" element={<RunDashboard />} />
              <Route
                path="/workspaces/:id/runs"
                element={
                  <Placeholder
                    title="Histórico de Runs"
                    step="Prompt 6"
                    description="Lista de execuções com status e links de output."
                  />
                }
              />
              <Route
                path="/workspaces/:id/runs/:runId"
                element={
                  <Placeholder
                    title="Output Viewer"
                    step="Prompt 6"
                    description="Markdown do relatório renderizado + link Drive."
                  />
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/whatsapp" element={<Navigate to="/settings?tab=whatsapp" replace />} />
              <Route path="/settings/models" element={<Navigate to="/settings?tab=models" replace />} />
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
              <Route path="/settings/integrations" element={<IntegrationsPage />} />

              <Route path="/projects" element={<ProjectsList />} />
              <Route path="/projects/new" element={<NewProject />} />
              <Route path="/projects/:id" element={<ProjectOverview />} />
              <Route path="/projects/:id/backlog" element={<ProductBacklogPage />} />
              <Route path="/projects/:id/board" element={<SprintBoardPage />} />
              <Route path="/projects/:id/sprints" element={<SprintsPage />} />
              <Route path="/projects/:id/metrics" element={<ProjectMetricsPage />} />
              <Route path="/projects/:id/impediments" element={<ImpedimentsPage />} />
              <Route path="/projects/:id/roadmap" element={<Placeholder title="Roadmap" step="Lote C" description="Release Plan visual." />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import WorkspacesList from "./pages/workspaces/WorkspacesList";
import NewWorkspace from "./pages/workspaces/NewWorkspace";
import WorkspaceOverview from "./pages/workspaces/WorkspaceOverview";
import RunDashboard from "./pages/workspaces/RunDashboard";
import SettingsPage from "./pages/settings/SettingsPage";
import OfficePage from "./pages/office/OfficePage";
import JobsPage from "./pages/jobs/JobsPage";

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
              <Route path="/jobs" element={<JobsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

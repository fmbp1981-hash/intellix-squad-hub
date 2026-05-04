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
              <Route
                path="/workspaces"
                element={
                  <Placeholder
                    title="Workspaces"
                    step="Prompt 3"
                    description="Lista de engagements e CRUD de workspaces será implementada aqui."
                  />
                }
              />
              <Route
                path="/workspaces/new"
                element={
                  <Placeholder
                    title="Novo Workspace"
                    step="Prompt 3"
                    description="Formulário de criação com cliente, engagement e template."
                  />
                }
              />
              <Route
                path="/workspaces/:id"
                element={
                  <Placeholder
                    title="Workspace Overview"
                    step="Prompt 3"
                    description="Visão geral do engagement, squads disponíveis e runs recentes."
                  />
                }
              />
              <Route
                path="/workspaces/:id/run/:squad"
                element={
                  <Placeholder
                    title="Escritório Virtual"
                    step="Prompt 5"
                    description="Dashboard ao vivo Phaser 2D com agentes animados em tempo real."
                  />
                }
              />
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
              <Route
                path="/settings"
                element={
                  <Placeholder
                    title="Configurações"
                    step="v2"
                    description="Configurações do workspace e da plataforma."
                  />
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

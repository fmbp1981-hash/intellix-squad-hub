import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Kanban, BookOpen, BarChart2 } from "lucide-react";
import ProjectOverview from "@/pages/projects/ProjectOverview";
import SprintBoardPage from "@/pages/projects/SprintBoardPage";
import ProductBacklogPage from "@/pages/projects/ProductBacklogPage";
import ProjectMetricsPage from "@/pages/projects/ProjectMetricsPage";

export default function ProjetoDetailPage() {
  return (
    <Tabs defaultValue="overview" className="flex h-full flex-col">
      <div className="border-b border-border px-6 pt-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2">
            <Kanban className="h-4 w-4" />
            Sprint Board
          </TabsTrigger>
          <TabsTrigger value="backlog" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Backlog
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            Métricas
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview" className="flex-1 overflow-auto mt-0">
        <ProjectOverview />
      </TabsContent>
      <TabsContent value="board" className="flex-1 overflow-auto mt-0">
        <SprintBoardPage />
      </TabsContent>
      <TabsContent value="backlog" className="flex-1 overflow-auto mt-0">
        <ProductBacklogPage />
      </TabsContent>
      <TabsContent value="metrics" className="flex-1 overflow-auto mt-0">
        <ProjectMetricsPage />
      </TabsContent>
    </Tabs>
  );
}

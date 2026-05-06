import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, LayoutGrid, BarChart3, AlertTriangle, Calendar } from "lucide-react";

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();

  const { data: project } = useQuery({
    enabled: !!id,
    queryKey: ["agile-project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("agile_projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: counts } = useQuery({
    enabled: !!id,
    queryKey: ["agile-project-counts", id],
    queryFn: async () => {
      const [stories, sprints, impediments] = await Promise.all([
        supabase.from("user_stories").select("id, story_points, status").eq("project_id", id!),
        supabase.from("sprints").select("id, status").eq("project_id", id!),
        supabase.from("impediments").select("id, status").eq("project_id", id!).eq("status", "open"),
      ]);
      const totalPoints = (stories.data ?? []).reduce((s, x: any) => s + (x.story_points ?? 0), 0);
      const activeSprint = (sprints.data ?? []).find((s: any) => s.status === "active");
      return {
        storyCount: stories.data?.length ?? 0,
        totalPoints,
        sprintCount: sprints.data?.length ?? 0,
        activeSprint,
        openImpediments: impediments.data?.length ?? 0,
      };
    },
  });

  if (!project) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const tabs = [
    { to: `/projects/${id}/board`, label: "Sprint Board", icon: LayoutGrid },
    { to: `/projects/${id}/backlog`, label: "Backlog", icon: ListChecks },
    { to: `/projects/${id}/sprints`, label: "Sprints", icon: Calendar },
    { to: `/projects/${id}/metrics`, label: "Métricas", icon: BarChart3 },
    { to: `/projects/${id}/impediments`, label: "Impedimentos", icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{project.client_name ?? "Projeto"}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {project.current_velocity ? Number(project.current_velocity).toFixed(0) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">pts / sprint</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{counts?.storyCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">{counts?.totalPoints ?? 0} pts no backlog</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sprints</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{counts?.sprintCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {counts?.activeSprint ? "1 ativo agora" : "nenhum ativo"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Impedimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${(counts?.openImpediments ?? 0) > 0 ? "text-orange-400" : ""}`}>
              {counts?.openImpediments ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">abertos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Button key={to} asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link to={to}>
              <Icon className="h-5 w-5" />
              <span className="text-sm">{label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ListChecks, LayoutGrid, BarChart3, AlertTriangle, Calendar,
  Briefcase, FileText, Sparkles, Loader2, CheckCircle2, RefreshCw,
  ChevronLeft, Layers, ArrowRight,
} from "lucide-react";
import { AIAssistantPanel } from "@/components/ai/AIAssistantPanel";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  planning:  "bg-slate-400/10 text-slate-400 border-slate-400/25",
  active:    "bg-emerald-400/10 text-emerald-400 border-emerald-400/25",
  on_hold:   "bg-orange-400/10 text-orange-400 border-orange-400/25",
  completed: "bg-primary/10 text-primary border-primary/25",
  cancelled: "bg-destructive/10 text-destructive border-destructive/25",
};

const STATUS_LABELS: Record<string, string> = {
  planning: "Planejamento", active: "Ativo", on_hold: "Em Pausa",
  completed: "Concluído", cancelled: "Cancelado",
};

const planningMeta: Record<string, { label: string; tone: string }> = {
  pending:   { label: "Aguardando IA de Operações", tone: "text-muted-foreground" },
  running:   { label: "IA detalhando o projeto…",   tone: "text-primary" },
  completed: { label: "Plano detalhado pronto",      tone: "text-emerald-400" },
  failed:    { label: "Falha no planejamento",        tone: "text-destructive" },
};

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    enabled: !!id,
    queryKey: ["agile-project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("agile_projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: modules } = useQuery({
    enabled: !!id,
    queryKey: ["agile-project-modules", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agile_projects")
        .select("id, name, status, description, project_type")
        .eq("parent_project_id", id!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: deal } = useQuery({
    enabled: !!project?.deal_id,
    queryKey: ["agile-project-deal", project?.deal_id],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("*").eq("id", project!.deal_id).maybeSingle();
      return data;
    },
  });

  const { data: contract } = useQuery({
    enabled: !!project?.contract_id,
    queryKey: ["agile-project-contract", project?.contract_id],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("id", project!.contract_id).maybeSingle();
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

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`agile-project-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "agile_projects", filter: `id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["agile-project", id] });
        queryClient.invalidateQueries({ queryKey: ["agile-project-counts", id] });
        queryClient.invalidateQueries({ queryKey: ["agile-project-modules", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, queryClient]);

  const replan = async () => {
    toast.info("Disparando IA de Operações…");
    const { error } = await supabase.functions.invoke("operations-detail-project", {
      body: { project_id: id, mode: "refinement" },
    });
    if (error) toast.error(error.message);
    else toast.success("Replanejamento iniciado");
  };

  if (!project) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const planMeta = planningMeta[project.auto_planning_status] ?? planningMeta.pending;

  const workSections = [
    {
      to: `/projects/${id}/backlog`,
      label: "Backlog",
      description: "Épicos, user stories e tarefas",
      icon: ListChecks,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
      primary: true,
    },
    {
      to: `/projects/${id}/board`,
      label: "Sprint Board",
      description: "Quadro de tarefas do sprint ativo",
      icon: LayoutGrid,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
      primary: true,
    },
    {
      to: `/projects/${id}/sprints`,
      label: "Sprints",
      description: "Histórico e planejamento de sprints",
      icon: Calendar,
      color: "text-sky-400",
      bg: "bg-sky-400/10 border-sky-400/20",
      primary: false,
    },
    {
      to: `/projects/${id}/metrics`,
      label: "Métricas",
      description: "Velocity, burndown e gráficos",
      icon: BarChart3,
      color: "text-violet-400",
      bg: "bg-violet-400/10 border-violet-400/20",
      primary: false,
    },
    {
      to: `/projects/${id}/impediments`,
      label: "Impedimentos",
      description: `${counts?.openImpediments ?? 0} aberto${(counts?.openImpediments ?? 0) !== 1 ? "s" : ""}`,
      icon: AlertTriangle,
      color: (counts?.openImpediments ?? 0) > 0 ? "text-orange-400" : "text-muted-foreground",
      bg: (counts?.openImpediments ?? 0) > 0 ? "bg-orange-400/10 border-orange-400/20" : "bg-muted/30 border-border",
      primary: false,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground px-2">
          <Link to="/projects">
            <ChevronLeft className="h-3.5 w-3.5" /> Projetos
          </Link>
        </Button>
      </div>

      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{project.client_name ?? "Projeto"}</p>
            <Badge
              variant="outline"
              className={`text-[10px] capitalize px-1.5 py-0 ${STATUS_COLORS[project.status] ?? ""}`}
            >
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
          )}
        </div>
        <AIAssistantPanel context="project" entityId={project.id} entityLabel={project.name} />
      </header>

      {/* ── Módulos (sub-projects) ── */}
      {modules && modules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-primary" />
              Módulos em Desenvolvimento
              <Badge className="ml-1 bg-primary/10 text-primary border-primary/25 text-[10px]">
                {modules.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {modules.map((mod) => (
                <Link key={mod.id} to={`/projects/${mod.id}`}>
                  <div className="group rounded-lg border border-border bg-muted/30 p-3 transition-all hover:border-primary/40 hover:bg-primary/5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{mod.name}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {mod.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
                    )}
                    <div className="mt-2 flex gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 capitalize ${STATUS_COLORS[mod.status] ?? ""}`}
                      >
                        {STATUS_LABELS[mod.status] ?? mod.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                        {mod.project_type}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Gestão de Trabalho ── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Gestão de Trabalho
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {workSections.filter((s) => s.primary).map(({ to, label, description, icon: Icon, color, bg }) => (
            <Link key={to} to={to}>
              <div className={`group flex items-center gap-4 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${bg}`}>
                <div className={`rounded-lg p-2.5 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {workSections.filter((s) => !s.primary).map(({ to, label, description, icon: Icon, color, bg }) => (
            <Link key={to} to={to}>
              <div className={`group flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${bg}`}>
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{project.current_velocity ? Number(project.current_velocity).toFixed(0) : "—"}</p>
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
            <p className="text-xs text-muted-foreground">{counts?.activeSprint ? "1 ativo agora" : "nenhum ativo"}</p>
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

      {/* ── Origem Comercial ── */}
      {(deal || contract) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-primary" /> Origem Comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            {deal && (
              <div>
                <p className="text-xs text-muted-foreground">Deal</p>
                <p className="font-medium">{deal.company_name}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {Number(deal.value).toLocaleString("pt-BR")} · fechamento {deal.expected_close ?? "—"}
                </p>
              </div>
            )}
            {contract && (
              <div>
                <p className="text-xs text-muted-foreground">Contrato</p>
                <p className="font-medium flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {contract.client_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  R$ {Number(contract.total_value).toLocaleString("pt-BR")} · {contract.start_date} → {contract.end_date ?? "—"}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className="capitalize">{deal?.status ?? "—"}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Planejamento IA ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Planejamento da IA de Operações
            </CardTitle>
            <Button size="sm" variant="outline" onClick={replan} disabled={project.auto_planning_status === "running"}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {project.auto_planning_status === "completed" ? "Replanejar" : "Acionar IA"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`flex items-center gap-2 text-sm ${planMeta.tone}`}>
            {project.auto_planning_status === "running"   && <Loader2 className="h-4 w-4 animate-spin" />}
            {project.auto_planning_status === "completed" && <CheckCircle2 className="h-4 w-4" />}
            {project.auto_planning_status === "failed"    && <AlertTriangle className="h-4 w-4" />}
            {project.auto_planning_status === "pending"   && <Sparkles className="h-4 w-4" />}
            {planMeta.label}
          </div>
          {project.auto_planning_error && (
            <p className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {project.auto_planning_error}
            </p>
          )}
          {project.execution_plan_md && (
            <details className="rounded border border-border bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Ver plano de execução gerado
              </summary>
              <pre className="mt-3 whitespace-pre-wrap text-xs text-foreground">{project.execution_plan_md}</pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

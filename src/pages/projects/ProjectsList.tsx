import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import {
  Plus, CheckCircle2, Briefcase,
  Sparkles, Loader2, AlertCircle, Award, Kanban as KanbanIcon,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";

type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
type View = "kanban" | "portfolio";

interface AgileProject {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  project_type: string;
  status: ProjectStatus;
  is_portfolio: boolean;
  deal_id: string | null;
  auto_planning_status: string | null;
  current_velocity: number | null;
  sprint_duration_days: number | null;
  parent_project_id: string | null;
}

const STATUS_COLUMNS: {
  id: ProjectStatus;
  label: string;
  dot: string;
  bg: string;
  border: string;
  count: string;
}[] = [
  { id: "planning",  label: "Planejamento", dot: "bg-slate-400",      bg: "bg-slate-400/8",      border: "border-slate-400/20",   count: "bg-slate-400/15 text-slate-400" },
  { id: "active",    label: "Ativo",        dot: "bg-emerald-400",    bg: "bg-emerald-400/8",    border: "border-emerald-400/20", count: "bg-emerald-400/15 text-emerald-400" },
  { id: "on_hold",   label: "Em Pausa",     dot: "bg-orange-400",     bg: "bg-orange-400/8",     border: "border-orange-400/20",  count: "bg-orange-400/15 text-orange-400" },
  { id: "completed", label: "Concluído",    dot: "bg-primary",        bg: "bg-primary/8",        border: "border-primary/20",     count: "bg-primary/15 text-primary" },
  { id: "cancelled", label: "Cancelado",    dot: "bg-destructive",    bg: "bg-destructive/8",    border: "border-destructive/20", count: "bg-destructive/15 text-destructive" },
];

const PLANNING_META: Record<string, { label: string; icon: typeof Sparkles; spin?: boolean }> = {
  pending:   { label: "Aguardando IA", icon: Sparkles },
  running:   { label: "Planejando…",   icon: Loader2,  spin: true },
  completed: { label: "Plano pronto",  icon: CheckCircle2 },
  failed:    { label: "Falhou",        icon: AlertCircle },
};

function groupByStatus(projects: AgileProject[]): Record<ProjectStatus, AgileProject[]> {
  const groups = {} as Record<ProjectStatus, AgileProject[]>;
  for (const col of STATUS_COLUMNS) groups[col.id] = [];
  for (const p of projects) {
    if (groups[p.status]) groups[p.status].push(p);
    else groups["planning"].push(p);
  }
  return groups;
}

function ProjectCard({
  project,
  index,
  moduleCount,
}: {
  project: AgileProject;
  index: number;
  moduleCount: number;
}) {
  const planMeta = PLANNING_META[project.auto_planning_status ?? "pending"] ?? PLANNING_META.pending;
  const PlanIcon = planMeta.icon;

  return (
    <Draggable draggableId={project.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow select-none ${
            snapshot.isDragging ? "shadow-lg ring-1 ring-primary/40 rotate-1" : "hover:shadow-md"
          }`}
        >
          <Link to={`/projects/${project.id}`} onClick={(e) => snapshot.isDragging && e.preventDefault()}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-sm font-semibold leading-tight line-clamp-2">{project.name}</p>
              {project.is_portfolio && (
                <Badge className="shrink-0 gap-0.5 bg-primary/10 text-[9px] text-primary border-primary/25 px-1.5">
                  <Award className="h-2 w-2" /> Portfólio
                </Badge>
              )}
            </div>

            {project.client_name && (
              <p className="text-xs text-muted-foreground mb-2">{project.client_name}</p>
            )}

            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                {project.project_type}
              </Badge>
              {project.deal_id && (
                <Badge variant="secondary" className="gap-0.5 text-[10px] px-1.5 py-0">
                  <Briefcase className="h-2.5 w-2.5" /> CRM
                </Badge>
              )}
              {moduleCount > 0 && (
                <Badge variant="secondary" className="gap-0.5 text-[10px] px-1.5 py-0 text-primary border-primary/30 bg-primary/10">
                  <Layers className="h-2.5 w-2.5" /> {moduleCount} módulo{moduleCount > 1 ? "s" : ""}
                </Badge>
              )}
              <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 text-muted-foreground">
                <PlanIcon className={`h-2.5 w-2.5 ${planMeta.spin ? "animate-spin" : ""}`} />
                {planMeta.label}
              </Badge>
            </div>

            {project.current_velocity != null && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Velocity: <span className="font-semibold text-foreground">{Number(project.current_velocity).toFixed(0)} pts</span>
              </p>
            )}
          </Link>
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({
  column,
  projects,
  moduleCounts,
}: {
  column: typeof STATUS_COLUMNS[number];
  projects: AgileProject[];
  moduleCounts: Record<string, number>;
}) {
  return (
    <div className={`flex w-72 shrink-0 flex-col rounded-xl border ${column.border} ${column.bg}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-inherit shrink-0">
        <span className={`h-2 w-2 rounded-full ${column.dot}`} />
        <span className="text-sm font-semibold">{column.label}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${column.count}`}>
          {projects.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] overflow-y-auto p-3 transition-colors rounded-b-xl ${
              snapshot.isDraggingOver ? "bg-primary/5" : ""
            }`}
            style={{ maxHeight: "calc(100vh - 220px)" }}
          >
            {projects.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} moduleCount={moduleCounts[p.id] ?? 0} />
            ))}
            {provided.placeholder}
            {projects.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/50">
                <p className="text-xs text-muted-foreground">Solte aqui</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function ProjectsList() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("kanban");
  const [columns, setColumns] = useState<Record<ProjectStatus, AgileProject[]>>(() =>
    groupByStatus([])
  );

  const { data, isLoading } = useQuery({
    queryKey: ["agile-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agile_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgileProject[];
    },
  });

  // Root projects only (no parent) for the kanban
  const rootProjects = (data ?? []).filter((p) => !p.parent_project_id);

  // Count modules per root project
  const moduleCounts: Record<string, number> = {};
  for (const p of data ?? []) {
    if (p.parent_project_id) {
      moduleCounts[p.parent_project_id] = (moduleCounts[p.parent_project_id] ?? 0) + 1;
    }
  }

  useEffect(() => {
    if (data) setColumns(groupByStatus(rootProjects));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    const ch = supabase
      .channel("agile-projects-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "agile_projects" }, () => {
        queryClient.invalidateQueries({ queryKey: ["agile-projects"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase
        .from("agile_projects")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      if (data) setColumns(groupByStatus(rootProjects));
      toast({ title: "Erro ao mover projeto", variant: "destructive" });
    },
  });

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

    const srcId = source.droppableId as ProjectStatus;
    const dstId = destination.droppableId as ProjectStatus;

    setColumns((prev) => {
      const next = { ...prev };
      const srcList = [...prev[srcId]];
      const dstList = srcId === dstId ? srcList : [...prev[dstId]];
      const [moved] = srcList.splice(source.index, 1);
      dstList.splice(destination.index, 0, { ...moved, status: dstId });
      next[srcId] = srcList;
      next[dstId] = dstList;
      return next;
    });

    updateStatus.mutate({ id: draggableId, status: dstId });
  }, [updateStatus]);

  const portfolioProjects = (data ?? []).filter((p) => p.is_portfolio);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos Ágeis</h1>
          <p className="text-sm text-muted-foreground">
            Sprints, backlog e métricas no padrão PMI Agile + Scrum.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="kanban" className="gap-1.5">
                <KanbanIcon className="h-3.5 w-3.5" /> Kanban
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="gap-1.5">
                <Award className="h-3.5 w-3.5" /> Portfólio
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button asChild size="sm">
            <Link to="/projects/new">
              <Plus className="mr-1.5 h-4 w-4" /> Novo Projeto
            </Link>
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {isLoading ? (
            <div className="flex gap-4 p-6">
              {STATUS_COLUMNS.map((col) => (
                <div key={col.id} className="w-72 shrink-0 h-48 animate-pulse rounded-xl bg-accent" />
              ))}
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 p-6 h-full" style={{ minWidth: "max-content" }}>
                {STATUS_COLUMNS.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    projects={columns[col.id] ?? []}
                    moduleCounts={moduleCounts}
                  />
                ))}
                {/* Add project placeholder */}
                <div className="flex w-64 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-border/40 gap-2 py-8">
                  <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                    <Link to="/projects/new">
                      <Plus className="mr-1.5 h-4 w-4" /> Novo Projeto
                    </Link>
                  </Button>
                </div>
              </div>
            </DragDropContext>
          )}
        </div>
      )}

      {/* Portfolio View */}
      {view === "portfolio" && (
        <div className="flex-1 overflow-y-auto p-6">
          {portfolioProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Award className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nenhum projeto em portfólio</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Projetos concluídos e entregues com <code>is_portfolio = true</code> aparecem aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {portfolioProjects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`}>
                  <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-tight">{p.name}</h3>
                        <Badge className="shrink-0 gap-0.5 bg-primary/10 text-[9px] text-primary border-primary/25">
                          <Award className="h-2 w-2" /> Live
                        </Badge>
                      </div>
                      {p.client_name && (
                        <p className="text-xs text-muted-foreground">{p.client_name}</p>
                      )}
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {p.project_type}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

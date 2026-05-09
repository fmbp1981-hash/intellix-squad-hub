import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plus, Rocket, Activity, Pause, CheckCircle2, Briefcase,
  Sparkles, Loader2, AlertCircle, Award
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusMeta: Record<string, { label: string; icon: typeof Activity; tone: string }> = {
  planning:  { label: "Planejamento", icon: Rocket,        tone: "text-muted-foreground" },
  active:    { label: "Ativo",        icon: Activity,      tone: "text-emerald-400" },
  on_hold:   { label: "Em pausa",     icon: Pause,         tone: "text-orange-400" },
  completed: { label: "Concluído",    icon: CheckCircle2,  tone: "text-primary" },
  cancelled: { label: "Cancelado",    icon: Pause,         tone: "text-destructive" },
};

const planningMeta: Record<string, { label: string; icon: typeof Sparkles; tone: string }> = {
  pending:   { label: "Aguardando IA", icon: Sparkles,     tone: "text-muted-foreground" },
  running:   { label: "Planejando…",   icon: Loader2,      tone: "text-primary animate-spin" },
  completed: { label: "Plano pronto",  icon: CheckCircle2, tone: "text-emerald-400" },
  failed:    { label: "Falhou",        icon: AlertCircle,  tone: "text-destructive" },
};

type Tab = "todos" | "portfolio";

export default function ProjectsList() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["agile-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agile_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("agile-projects-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "agile_projects" }, () => {
        queryClient.invalidateQueries({ queryKey: ["agile-projects"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const filtered = data?.filter((p: any) =>
    tab === "portfolio" ? p.is_portfolio === true : true
  ) ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos Ágeis</h1>
          <p className="text-sm text-muted-foreground">
            Sprints, backlog e métricas no padrão PMI Agile + Scrum.
          </p>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
          </Link>
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-1.5">
            <Award className="h-3.5 w-3.5" /> Portfólio
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            {tab === "portfolio" ? (
              <>
                <Award className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nenhum projeto em portfólio</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Projetos concluídos e em produção aparecem aqui como vitrine do trabalho entregue.
                </p>
              </>
            ) : (
              <>
                <Rocket className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nenhum projeto ainda</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Projetos são criados automaticamente quando um Deal é fechado no CRM. Você também pode criar manualmente.
                </p>
                <Button asChild className="mt-6">
                  <Link to="/projects/new">
                    <Plus className="mr-2 h-4 w-4" /> Criar projeto manual
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: any) => {
            const meta = statusMeta[p.status] ?? statusMeta.planning;
            const Icon = meta.icon;
            const planMeta = planningMeta[p.auto_planning_status] ?? planningMeta.pending;
            const PlanIcon = planMeta.icon;
            return (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{p.name}</h3>
                      <div className="flex shrink-0 items-center gap-1">
                        {p.is_portfolio && (
                          <Badge className="gap-1 bg-primary/15 text-[10px] text-primary border-primary/30">
                            <Award className="h-2.5 w-2.5" /> Portfólio
                          </Badge>
                        )}
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {p.project_type}
                        </Badge>
                      </div>
                    </div>
                    {p.client_name && (
                      <p className="text-xs text-muted-foreground">{p.client_name}</p>
                    )}
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.deal_id && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Briefcase className="h-3 w-3" /> Origem: Comercial
                        </Badge>
                      )}
                      <Badge variant="outline" className={`gap-1 text-[10px] ${planMeta.tone}`}>
                        <PlanIcon className={`h-3 w-3 ${p.auto_planning_status === "running" ? "animate-spin" : ""}`} />
                        {planMeta.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className={`flex items-center gap-1.5 text-xs ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Velocity</span>
                      <span className="font-semibold text-foreground">
                        {p.current_velocity ? `${Number(p.current_velocity).toFixed(0)} pts` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Sprint</span>
                      <span>{p.sprint_duration_days}d</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

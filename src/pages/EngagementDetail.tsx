import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Activity, AlertTriangle, Sparkles } from "lucide-react";
import { useEngagementDetail } from "@/hooks/useEngagementDetail";
import { EspModuleList } from "@/components/engagement/EspModuleList";
import { SprintKanban, type KanbanTask } from "@/components/sprint/SprintKanban";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const HEALTH_COLOR = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
} as const;

export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useEngagementDetail(id);

  if (isLoading) return <DetailSkeleton />;

  if (!data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-muted-foreground">Engagement não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/engagements")}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const { engagement, esp_package, modules, recent_runs } = data;
  const tasks: KanbanTask[] = []; // Sprint kanban: integração com sprint/tasks via Fase 3

  return (
    <div className="space-y-6 p-6">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 -mx-6 border-b bg-background/95 px-6 pb-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="sm" onClick={() => navigate("/engagements")} className="-ml-2 mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" /> Engagements
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full",
                HEALTH_COLOR[engagement.health as keyof typeof HEALTH_COLOR] ?? "bg-zinc-500")} />
              <h1 className="truncate text-2xl font-semibold tracking-tight">{engagement.name}</h1>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{esp_package?.type ?? "undetermined"}</Badge>
              <Badge variant="outline">{engagement.status}</Badge>
              {engagement.start_date && (
                <span>Início {new Date(engagement.start_date).toLocaleDateString("pt-BR")}</span>
              )}
              {engagement.end_date && (
                <span>· ETA {new Date(engagement.end_date).toLocaleDateString("pt-BR")}</span>
              )}
              {engagement.routed_agent_names.length > 0 && (
                <span>· Squad: {engagement.routed_agent_names.join(", ")}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {modules.map((m) => (
              <span
                key={m.module_code}
                title={`Módulo ${m.module_code} — ${m.status}`}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
                  m.status === "approved" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                  m.status === "review" && "border-blue-500/40 bg-blue-500/10 text-blue-400",
                  m.status === "drafting" && "border-amber-500/40 bg-amber-500/10 text-amber-400",
                  m.status === "needs_revision" && "border-rose-500/40 bg-rose-500/10 text-rose-400",
                  m.status === "not_started" && "border-border bg-card text-muted-foreground",
                )}
              >
                {m.module_code}
              </span>
            ))}
          </div>
        </div>
      </div>

      {engagement.blocker_note && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Bloqueio ativo</p>
            <p className="text-rose-300/80">{engagement.blocker_note}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {/* Seção 1 — Sprint kanban */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sprint atual
            </h2>
            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
                Sprint será gerada quando o ESP for aprovado e a primeira tarefa entrar no backlog.
              </div>
            ) : (
              <SprintKanban tasks={tasks} />
            )}
          </section>

          {/* Seção 2 — ESP modular */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Engagement Solution Package
            </h2>
            {esp_package?.diagnosis_md && (
              <div className="mb-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                  Diagnóstico
                </p>
                <p className="whitespace-pre-wrap">{esp_package.diagnosis_md}</p>
              </div>
            )}
            <EspModuleList modules={modules} />
          </section>

          {/* Seção 3 — Atividade recente */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Activity className="h-4 w-4" /> Atividade recente
            </h2>
            {recent_runs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card/40 p-4 text-center text-xs text-muted-foreground">
                Sem corridas LLM registradas para este engagement.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {recent_runs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-foreground">{r.agent_name}</span>
                      {r.job_name && <span className="text-muted-foreground">· {r.job_name}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{r.llm_provider}/{r.llm_model}</span>
                      <span>{(r.tokens_in + r.tokens_out).toLocaleString("pt-BR")} tk</span>
                      <span>US$ {Number(r.cost_usd).toFixed(4)}</span>
                      <span>{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-3 text-xs">
          <SidebarBlock title="Cliente">
            <p className="font-medium text-foreground">{engagement.name}</p>
          </SidebarBlock>

          <SidebarBlock title="Contrato">
            {engagement.contract_id
              ? <p className="font-mono text-[10px]">{engagement.contract_id}</p>
              : <p className="text-muted-foreground">Sem contrato vinculado</p>}
            {engagement.budget_brl_estimate && (
              <p className="mt-1 text-muted-foreground">
                Budget: R$ {engagement.budget_brl_estimate.toLocaleString("pt-BR")}
              </p>
            )}
          </SidebarBlock>

          <SidebarBlock title="Squad alocado">
            {engagement.routed_agent_names.length > 0 ? (
              <ul className="space-y-1">
                {engagement.routed_agent_names.map((n) => (
                  <li key={n} className="rounded-md border bg-background px-2 py-1">{n}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nenhum routing aplicado.</p>
            )}
            {engagement.routed_at && (
              <p className="mt-2 text-muted-foreground">
                Roteado em {new Date(engagement.routed_at).toLocaleDateString("pt-BR")}
              </p>
            )}
          </SidebarBlock>

          <SidebarBlock title="ESP">
            <p>Status: <span className="font-medium text-foreground">{esp_package?.status ?? "—"}</span></p>
            {esp_package?.classified_by_agent && (
              <p className="text-muted-foreground">Classificado por {esp_package.classified_by_agent}</p>
            )}
            {esp_package?.validated_by_agent && (
              <p className="text-muted-foreground">Validado por {esp_package.validated_by_agent}</p>
            )}
          </SidebarBlock>
        </aside>
      </div>
    </div>
  );
}

function SidebarBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

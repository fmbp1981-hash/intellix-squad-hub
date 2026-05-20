import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Monitor, Box, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  IntelliXOfficeViewer,
  type AgentExternalState,
  type SquadRunInfo,
} from "@/components/office/IntelliXOfficeViewer";
import OfficeViewer2D from "@/components/office/OfficeViewer2D";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IntelliXBrand } from "@/components/brand/IntelliXBrand";

const STATUS_COLOR: Record<string, string> = {
  working:    "bg-primary/15 text-primary border-primary/30",
  walking:    "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  done:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  checkpoint: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  coffee:     "bg-orange-700/15 text-orange-400 border-orange-700/30",
  idle:       "bg-muted text-muted-foreground border-border",
  meeting:    "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

type ViewMode = "3d" | "2d";

export default function OfficePage() {
  const { isAdmin, loading } = useIsAdmin();
  const [agentStates, setAgentStates] = useState<AgentExternalState[]>([]);
  const [squadRun, setSquadRun] = useState<SquadRunInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [activityOpen, setActivityOpen] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [{ data: jobs }, { data: runs }] = await Promise.all([
        supabase
          .from("internal_jobs")
          .select("id, agent_key, status, job_type")
          .in("status", ["pending", "running"])
          .limit(100),
        supabase
          .from("squad_runs")
          .select("id, squad_name, status, started_at")
          .eq("status", "running")
          .order("started_at", { ascending: false })
          .limit(1),
      ]);
      if (!active) return;

      const map = new Map<string, AgentExternalState>();
      (jobs ?? []).forEach((j: { agent_key?: string | null; status: string; job_type?: string }) => {
        if (!j.agent_key) return;
        map.set(j.agent_key, {
          agentKey: j.agent_key,
          status: j.status === "running" ? "working" : "idle",
          currentJob: j.job_type,
        });
      });

      const activeRun = runs?.[0];
      if (activeRun) {
        ["ana", "bruno", "beatriz", "roberto"].forEach((k) => {
          if (!map.has(k))
            map.set(k, { agentKey: k, status: "meeting", currentJob: activeRun.squad_name });
        });
        setSquadRun({ id: activeRun.id, name: activeRun.squad_name, color: 0x5b21b6 });
      } else {
        setSquadRun(null);
      }

      setAgentStates(Array.from(map.values()));
    };
    load();
    const channel = supabase
      .channel("office-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "squad_runs" }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const viewerHeight = "calc(100vh - 14rem)";

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">
            <IntelliXBrand />
            <span className="text-muted-foreground"> · Escritório Virtual</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Agentes em tempo real por departamento
          </p>
        </div>

        {/* View toggle */}
        <div
          className="flex items-center gap-1 rounded-lg p-1"
          style={{
            background: "hsl(240 17% 9%)",
            border: "1px solid hsl(240 16% 18%)",
          }}
        >
          <button
            onClick={() => setViewMode("3d")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              viewMode === "3d"
                ? "bg-gradient-brand text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Box className="h-3.5 w-3.5" />
            3D Isométrico
          </button>
          <button
            onClick={() => setViewMode("2d")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              viewMode === "2d"
                ? "bg-gradient-brand text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
            2D Planta
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Canvas viewer — takes all available space */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border">
          {viewMode === "3d" ? (
            <IntelliXOfficeViewer
              agentStates={agentStates}
              squadRun={squadRun}
              onAgentClick={(key) => toast(`Agente: ${key}`)}
              height={680}
            />
          ) : (
            <OfficeViewer2D squadState={null} agentExternalStates={agentStates} />
          )}
        </div>

        {/* Activity sidebar */}
        <div
          className="flex w-64 shrink-0 flex-col gap-3 overflow-auto rounded-xl p-4"
          style={{
            background: "hsl(240 17% 9%)",
            border: "1px solid hsl(240 16% 18%)",
            maxHeight: viewerHeight,
          }}
        >
          {/* Squad run banner */}
          {squadRun && (
            <div
              className="rounded-lg p-3"
              style={{
                background: "hsl(262 83% 58% / 0.08)",
                border: "1px solid hsl(262 83% 58% / 0.25)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🚀</span>
                <p className="text-xs font-semibold text-primary">Squad em execução</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                {squadRun.name}
              </p>
            </div>
          )}

          {/* Activity panel */}
          <div>
            <button
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground"
              onClick={() => setActivityOpen((v) => !v)}
            >
              Atividade
              {activityOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {activityOpen && (
              <div className="mt-2 space-y-1.5">
                {agentStates.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Nenhum job ativo. O escritório segue em rotina autônoma.
                  </p>
                ) : (
                  agentStates.map((s) => (
                    <div
                      key={s.agentKey}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2"
                      style={{
                        background: "hsl(240 16% 12%)",
                        border: "1px solid hsl(240 16% 18%)",
                      }}
                    >
                      <div>
                        <p className="text-xs font-semibold capitalize text-foreground">
                          {s.agentKey}
                        </p>
                        {s.currentJob && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {s.currentJob}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", STATUS_COLOR[s.status ?? "idle"])}
                      >
                        {s.status ?? "idle"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Agents roster */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
              Equipe
            </p>
            <div className="space-y-1">
              {[
                { key: "agata", name: "Ágata", role: "COO", color: "#7c3aed" },
                { key: "carlos", name: "Carlos", role: "Comercial", color: "#10b981" },
                { key: "flora", name: "Flora", role: "Financeiro", color: "#06b6d4" },
                { key: "maya", name: "Maya", role: "Marketing", color: "#f97316" },
                { key: "heitor", name: "Heitor", role: "TI", color: "#ec4899" },
                { key: "marcio", name: "Márcio", role: "Ops", color: "#f59e0b" },
                { key: "ana", name: "Ana", role: "Analyst", color: "#5b21b6" },
                { key: "bruno", name: "Bruno", role: "Dev", color: "#2563eb" },
                { key: "beatriz", name: "Beatriz", role: "Strategist", color: "#7c3aed" },
                { key: "roberto", name: "Roberto", role: "Reviewer", color: "#059669" },
              ].map((a) => {
                const active = agentStates.find((s) => s.agentKey === a.key);
                return (
                  <div
                    key={a.key}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: a.color }}
                    >
                      {a.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground">{a.role}</p>
                    </div>
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: active?.status === "working" ? "#10b981"
                          : active?.status === "meeting" ? "#7c3aed"
                          : "hsl(240 16% 28%)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  IntelliXOfficeViewer,
  type AgentExternalState,
  type SquadRunInfo,
} from "@/components/office/IntelliXOfficeViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_COLOR: Record<string, string> = {
  working: "bg-primary/15 text-primary border-primary/30",
  walking: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  checkpoint: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  coffee: "bg-orange-700/15 text-orange-400 border-orange-700/30",
  idle: "bg-muted text-muted-foreground border-border",
};

export default function OfficePage() {
  const { isAdmin, loading } = useIsAdmin();
  const [agentStates, setAgentStates] = useState<AgentExternalState[]>([]);
  const [squadRun, setSquadRun] = useState<SquadRunInfo | null>(null);

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
        const status = j.status === "running" ? "working" : "idle";
        map.set(j.agent_key, {
          agentKey: j.agent_key,
          status: status as AgentExternalState["status"],
          currentJob: j.job_type,
        });
      });

      // When a squad run is active, force the 4 polymorphic agents into "meeting" state
      const activeRun = runs?.[0];
      if (activeRun) {
        ["ana", "bruno", "beatriz", "roberto"].forEach((k) => {
          if (!map.has(k)) {
            map.set(k, { agentKey: k, status: "meeting", currentJob: activeRun.squad_name });
          }
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold">
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            IntelliX.AI
          </span>{" "}
          · Escritório Virtual
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualização isométrica em tempo real dos agentes ativos por departamento.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <IntelliXOfficeViewer
          agentStates={agentStates}
          onAgentClick={(key) => toast(`Agente: ${key}`)}
          height={680}
        />

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Atividade</h3>
            {agentStates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum agente em job ativo. O escritório segue em rotina autônoma.
              </p>
            ) : (
              <div className="space-y-2">
                {agentStates.map((s) => (
                  <div
                    key={s.agentKey}
                    className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-1.5"
                  >
                    <span className="text-xs font-medium capitalize">{s.agentKey}</span>
                    <Badge variant="outline" className={STATUS_COLOR[s.status ?? "idle"]}>
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

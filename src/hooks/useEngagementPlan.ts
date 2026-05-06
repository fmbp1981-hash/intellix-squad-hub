import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SquadEntry = {
  squad: string;
  depends_on?: string[];
  phase_id?: string | null;
};

export type EngagementPlan = {
  id: string;
  workspace_id: string | null;
  squads_ordered: SquadEntry[];
  auto_advance: boolean;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  current_squad: string | null;
  completed_squads: string[];
  created_at: string;
  updated_at: string;
};

export type SquadRun = {
  id: string;
  workspace_id: string | null;
  squad_name: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  state_snapshot: unknown;
};

export function useEngagementPlan(workspaceId: string | undefined) {
  const [plan, setPlan] = useState<EngagementPlan | null>(null);
  const [runs, setRuns] = useState<SquadRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data: planRow } = await supabase
        .from("engagement_plans")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: runRows } = await supabase
        .from("squad_runs")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setPlan((planRow as unknown as EngagementPlan) ?? null);
      setRuns((runRows as unknown as SquadRun[]) ?? []);
      setLoading(false);
    }
    load();

    const ch = supabase
      .channel(`engagement-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "engagement_plans", filter: `workspace_id=eq.${workspaceId}` },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "squad_runs", filter: `workspace_id=eq.${workspaceId}` },
        load,
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [workspaceId]);

  const derived = useMemo(() => {
    const completed = plan?.completed_squads ?? [];
    const squads = plan?.squads_ordered ?? [];
    const eligibleSquads = squads.filter(
      (s) => !completed.includes(s.squad) && (s.depends_on ?? []).every((d) => completed.includes(d)),
    );
    const total = squads.length;
    const progress = total === 0 ? 0 : Math.round((completed.length / total) * 100);
    const activeRun = runs.find((r) => r.status === "running") ?? null;
    const checkpointRun = runs.find((r) => r.status === "checkpoint") ?? null;
    return { eligibleSquads, progress, activeRun, checkpointRun };
  }, [plan, runs]);

  return { plan, runs, loading, ...derived };
}

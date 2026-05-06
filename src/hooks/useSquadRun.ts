import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSquadRun(runId: string | undefined) {
  const [run, setRun] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    async function load() {
      const [{ data: r }, { data: s }, { data: p }] = await Promise.all([
        supabase.from("squad_runs").select("*").eq("id", runId!).maybeSingle(),
        supabase
          .from("pipeline_step_outputs")
          .select("*")
          .eq("run_id", runId!)
          .order("step_number", { ascending: true }),
        supabase
          .from("agent_prompts")
          .select("*")
          .eq("run_id", runId!)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setRun(r);
      setSteps(s ?? []);
      setPrompts(p ?? []);
      setLoading(false);
    }
    load();

    const ch = supabase
      .channel(`squad-run-${runId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "squad_runs", filter: `id=eq.${runId}` }, load)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pipeline_step_outputs", filter: `run_id=eq.${runId}` },
        load,
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [runId]);

  return { run, steps, prompts, loading };
}

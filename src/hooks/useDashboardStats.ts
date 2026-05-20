import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  active_engagements: number;
  by_status: { planning: number; active: number; blocked: number };
  agents_total: number;
  agents_busy: number;
  cost_today_usd: number;
  tokens_today: number;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [engs, agents, runs] = await Promise.all([
        supabase.from("engagements").select("status").in("status", ["planning", "active", "blocked"]),
        supabase.from("agent_configs").select("id", { count: "exact", head: true }).eq("active", true),
        supabase
          .from("agent_runs")
          .select("status, cost_usd, tokens_in, tokens_out")
          .gte("created_at", today.toISOString()),
      ]);

      const by_status = { planning: 0, active: 0, blocked: 0 };
      for (const e of engs.data ?? []) {
        const s = e.status as keyof typeof by_status;
        if (by_status[s] !== undefined) by_status[s]++;
      }

      let cost = 0, tk_in = 0, tk_out = 0, busy = 0;
      for (const r of runs.data ?? []) {
        cost += Number(r.cost_usd ?? 0);
        tk_in += Number(r.tokens_in ?? 0);
        tk_out += Number(r.tokens_out ?? 0);
        if (r.status === "running") busy++;
      }

      return {
        active_engagements: (engs.data ?? []).length,
        by_status,
        agents_total: agents.count ?? 0,
        agents_busy: busy,
        cost_today_usd: cost,
        tokens_today: tk_in + tk_out,
      };
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentCardData, AgentStatus } from "@/components/squad/AgentCard";

export interface SquadOverview {
  agents: AgentCardData[];
  active_runs: {
    id: string;
    agent_name: string;
    job_name: string | null;
    engagement_name: string | null;
    started_at: string | null;
    duration_ms: number | null;
    llm_provider: string;
    llm_model: string;
  }[];
  totals: { busy: number; total: number; tokens_today: number; cost_today_usd: number };
}

interface AgentRow {
  id: string;
  name: string;
  role: string | null;
  llm_provider: string | null;
  llm_model: string | null;
  active: boolean;
}

interface ActiveRunRow {
  id: string;
  agent_name: string;
  job_name: string | null;
  llm_provider: string;
  llm_model: string;
  started_at: string | null;
  status: string;
  engagements: { name: string }[] | null;
}

interface TodayRunRow {
  agent_name: string;
  status: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

export function useSquadOverview() {
  return useQuery<SquadOverview>({
    queryKey: ["squad-overview"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [agentsRes, activeRunsRes, todayRunsRes] = await Promise.all([
        supabase.from("agent_configs")
          .select("id, name, role, llm_provider, llm_model, active")
          .eq("active", true)
          .order("name"),
        supabase.from("agent_runs")
          .select("id, agent_name, job_name, llm_provider, llm_model, started_at, status, engagements(name)")
          .eq("status", "running")
          .order("started_at", { ascending: false }),
        supabase.from("agent_runs")
          .select("agent_name, status, tokens_in, tokens_out, cost_usd")
          .gte("created_at", today.toISOString()),
      ]);

      const agents = (agentsRes.data ?? []) as AgentRow[];
      const activeRuns = (activeRunsRes.data ?? []) as ActiveRunRow[];
      const todayRuns = (todayRunsRes.data ?? []) as TodayRunRow[];

      const busyByAgent = new Map<string, ActiveRunRow>();
      for (const r of activeRuns) busyByAgent.set(r.agent_name, r);

      const tokensByAgent = new Map<string, number>();
      for (const r of todayRuns) {
        tokensByAgent.set(r.agent_name, (tokensByAgent.get(r.agent_name) ?? 0) + r.tokens_in + r.tokens_out);
      }

      const cards: AgentCardData[] = agents.map((a): AgentCardData => {
        const running = busyByAgent.get(a.name);
        const status: AgentStatus = running ? "working" : a.active ? "idle" : "off";
        return {
          id: a.id,
          name: a.name,
          role: a.role ?? null,
          status,
          current_engagement: running?.engagements?.[0]?.name ?? null,
          current_job: running?.job_name ?? null,
          tokens_today: tokensByAgent.get(a.name) ?? 0,
          duration_label: running?.started_at ? humanDuration(Date.now() - new Date(running.started_at).getTime()) : null,
          llm_model: a.llm_model ?? null,
        };
      });

      const cost_today_usd = todayRuns.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
      const tokens_today = todayRuns.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0);

      return {
        agents: cards,
        active_runs: activeRuns.map((r) => ({
          id: r.id,
          agent_name: r.agent_name,
          job_name: r.job_name,
          engagement_name: r.engagements?.[0]?.name ?? null,
          started_at: r.started_at,
          duration_ms: r.started_at ? Date.now() - new Date(r.started_at).getTime() : null,
          llm_provider: r.llm_provider,
          llm_model: r.llm_model,
        })),
        totals: {
          busy: activeRuns.length,
          total: agents.length,
          tokens_today,
          cost_today_usd,
        },
      };
    },
  });
}

function humanDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

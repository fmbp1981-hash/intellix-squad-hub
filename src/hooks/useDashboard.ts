import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DashboardSummary = {
  mrr: number;
  pipeline_value: number;
  pipeline_count: number;
  engagements: { total: number; by_health: Record<string, number> };
  sprints_active: number;
  jobs_running: number;
  feed: Array<{ type: string; id: string; label: string; status: string; at: string; ref_id: string | null }>;
  projects: Array<{ id: string; name: string; client_name: string | null; status: string; total_story_points: number | null; completed_points: number | null; current_velocity: number | null }>;
  okrs: Array<{ id: string; objective: string; key_result: string | null; department: string; current_value: number | null; target_value: number | null; progress: number; status: string }>;
  funnel: Record<string, number>;
  deals_funnel: Record<string, number>;
  invoices_summary: { pending: number; overdue: number; next_7_days: number };
  tokens: { consumed_usd: number; budget_usd: number };
};

export function useDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.rpc("dashboard_summary" as any);
    if (err) setError(err.message);
    else setData(res as unknown as DashboardSummary);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { data, loading, error, reload: load };
}

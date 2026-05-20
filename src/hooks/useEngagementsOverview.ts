import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EngagementCardData } from "@/components/engagement/EngagementCard";

export interface EngagementOverview extends EngagementCardData {
  start_date?: string | null;
  end_date?: string | null;
  health?: "green" | "yellow" | "red";
}

const STATUS_PROGRESS: Record<string, number> = {
  planning: 10,
  active: 50,
  blocked: 30,
  completed: 100,
  cancelled: 0,
};

interface EngagementRow {
  id: string;
  name: string;
  status: string;
  health: "green" | "yellow" | "red";
  start_date: string | null;
  end_date: string | null;
  routed_agent_names: string[] | null;
  esp_packages: { type: string | null }[] | null;
}

interface EspModuleRow {
  esp_package_id: string;
  module_code: string;
  required: boolean;
  esp_packages: { engagement_id: string }[] | null;
}

export function useEngagementsOverview(opts: { onlyActive?: boolean; limit?: number } = {}) {
  return useQuery<EngagementOverview[]>({
    queryKey: ["engagements-overview", opts],
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("engagements")
        .select("id,name,status,health,start_date,end_date,routed_agent_names, esp_packages(type)")
        .order("created_at", { ascending: false });

      if (opts.onlyActive) q = q.in("status", ["planning", "active", "blocked"]);
      if (opts.limit) q = q.limit(opts.limit);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as EngagementRow[];

      const ids = rows.map((r) => r.id);
      let modulesByEng = new Map<string, string[]>();
      if (ids.length > 0) {
        const { data: mods } = await supabase
          .from("esp_modules")
          .select("module_code, required, esp_packages!inner(engagement_id)")
          .in("esp_packages.engagement_id", ids);
        for (const m of ((mods ?? []) as EspModuleRow[])) {
          const eid = m.esp_packages?.[0]?.engagement_id;
          if (!eid) continue;
          if (!m.required) continue;
          const arr = modulesByEng.get(eid) ?? [];
          arr.push(m.module_code);
          modulesByEng.set(eid, arr);
        }
      }

      return rows.map((r): EngagementOverview => ({
        id: r.id,
        client_name: r.name,
        title: null,
        esp_type: r.esp_packages?.[0]?.type ?? "undetermined",
        status: r.status,
        progress: STATUS_PROGRESS[r.status] ?? 0,
        next_gate: r.status === "blocked" ? "Bloqueio ativo" : null,
        eta: r.end_date,
        owner: r.routed_agent_names?.[0] ?? null,
        active_module_codes: (modulesByEng.get(r.id) ?? []).sort(),
        start_date: r.start_date,
        end_date: r.end_date,
        health: r.health,
      }));
    },
  });
}

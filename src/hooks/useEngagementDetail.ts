import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EspModule } from "@/components/engagement/EspModuleList";

export interface EngagementDetailData {
  engagement: {
    id: string;
    name: string;
    status: string;
    health: string;
    start_date: string | null;
    end_date: string | null;
    blocker_note: string | null;
    routed_agent_names: string[];
    routed_at: string | null;
    budget_brl_estimate: number | null;
    contract_id: string | null;
  };
  esp_package: {
    id: string;
    type: string;
    status: string;
    diagnosis_md: string | null;
    classified_by_agent: string | null;
    validated_by_agent: string | null;
  } | null;
  modules: EspModule[];
  recent_runs: {
    id: string;
    agent_name: string;
    job_name: string | null;
    llm_provider: string;
    llm_model: string;
    status: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
    created_at: string;
  }[];
}

export function useEngagementDetail(id: string | undefined) {
  return useQuery<EngagementDetailData | null>({
    queryKey: ["engagement-detail", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;

      const { data: e, error: eErr } = await supabase
        .from("engagements")
        .select("id, name, status, health, start_date, end_date, blocker_note, routed_agent_names, routed_at, budget_brl_estimate, contract_id")
        .eq("id", id)
        .maybeSingle();
      if (eErr) throw eErr;
      if (!e) return null;

      const { data: pkg } = await supabase
        .from("esp_packages")
        .select("id, type, status, diagnosis_md, classified_by_agent, validated_by_agent")
        .eq("engagement_id", id)
        .maybeSingle();

      let modules: EspModule[] = [];
      if (pkg?.id) {
        const { data: mods } = await supabase
          .from("esp_modules")
          .select("module_code, required, status, produced_by_agent, approved_by_agent, artifact_url")
          .eq("esp_package_id", pkg.id)
          .order("module_code", { ascending: true });
        modules = (mods ?? []) as EspModule[];
      }

      const { data: runs } = await supabase
        .from("agent_runs")
        .select("id, agent_name, job_name, llm_provider, llm_model, status, tokens_in, tokens_out, cost_usd, created_at")
        .eq("engagement_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      return {
        engagement: {
          ...e,
          routed_agent_names: e.routed_agent_names ?? [],
        },
        esp_package: pkg ?? null,
        modules,
        recent_runs: (runs ?? []) as EngagementDetailData["recent_runs"],
      };
    },
  });
}

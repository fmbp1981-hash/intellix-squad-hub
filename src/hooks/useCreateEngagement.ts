import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EspType =
  | "consulting" | "agent" | "automation" | "product" | "hybrid" | "undetermined";

export type EspModuleCode = "A" | "B" | "C" | "D" | "E";

export interface CreateEngagementInput {
  client_name: string;
  esp_type: EspType;
  start_date: string;
  end_date?: string | null;
  budget_brl_estimate?: number | null;
  module_codes: EspModuleCode[];
}

export interface CreatedEngagement {
  id: string;
  esp_package_id: string;
}

export function useCreateEngagement() {
  const qc = useQueryClient();

  return useMutation<CreatedEngagement, Error, CreateEngagementInput>({
    mutationFn: async (input) => {
      const { data: eng, error: engErr } = await supabase
        .from("engagements")
        .insert({
          name: input.client_name.trim(),
          start_date: input.start_date,
          end_date: input.end_date || null,
          budget_brl_estimate: input.budget_brl_estimate ?? null,
          status: "planning",
          health: "green",
        })
        .select("id")
        .single();
      if (engErr) throw engErr;

      const { data: pkg, error: pkgErr } = await supabase
        .from("esp_packages")
        .insert({
          engagement_id: eng.id,
          type: input.esp_type,
          status: "drafting",
        })
        .select("id")
        .single();
      if (pkgErr) throw pkgErr;

      if (input.module_codes.length > 0) {
        const rows = input.module_codes.map((code) => ({
          esp_package_id: pkg.id,
          module_code: code,
          required: true,
          status: "not_started" as const,
        }));
        const { error: modErr } = await supabase.from("esp_modules").insert(rows);
        if (modErr) throw modErr;
      }

      return { id: eng.id, esp_package_id: pkg.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engagements-overview"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["sidebar-badges"] });
    },
  });
}

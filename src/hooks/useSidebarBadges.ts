import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SidebarBadges = {
  jobs: number;
  engagements: number;
  leads: number;
  marketing: number;
};

export function useSidebarBadges() {
  return useQuery<SidebarBadges>({
    queryKey: ["sidebar-badges"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [jobs, engagements, leads, marketingDrafts] = await Promise.all([
        supabase
          .from("internal_jobs")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "running"]),
        supabase
          .from("engagements")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(completed,archived)"),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("content_calendar")
          .select("id", { count: "exact", head: true })
          .eq("status", "draft"),
      ]);
      return {
        jobs: jobs.count ?? 0,
        engagements: engagements.count ?? 0,
        leads: leads.count ?? 0,
        marketing: marketingDrafts.count ?? 0,
      };
    },
  });
}

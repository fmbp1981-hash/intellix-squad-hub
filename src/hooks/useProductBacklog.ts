import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Epic {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  business_value: string | null;
  acceptance_criteria: string | null;
  priority: number | null;
  moscow: "must" | "should" | "could" | "wont" | null;
  status: string;
  story_points_estimated: number | null;
  story_points_completed: number | null;
  color: string | null;
  created_at: string;
}

export interface Story {
  id: string;
  epic_id: string | null;
  project_id: string;
  persona: string;
  action: string;
  benefit: string;
  description: string | null;
  acceptance_criteria: string;
  story_points: number | null;
  priority: number | null;
  moscow: "must" | "should" | "could" | "wont" | null;
  status: string;
  sprint_id: string | null;
  blocked: boolean | null;
  blocked_reason: string | null;
  tags: string[] | null;
  invest_independent: boolean | null;
  invest_negotiable: boolean | null;
  invest_valuable: boolean | null;
  invest_estimable: boolean | null;
  invest_small: boolean | null;
  invest_testable: boolean | null;
  started_at: string | null;
  completed_at: string | null;
  accepted_at: string | null;
}

export function useProductBacklog(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["product-backlog", projectId],
    queryFn: async () => {
      const [epicsRes, storiesRes] = await Promise.all([
        supabase
          .from("epics")
          .select("*")
          .eq("project_id", projectId!)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("user_stories")
          .select("*")
          .eq("project_id", projectId!)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
      if (epicsRes.error) throw epicsRes.error;
      if (storiesRes.error) throw storiesRes.error;
      return {
        epics: (epicsRes.data ?? []) as Epic[],
        stories: (storiesRes.data ?? []) as Story[],
      };
    },
  });
}

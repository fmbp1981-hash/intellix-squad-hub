import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Story } from "./useProductBacklog";

export interface Sprint {
  id: string;
  project_id: string;
  number: number;
  name: string | null;
  goal: string;
  start_date: string;
  end_date: string;
  status: string;
  committed_points: number | null;
  completed_points: number | null;
}

export interface BoardData {
  project: any;
  activeSprint: Sprint | null;
  stories: Story[];
  epics: { id: string; title: string; color: string | null }[];
}

export function useSprintBoard(projectId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!projectId,
    queryKey: ["sprint-board", projectId],
    queryFn: async (): Promise<BoardData> => {
      const [projectRes, sprintRes, epicsRes] = await Promise.all([
        supabase.from("agile_projects").select("*").eq("id", projectId!).single(),
        supabase
          .from("sprints")
          .select("*")
          .eq("project_id", projectId!)
          .eq("status", "active")
          .maybeSingle(),
        supabase.from("epics").select("id, title, color").eq("project_id", projectId!),
      ]);
      if (projectRes.error) throw projectRes.error;
      const sprint = sprintRes.data as Sprint | null;

      let stories: Story[] = [];
      if (sprint) {
        const { data, error } = await supabase
          .from("user_stories")
          .select("*")
          .eq("project_id", projectId!)
          .or(`sprint_id.eq.${sprint.id},status.eq.ready,status.eq.backlog`)
          .order("priority", { ascending: true });
        if (error) throw error;
        stories = (data ?? []) as Story[];
      } else {
        const { data, error } = await supabase
          .from("user_stories")
          .select("*")
          .eq("project_id", projectId!)
          .in("status", ["backlog", "ready"])
          .order("priority", { ascending: true });
        if (error) throw error;
        stories = (data ?? []) as Story[];
      }

      return {
        project: projectRes.data,
        activeSprint: sprint,
        stories,
        epics: (epicsRes.data ?? []) as any,
      };
    },
  });

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`board-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_stories", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["sprint-board", projectId] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sprints", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["sprint-board", projectId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, qc]);

  return query;
}

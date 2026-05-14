import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMarketingSquad() {
  const weekStart = getWeekStart();

  const calendar = useQuery({
    queryKey: ["marketing-calendar", weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_calendar")
        .select("*")
        .eq("week_start", weekStart)
        .order("scheduled_for");
      if (error) throw error;
      return data ?? [];
    },
  });

  const drafts = useQuery({
    queryKey: ["content-drafts-week", weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_drafts")
        .select("*, content_calendar!inner(week_start)")
        .eq("content_calendar.week_start", weekStart)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pendingApprovals =
    (calendar.data?.filter((c) => c.status === "draft").length ?? 0) +
    (drafts.data?.filter((d) => d.status === "review").length ?? 0);

  return { calendar, drafts, pendingApprovals, weekStart };
}

export function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export async function triggerWeeklyResearch() {
  const { data, error } = await supabase.functions.invoke("marketing-weekly-trigger");
  if (error) throw error;
  return data;
}

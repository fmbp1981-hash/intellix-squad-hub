import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContentCalendar(weekStart?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["content-calendar", weekStart],
    queryFn: async () => {
      let q = supabase.from("content_calendar").select("*").order("scheduled_for");
      if (weekStart) q = q.eq("week_start", weekStart);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: async (calendarId: string) => {
      const { error } = await supabase
        .from("content_calendar")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", calendarId);
      if (error) throw error;
      // Dispara geração de copy
      await supabase.functions.invoke("marketing-copy", { body: { calendar_id: calendarId } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-calendar"] }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from("content_calendar")
        .update({ status: "rejected", notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-calendar"] }),
  });

  return { query, approve, reject };
}

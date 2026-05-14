import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContentDrafts(calendarId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["content-drafts", calendarId],
    queryFn: async () => {
      let q = supabase
        .from("content_drafts")
        .select("*, visual_briefs(*), review_results(*)")
        .order("created_at", { ascending: false });
      if (calendarId) q = q.eq("calendar_id", calendarId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateDraft = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("content_drafts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-drafts"] }),
  });

  const triggerReview = useMutation({
    mutationFn: async (draftId: string) => {
      await supabase.functions.invoke("marketing-review", { body: { draft_id: draftId } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-drafts"] }),
  });

  return { query, updateDraft, triggerReview };
}

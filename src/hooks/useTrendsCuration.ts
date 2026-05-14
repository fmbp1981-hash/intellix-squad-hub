import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTrendsCuration(batchId?: string) {
  const raw = useQuery({
    queryKey: ["trends-raw", batchId],
    queryFn: async () => {
      let q = supabase.from("trends_raw").select("*").order("collected_at", { ascending: false }).limit(100);
      if (batchId) q = q.eq("batch_id", batchId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const curated = useQuery({
    queryKey: ["trends-curated", batchId],
    queryFn: async () => {
      let q = supabase.from("trends_curated").select("*").order("relevancia_score", { ascending: false }).limit(50);
      if (batchId) q = q.eq("batch_id", batchId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const latestBatch = useQuery({
    queryKey: ["trends-latest-batch"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trends_raw")
        .select("batch_id, collected_at")
        .order("collected_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  return { raw, curated, latestBatch };
}

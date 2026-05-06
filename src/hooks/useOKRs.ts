import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OKR } from "@/types";

export function useOKRs() {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.from("okrs").select("*").order("quarter", { ascending: false });
    setOkrs(((data ?? []) as any[]).map((o) => ({
      ...o,
      progress: o.target_value ? Math.min(100, Math.round((Number(o.current_value) / Number(o.target_value)) * 100)) : 0,
    })));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("okrs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "okrs" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { okrs, loading, refresh };
}

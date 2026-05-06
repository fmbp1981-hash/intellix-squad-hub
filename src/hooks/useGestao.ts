import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GestaoBriefing, GestaoDirective } from "@/types";

export function useGestao() {
  const [briefings, setBriefings] = useState<GestaoBriefing[]>([]);
  const [directives, setDirectives] = useState<GestaoDirective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      supabase.from("gestao_briefings").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("gestao_directives").select("*").order("created_at", { ascending: false }).limit(50),
    ]).then(([b, d]) => {
      if (!mounted) return;
      setBriefings((b.data ?? []) as any);
      setDirectives((d.data ?? []) as any);
      setLoading(false);
    });

    const ch = supabase
      .channel("gestao-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "gestao_briefings" }, (p) => {
        if (p.eventType === "INSERT") setBriefings((prev) => [p.new as any, ...prev]);
        if (p.eventType === "UPDATE") setBriefings((prev) => prev.map((b) => (b.id === (p.new as any).id ? (p.new as any) : b)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "gestao_directives" }, (p) => {
        if (p.eventType === "INSERT") setDirectives((prev) => [p.new as any, ...prev]);
        if (p.eventType === "UPDATE") setDirectives((prev) => prev.map((d) => (d.id === (p.new as any).id ? (p.new as any) : d)));
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return { briefings, directives, loading };
}

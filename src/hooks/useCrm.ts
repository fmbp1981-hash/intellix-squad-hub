import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead, Deal, Contract, Invoice, Engagement } from "@/types";

export function useCrm() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [l, d, c, i, e] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("deals").select("*").order("updated_at", { ascending: false }),
      supabase.from("contracts").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").order("due_date", { ascending: true }),
      supabase.from("engagements").select("*").order("updated_at", { ascending: false }),
    ]);
    setLeads((l.data ?? []) as any);
    setDeals((d.data ?? []) as any);
    setContracts((c.data ?? []) as any);
    setInvoices((i.data ?? []) as any);
    setEngagements((e.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("crm-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "engagements" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { leads, deals, contracts, invoices, engagements, loading, refresh };
}

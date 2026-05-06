// Lead Score Calculator - score 0-100 baseado em sinais
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function scoreLead(l: any): { score: number; reasons: string[] } {
  let s = 0; const r: string[] = [];
  if (l.contact_email) { s += 15; r.push("E-mail informado"); }
  if (l.contact_phone) { s += 10; r.push("Telefone informado"); }
  if (l.ticket_estimate && l.ticket_estimate >= 50000) { s += 25; r.push("Ticket alto (≥50k)"); }
  else if (l.ticket_estimate && l.ticket_estimate >= 10000) { s += 15; r.push("Ticket médio"); }
  if (l.segment) { s += 10; r.push(`Segmento: ${l.segment}`); }
  if (l.source && ["referral", "indicacao", "indicação"].includes(l.source.toLowerCase())) { s += 20; r.push("Origem indicação"); }
  else if (l.source) { s += 5; r.push(`Origem: ${l.source}`); }
  if (l.last_contact_at) {
    const days = (Date.now() - new Date(l.last_contact_at).getTime()) / 86400000;
    if (days <= 7) { s += 15; r.push("Contato recente"); }
    else if (days > 30) { s -= 10; r.push("Sem contato há 30+ dias"); }
  }
  return { score: Math.max(0, Math.min(100, s)), reasons: r };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const query = supabase.from("leads").select("*").neq("status", "lost");
    if (body.leadId) query.eq("id", body.leadId);
    const { data: leads, error } = await query;
    if (error) throw error;

    const updated: any[] = [];
    for (const l of leads ?? []) {
      const { score, reasons } = scoreLead(l);
      const newStatus = score >= 80 && l.status === "new" ? "qualified" : l.status;
      await supabase.from("leads").update({ score, score_reasons: reasons, status: newStatus }).eq("id", l.id);
      updated.push({ id: l.id, score, status: newStatus });
    }
    return new Response(JSON.stringify({ updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("lead-score-calculator", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

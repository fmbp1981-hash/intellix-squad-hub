// Send Email via Resend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { to, subject, html, template, related_entity_type, related_entity_id, from } = await req.json();
    if (!to || !subject || !html) return new Response(JSON.stringify({ error: "to, subject, html requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: log } = await supabase.from("email_log").insert({
      recipient: to, subject, body_html: html, template, related_entity_type, related_entity_id, status: "pending",
    }).select().single();

    if (!RESEND_API_KEY) {
      await supabase.from("email_log").update({ status: "failed", error: "RESEND_API_KEY não configurado" }).eq("id", log.id);
      return new Response(JSON.stringify({ error: "Provedor de e-mail não configurado. Adicione RESEND_API_KEY." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from ?? "Intellix <onboarding@resend.dev>", to: [to], subject, html }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      await supabase.from("email_log").update({ status: "failed", error: JSON.stringify(data) }).eq("id", log.id);
      return new Response(JSON.stringify({ error: data }), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("email_log").update({ status: "sent", provider_id: data.id, sent_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ id: data.id, log_id: log.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-email", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// Outbound Webhook Dispatcher - HMAC signed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmac(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { event, payload } = await req.json();
    if (!event) return new Response(JSON.stringify({ error: "event requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: hooks } = await supabase.from("outbound_webhooks").select("*").eq("enabled", true);
    const matched = (hooks ?? []).filter((h: any) => (h.events ?? []).includes(event) || (h.events ?? []).includes("*"));

    const body = JSON.stringify({ event, payload, sent_at: new Date().toISOString() });
    const results = await Promise.all(matched.map(async (h: any) => {
      try {
        const sig = await hmac(h.secret, body);
        const r = await fetch(h.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Intellix-Event": event, "X-Intellix-Signature": sig }, body });
        await supabase.from("outbound_webhooks").update({ last_delivery_at: new Date().toISOString(), last_delivery_status: r.ok ? `${r.status}` : `error:${r.status}` }).eq("id", h.id);
        return { id: h.id, status: r.status };
      } catch (e: any) {
        await supabase.from("outbound_webhooks").update({ last_delivery_at: new Date().toISOString(), last_delivery_status: `error:${e.message}` }).eq("id", h.id);
        return { id: h.id, error: e.message };
      }
    }));
    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("outbound-webhook-dispatcher", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

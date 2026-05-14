// marketing-weekly-trigger — Aciona pesquisa toda segunda às 09h BRT
// Chamado pelo pg_cron ou manualmente pelo frontend
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { dispatchNext } from "../_shared/marketing-llm.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (svc && auth !== `Bearer ${svc}`) return jsonResponse({ error: "unauthorized" }, 401);

  dispatchNext("marketing-research", {});

  return jsonResponse({ ok: true, triggered_at: new Date().toISOString() });
});

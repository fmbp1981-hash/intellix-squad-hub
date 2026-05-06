import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { buildAgataContext, AgataType } from "../_shared/agata-context-builder.ts";

const VALID: AgataType[] = ["daily_standup", "on_demand", "incident_response", "weekly_review"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const internal = Deno.env.get("INTERNAL_SECRET");
  const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let ok = (internal && auth === `Bearer ${internal}`) || (srv && auth === `Bearer ${srv}`);

  // Also allow authenticated end-users (manual triggers from /office/gestao)
  if (!ok && auth.startsWith("Bearer ")) {
    try {
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } }
      );
      const token = auth.replace("Bearer ", "");
      const { data, error: claimsErr } = await userClient.auth.getClaims(token);
      if (!claimsErr && data?.claims?.sub) ok = true;
    } catch (_) { /* ignore */ }
  }

  if (!ok) return jsonResponse({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const { type, question, contextHints } = body as { type?: AgataType; question?: string; contextHints?: Record<string, unknown> };
  if (!type || !VALID.includes(type)) return jsonResponse({ error: "invalid_type" }, 400);

  const supa = adminClient();
  const context = await buildAgataContext(supa, type, question, contextHints);

  const triggeredBy = type === "on_demand" ? "manual" : "scheduled";
  const { data: job, error } = await supa
    .from("internal_jobs")
    .insert({
      kind: "gestao",
      department: "gestao",
      job_id: type,
      job_input: { type, question, contextSize: context.length },
      trigger_source: triggeredBy,
      status: "pending",
      payload: { type, question, prebuiltContext: context },
      sla_deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ ok: true, jobId: job.id });
});

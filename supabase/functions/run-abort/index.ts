import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({ run_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const guard = await requireAdmin(req);
  if ("error" in guard) return guard.error;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const supa = adminClient();
  await supa.from("squad_runs").update({
    status: "aborted",
    completed_at: new Date().toISOString(),
  }).eq("id", parsed.data.run_id);
  await supa.from("run_queue").delete().eq("run_id", parsed.data.run_id);

  return jsonResponse({ ok: true });
});

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  checkpointId: z.string().uuid(),
  runId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { checkpointId, runId, decision, notes } = parsed.data;

  const supa = adminClient();

  const { data: cp, error: cpErr } = await supa
    .from("squad_checkpoints")
    .select("*")
    .eq("id", checkpointId)
    .maybeSingle();
  if (cpErr || !cp) return jsonResponse({ error: "checkpoint_not_found" }, 404);
  if (cp.status !== "pending") return jsonResponse({ error: "already_resolved" }, 409);

  await supa
    .from("squad_checkpoints")
    .update({
      status: decision,
      notes: notes ?? null,
      resolved_by: auth.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", checkpointId);

  if (decision === "approved") {
    await supa
      .from("squad_runs")
      .update({ status: "running" })
      .eq("id", runId);

    // Chain next step via run-step
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/run-step`;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ run_id: runId }),
    }).catch((e) => console.error("chain run-step", e));
  } else {
    await supa
      .from("squad_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    await supa.from("notifications").insert({
      user_id: auth.userId,
      title: "Checkpoint rejeitado",
      body: `Run ${runId} foi rejeitado pelo PO.${notes ? "\nMotivo: " + notes : ""}`,
      channel: "whatsapp",
      priority: "high",
      category: "checkpoint",
    });
  }

  return jsonResponse({ ok: true, decision });
});

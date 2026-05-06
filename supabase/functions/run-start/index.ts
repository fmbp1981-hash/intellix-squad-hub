import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  squad_key: z.string().min(1),
  workspace_id: z.string().uuid().optional(),
  phase_id: z.string().uuid().optional(),
  input: z.record(z.unknown()).default({}),
  priority: z.number().int().min(0).max(1000).default(100),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const guard = await requireAdmin(req);
  if ("error" in guard) return guard.error;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { squad_key, workspace_id, phase_id, input, priority } = parsed.data;

  const supa = adminClient();
  const { data: squad, error: sErr } = await supa
    .from("squad_configs")
    .select("id, name")
    .eq("key", squad_key)
    .eq("active", true)
    .maybeSingle();
  if (sErr || !squad) return jsonResponse({ error: "squad_not_found" }, 404);

  const { data: run, error: rErr } = await supa
    .from("squad_runs")
    .insert({
      squad_name: squad.name,
      workspace_id: workspace_id ?? null,
      phase_id: phase_id ?? null,
      status: "pending",
      created_by: guard.userId,
      state_snapshot: { squad_id: squad.id, input },
    })
    .select("id")
    .single();
  if (rErr || !run) return jsonResponse({ error: rErr?.message ?? "insert_failed" }, 500);

  await supa.from("run_queue").insert({ run_id: run.id, priority });

  // fire-and-forget run-step
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/run-step`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ run_id: run.id }),
  }).catch((e) => console.error("dispatch run-step", e));

  return jsonResponse({ run_id: run.id });
});

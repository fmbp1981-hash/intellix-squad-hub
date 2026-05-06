import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { loadLlmConfig, runLlm, LlmMessage } from "../_shared/llm-provider.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({ run_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  // Internal-only: requires service-role bearer
  const auth = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (auth !== expected) return jsonResponse({ error: "unauthorized" }, 401);

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { run_id } = parsed.data;

  const supa = adminClient();

  const { data: run } = await supa.from("squad_runs").select("*").eq("id", run_id).single();
  if (!run) return jsonResponse({ error: "run_not_found" }, 404);
  if (run.status === "aborted") return jsonResponse({ ok: true, aborted: true });

  const squadId = (run.state_snapshot as any)?.squad_id;
  const input = (run.state_snapshot as any)?.input ?? {};

  const { data: agents } = await supa
    .from("agent_configs")
    .select("*")
    .eq("squad_id", squadId)
    .eq("active", true)
    .order("position_x", { ascending: true });

  if (!agents || agents.length === 0) {
    await supa.from("squad_runs").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", run_id);
    return jsonResponse({ error: "no_agents" }, 400);
  }

  // Find next pending step
  const { data: doneSteps } = await supa
    .from("run_steps")
    .select("step_index, output_markdown")
    .eq("run_id", run_id)
    .order("step_index", { ascending: true });

  const nextIdx = (doneSteps?.length ?? 0);
  if (nextIdx >= agents.length) {
    const finalMd = (doneSteps ?? []).map((s) => s.output_markdown ?? "").join("\n\n---\n\n");
    await supa.from("squad_runs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      output_markdown: finalMd,
    }).eq("id", run_id);
    await supa.from("run_queue").delete().eq("run_id", run_id);
    return jsonResponse({ ok: true, completed: true });
  }

  if (nextIdx === 0) {
    await supa.from("squad_runs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", run_id);
  }

  const agent = agents[nextIdx];
  const prevMd = (doneSteps ?? []).map((s) => s.output_markdown ?? "").join("\n\n---\n\n");

  const { data: stepRow } = await supa.from("run_steps").insert({
    run_id,
    agent_id: agent.id,
    step_index: nextIdx,
    input: { brief: input, previous: prevMd },
    status: "running",
    started_at: new Date().toISOString(),
  }).select("id").single();

  try {
    const cfg = await loadLlmConfig(agent.llm_config_key);
    const messages: LlmMessage[] = [
      { role: "system", content: `Você é ${agent.name}, ${agent.persona ?? ""}. Responda em Markdown.` },
      { role: "user", content: `Briefing:\n${JSON.stringify(input, null, 2)}\n\nContexto anterior:\n${prevMd || "(nenhum)"}` },
    ];
    const result = await runLlm(cfg, messages);

    await supa.from("run_steps").update({
      output_markdown: result.content,
      tokens_in: result.tokens_in,
      tokens_out: result.tokens_out,
      latency_ms: result.latency_ms,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", stepRow!.id);

    // Chain next step
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/run-step`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: expected },
      body: JSON.stringify({ run_id }),
    }).catch((e) => console.error("chain", e));

    return jsonResponse({ ok: true, step: nextIdx, agent: agent.name });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("run-step error", msg);
    await supa.from("run_steps").update({
      status: "failed",
      error: msg,
      completed_at: new Date().toISOString(),
    }).eq("id", stepRow!.id);
    await supa.from("squad_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
    }).eq("id", run_id);
    return jsonResponse({ error: msg }, 500);
  }
});

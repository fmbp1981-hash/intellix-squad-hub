import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { loadLlmConfig, runLlm, LlmMessage } from "../_shared/llm-provider.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  kind: z.enum(["daily-standup", "weekly-review", "on-demand-brief", "incident-response"]),
  department: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { kind, department, payload } = parsed.data;

  const supa = adminClient();
  const { data: job } = await supa.from("internal_jobs").insert({
    kind, department, payload, status: "running", started_at: new Date().toISOString(),
  }).select("id").single();
  if (!job) return jsonResponse({ error: "insert_failed" }, 500);

  try {
    const cfg = await loadLlmConfig(`internal:gestao:${kind}`);
    const messages: LlmMessage[] = [
      { role: "system", content: `Você é Ágata, CEO virtual. Gere um relatório em Markdown para o ritual: ${kind}.` },
      { role: "user", content: JSON.stringify({ department, payload }, null, 2) },
    ];
    const result = await runLlm(cfg, messages);
    await supa.from("internal_jobs").update({
      status: "completed",
      output_markdown: result.content,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return jsonResponse({ job_id: job.id, status: "completed" });
  } catch (e) {
    await supa.from("internal_jobs").update({
      status: "failed",
      output_markdown: `**Falha:** ${(e as Error).message}`,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return jsonResponse({ job_id: job.id, status: "failed", error: (e as Error).message }, 500);
  }
});

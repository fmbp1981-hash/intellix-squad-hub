import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  completedRunId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  completedSquad: z.string(),
});

type SquadEntry = {
  squad: string;
  depends_on?: string[];
  phase_id?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { completedRunId, workspaceId, completedSquad } = parsed.data;

  const supa = adminClient();

  const { data: plan } = await supa
    .from("engagement_plans")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["running", "paused", "pending"])
    .maybeSingle();

  if (!plan) return jsonResponse({ ok: true, noop: "no_active_plan" });

  const completed: string[] = Array.isArray(plan.completed_squads)
    ? (plan.completed_squads as string[])
    : [];
  if (!completed.includes(completedSquad)) completed.push(completedSquad);

  // Extract insights from last pipeline_step_outputs (Reviewer)
  const { data: outputs } = await supa
    .from("pipeline_step_outputs")
    .select("output_markdown, step_number")
    .eq("run_id", completedRunId)
    .order("step_number", { ascending: false })
    .limit(1);

  const reviewerMd = outputs?.[0]?.output_markdown ?? "";
  if (reviewerMd) {
    const insightsSection = reviewerMd.split(/##\s+(insights|conclus)/i).slice(-1)[0] ?? reviewerMd;
    await supa.from("workspace_contexts").upsert(
      {
        workspace_id: workspaceId,
        context_type: "shared_insights",
        content: `# Insights — ${completedSquad}\n\n${insightsSection}`.slice(0, 20000),
      },
      { onConflict: "workspace_id,context_type" },
    );
  }

  const squads: SquadEntry[] = Array.isArray(plan.squads_ordered)
    ? (plan.squads_ordered as SquadEntry[])
    : [];

  const eligible = squads.find(
    (s) =>
      !completed.includes(s.squad) &&
      (s.depends_on ?? []).every((d) => completed.includes(d)),
  );

  const allComplete = squads.every((s) => completed.includes(s.squad));

  if (allComplete) {
    await supa
      .from("engagement_plans")
      .update({
        status: "completed",
        completed_squads: completed,
        current_squad: null,
      })
      .eq("id", plan.id);
    return jsonResponse({ ok: true, allComplete: true });
  }

  if (eligible && plan.auto_advance) {
    await supa
      .from("engagement_plans")
      .update({
        status: "running",
        completed_squads: completed,
        current_squad: eligible.squad,
      })
      .eq("id", plan.id);

    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/run-start`;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ workspace_id: workspaceId, squad: eligible.squad }),
    }).catch((e) => console.error("auto-advance run-start", e));

    return jsonResponse({ ok: true, nextSquad: eligible.squad, autoAdvanced: true });
  }

  await supa
    .from("engagement_plans")
    .update({
      status: "paused",
      completed_squads: completed,
      current_squad: null,
    })
    .eq("id", plan.id);

  if (eligible) {
    await supa.from("notifications").insert({
      user_id: plan.workspace_id, // placeholder — workspace owner could be looked up
      title: `Squad ${completedSquad} concluído`,
      body: `Próximo squad disponível: ${eligible.squad}. Aprovar para iniciar.`,
      channel: "whatsapp",
      priority: "normal",
      category: "engagement",
    });
  }

  return jsonResponse({ ok: true, nextSquad: eligible?.squad, paused: true });
});

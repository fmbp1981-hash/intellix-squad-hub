import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Chamada internamente por squad-state-update (fire-and-forget) quando um run é completado.
// Identifica o próximo squad elegível no engagement_plan e, se auto_advance=true, dispara-o.
// Sem JWT de usuário — chamada interna autenticada via INTERNAL_SECRET.

const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET") ?? Deno.env.get("CALLBACK_SECRET")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Autenticação interna (chamada por squad-state-update, não pelo browser)
  const auth = req.headers.get("Authorization");
  if (!auth || auth !== `Bearer ${INTERNAL_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: { completedRunId: string; workspaceId: string; completedSquad: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { completedRunId, workspaceId, completedSquad } = body;
  if (!completedRunId || !workspaceId || !completedSquad) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: completedRunId, workspaceId, completedSquad" }),
      { status: 400 }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Busca o engagement_plan ativo para este workspace
  const { data: plan, error: planError } = await supabase
    .from("engagement_plans")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "running"])
    .single();

  if (planError || !plan) {
    // Sem plano ativo — workspace usa disparos manuais, sem orquestrador
    return new Response(JSON.stringify({ ok: true, skipped: "no active plan" }), { status: 200 });
  }

  const squadsOrdered: Array<{ squad: string; phase_id: string; depends_on: string[] }> =
    plan.squads_ordered ?? [];

  const completedSquads: string[] = plan.completed_squads ?? [];

  // Marca o squad recém-concluído como completo
  const updatedCompleted = [...new Set([...completedSquads, completedSquad])];

  // Encontra o próximo squad cujas dependências estão todas satisfeitas
  const nextEntry = squadsOrdered.find(
    (entry) =>
      !updatedCompleted.includes(entry.squad) &&
      entry.depends_on.every((dep) => updatedCompleted.includes(dep))
  );

  // Verifica se todos os squads do plano foram concluídos
  const allDone = squadsOrdered.every((entry) => updatedCompleted.includes(entry.squad));

  if (allDone) {
    await supabase
      .from("engagement_plans")
      .update({ status: "completed", current_squad: null, completed_squads: updatedCompleted })
      .eq("id", plan.id);
    return new Response(JSON.stringify({ ok: true, engagementStatus: "completed" }), { status: 200 });
  }

  // Atualiza completed_squads e current_squad
  await supabase
    .from("engagement_plans")
    .update({
      status: "running",
      completed_squads: updatedCompleted,
      current_squad: nextEntry?.squad ?? null,
    })
    .eq("id", plan.id);

  if (!nextEntry) {
    // Próximo squad tem dependências não satisfeitas ainda (paralelismo parcial)
    return new Response(
      JSON.stringify({ ok: true, waiting: "dependencies not yet satisfied" }),
      { status: 200 }
    );
  }

  if (!plan.auto_advance) {
    // Modo manual: Realtime notifica o browser que o próximo squad está pronto
    // O operador clica "Iniciar Próximo Squad" na UI
    return new Response(
      JSON.stringify({ ok: true, nextSquad: nextEntry.squad, autoAdvance: false }),
      { status: 200 }
    );
  }

  // auto_advance: true — dispara o próximo squad automaticamente
  // Busca workspace para obter o slug
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, slug")
    .eq("id", workspaceId)
    .single();

  if (!workspace) {
    return new Response(JSON.stringify({ error: "Workspace not found" }), { status: 404 });
  }

  // Cria o squad_run para o próximo squad
  const { data: newRun } = await supabase
    .from("squad_runs")
    .insert({
      workspace_id: workspaceId,
      phase_id: nextEntry.phase_id ?? null,
      squad_name: nextEntry.squad,
      status: "pending",
    })
    .select("id")
    .single();

  if (!newRun) {
    return new Response(JSON.stringify({ error: "Failed to create squad run" }), { status: 500 });
  }

  // Invoca squad-run-start para o próximo squad
  const startRes = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/squad-run-start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Chamada interna — usa service role como autorização temporária
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
      body: JSON.stringify({
        workspaceId,
        squadName: nextEntry.squad,
        runId: newRun.id,
      }),
    }
  );

  const startResult = await startRes.json().catch(() => ({}));

  return new Response(
    JSON.stringify({
      ok: true,
      nextSquad: nextEntry.squad,
      newRunId: newRun.id,
      autoAdvanced: true,
      startResult,
    }),
    { status: 200 }
  );
});

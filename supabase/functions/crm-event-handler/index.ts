import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

async function dispatchInternalJob(department: string, jobId: string, jobInput: Record<string, unknown>) {
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/internal-job-dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ department, jobId, jobInput }),
  }).catch((e) => console.error("dispatch error", e));
}

async function triggerOperationsDetailing(projectId: string, mode: "initial" | "refinement" = "initial") {
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/operations-detail-project`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ project_id: projectId, mode }),
  }).catch((e) => console.error("operations-detail dispatch error", e));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = adminClient();
  const { eventType, entityId } = await req.json().catch(() => ({}));

  switch (eventType) {
    case "lead_qualified": {
      const { data: lead } = await supa.from("leads").select("*").eq("id", entityId).single();
      if (lead && (lead.score ?? 0) >= 70) {
        await dispatchInternalJob("comercial", "generate-proposal", { lead_id: entityId, scope_summary: "Auto-gerado de qualificação alta" });
      }
      break;
    }
    case "deal_won": {
      const { data: deal } = await supa.from("deals").select("*").eq("id", entityId).single();
      if (!deal) break;

      // Engagement (mantém comportamento)
      await dispatchInternalJob("operacoes", "kickoff-engagement", { deal_id: entityId });

      // Cria projeto ágil idempotentemente
      const { data: existing } = await supa
        .from("agile_projects")
        .select("id, auto_planning_status")
        .eq("deal_id", entityId)
        .maybeSingle();

      let projectId = existing?.id;
      if (!projectId) {
        const { data: created, error } = await supa
          .from("agile_projects")
          .insert({
            name: deal.company_name,
            client_name: deal.company_name,
            description: deal.scope_summary,
            deal_id: deal.id,
            status: "planning",
            project_type: "scrum",
            auto_planning_status: "pending",
          })
          .select("id")
          .single();
        if (error) {
          console.error("Failed to create agile project from deal", error);
        } else {
          projectId = created.id;
        }
      }

      if (projectId) {
        await triggerOperationsDetailing(projectId, "initial");
      }
      break;
    }
    case "contract_signed": {
      await dispatchInternalJob("financeiro", "generate-invoice", { contract_id: entityId, milestone: "first" });

      // Atualiza projeto vinculado e dispara refinamento
      const { data: contract } = await supa.from("contracts").select("*").eq("id", entityId).single();
      if (contract?.deal_id) {
        const { data: project } = await supa
          .from("agile_projects")
          .select("id, auto_planning_status")
          .eq("deal_id", contract.deal_id)
          .maybeSingle();

        if (project) {
          await supa
            .from("agile_projects")
            .update({
              contract_id: contract.id,
              description: contract.scope_md ?? undefined,
            })
            .eq("id", project.id);

          await triggerOperationsDetailing(project.id, project.auto_planning_status === "completed" ? "refinement" : "initial");
        }
      }
      break;
    }
    case "check_overdue": {
      const today = new Date().toISOString().slice(0, 10);
      await supa.from("invoices").update({ status: "overdue" }).lt("due_date", today).in("status", ["pending", "sent"]);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const { data: overdue } = await supa.from("invoices").select("id").eq("status", "overdue").lte("due_date", sevenDaysAgo);
      if (overdue?.length) {
        await dispatchInternalJob("financeiro", "dunning-overdue", { invoice_ids: overdue.map((i: any) => i.id) });
      }
      break;
    }
    case "engagement_blocked": {
      const { data: eng } = await supa.from("engagements").select("*").eq("id", entityId).single();
      if (eng) {
        const days = (Date.now() - new Date(eng.updated_at).getTime()) / 86400000;
        if (days >= 5) {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gestao-trigger`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ type: "incident_response", contextHints: { engagementId: entityId, daysBlocked: days } }),
          }).catch(() => {});
        }
      }
      break;
    }
  }

  return jsonResponse({ ok: true });
});

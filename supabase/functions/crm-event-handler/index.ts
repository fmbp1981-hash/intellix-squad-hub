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

async function runAutomations(eventType: string, entity: any) {
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-automation-runner`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
    body: JSON.stringify({ eventType, entity }),
  }).catch((e) => console.error("automation runner", e));
}

async function dispatchWebhooks(event: string, payload: any) {
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/outbound-webhook-dispatcher`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
    body: JSON.stringify({ event, payload }),
  }).catch((e) => console.error("webhook dispatcher", e));
}

const NOTIFICATION_MAP: Record<string, { title: (e: any) => string; body: (e: any) => string; priority: string; link: (e: any) => string | null; category: string }> = {
  lead_qualified: {
    title: (e) => `Lead qualificado: ${e?.company_name ?? "novo lead"}`,
    body: (e) => `Score ${e?.score ?? "—"}. Avalie a abertura de proposta.`,
    priority: "normal", category: "crm",
    link: (e) => e?.id ? `/crm/leads` : null,
  },
  deal_won: {
    title: (e) => `🎉 Deal ganho: ${e?.company_name ?? ""}`,
    body: (e) => `Valor: R$ ${Number(e?.value ?? 0).toLocaleString("pt-BR")}. Kickoff em andamento.`,
    priority: "high", category: "crm",
    link: () => "/crm/deals",
  },
  deal_lost: {
    title: (e) => `Deal perdido: ${e?.company_name ?? ""}`,
    body: (e) => e?.lost_reason ? `Motivo: ${e.lost_reason}` : "Revise causa-raiz.",
    priority: "normal", category: "crm",
    link: () => "/crm/deals",
  },
  contract_signed: {
    title: () => "Contrato assinado",
    body: (e) => `Contrato ${e?.id?.slice(0,8) ?? ""} pronto para faturamento.`,
    priority: "high", category: "crm",
    link: () => "/crm/contracts",
  },
  engagement_blocked: {
    title: (e) => `Engagement bloqueado: ${e?.name ?? ""}`,
    body: (e) => e?.blocker_note ?? "Verifique o impedimento.",
    priority: "high", category: "crm",
    link: () => "/crm/engagements",
  },
};

async function dispatchNotifications(supa: any, eventType: string, entity: any) {
  const cfg = NOTIFICATION_MAP[eventType];
  if (!cfg) return;

  // Resolver destinatários: admins (fallback universal). Owner/assignee se existir.
  const recipients = new Set<string>();
  if (entity?.owner_id) recipients.add(entity.owner_id);
  if (entity?.assigned_to) recipients.add(entity.assigned_to);
  if (recipients.size === 0) {
    const { data: admins } = await supa.from("user_roles").select("user_id").eq("role", "admin");
    (admins ?? []).forEach((a: any) => recipients.add(a.user_id));
  }
  if (recipients.size === 0) return;

  const rows = Array.from(recipients).map((user_id) => ({
    user_id,
    title: cfg.title(entity),
    body: cfg.body(entity),
    category: cfg.category,
    priority: cfg.priority,
    link: cfg.link(entity),
    channel: "app",
    status: "pending",
  }));
  await supa.from("notifications").insert(rows).then(({ error }: any) => {
    if (error) console.error("notifications insert", error);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = adminClient();
  const { eventType, entityId } = await req.json().catch(() => ({}));

  let entityForAutomation: any = { id: entityId };
  if (eventType === "deal_won" || eventType === "deal_stage_changed" || eventType === "deal_lost") {
    const { data } = await supa.from("deals").select("*").eq("id", entityId).maybeSingle();
    entityForAutomation = data ?? entityForAutomation;
  } else if (eventType === "lead_qualified" || eventType === "lead_created") {
    const { data } = await supa.from("leads").select("*").eq("id", entityId).maybeSingle();
    entityForAutomation = data ?? entityForAutomation;
  } else if (eventType === "contract_signed") {
    const { data } = await supa.from("contracts").select("*").eq("id", entityId).maybeSingle();
    entityForAutomation = data ?? entityForAutomation;
  } else if (eventType === "engagement_blocked") {
    const { data } = await supa.from("engagements").select("*").eq("id", entityId).maybeSingle();
    entityForAutomation = data ?? entityForAutomation;
  }
  runAutomations(eventType, entityForAutomation);
  dispatchWebhooks(eventType, entityForAutomation);
  await dispatchNotifications(supa, eventType, entityForAutomation);


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

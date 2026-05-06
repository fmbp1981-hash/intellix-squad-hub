// CRM Automation Runner - dispatcher de regras
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function checkConditions(conds: any[], entity: any): boolean {
  if (!conds?.length) return true;
  return conds.every((c) => {
    const v = entity?.[c.field];
    switch (c.op) {
      case "eq": return v === c.value;
      case "neq": return v !== c.value;
      case "gt": return Number(v) > Number(c.value);
      case "gte": return Number(v) >= Number(c.value);
      case "lt": return Number(v) < Number(c.value);
      case "contains": return String(v ?? "").toLowerCase().includes(String(c.value).toLowerCase());
      default: return true;
    }
  });
}

async function runAction(supabase: any, action: any, entity: any, eventType: string) {
  switch (action.type) {
    case "create_activity":
      await supabase.from("crm_activities").insert({
        type: action.activity_type ?? "note",
        subject: action.subject ?? `Auto: ${eventType}`,
        body: action.body,
        deal_id: entity.deal_id ?? entity.id,
        lead_id: entity.lead_id,
        metadata: { source: "automation" },
      });
      break;
    case "trigger_ai_coach":
      if (entity.id || entity.deal_id) {
        await fetch(`${SUPABASE_URL}/functions/v1/ai-deal-coach`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ dealId: entity.deal_id ?? entity.id }),
        });
      }
      break;
    case "send_notification":
      await supabase.from("notifications").insert({
        user_id: action.user_id,
        title: action.title ?? `Evento ${eventType}`,
        body: action.body ?? "",
        category: "crm",
        priority: action.priority ?? "normal",
      });
      break;
    case "send_email": {
      const { sendEmail } = await import("../_shared/email.ts");
      const r = await sendEmail({
        to: action.to,
        subject: action.subject ?? `Evento ${eventType}`,
        html: action.body ?? "",
        template: action.template,
        related_entity_type: entity?.type,
        related_entity_id: entity?.id,
      });
      if (!r.ok) console.warn("[automation send_email] falhou (continuando):", r.error);
      break;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { eventType, entity } = await req.json();
    if (!eventType) return new Response(JSON.stringify({ error: "eventType requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: rules } = await supabase.from("crm_automations").select("*").eq("enabled", true).eq("trigger_type", eventType);

    const results: any[] = [];
    for (const rule of rules ?? []) {
      const match = checkConditions(rule.conditions ?? [], entity ?? {});
      const { data: run } = await supabase.from("crm_automation_runs").insert({
        automation_id: rule.id,
        trigger_event: eventType,
        entity_type: entity?.type,
        entity_id: entity?.id,
        status: match ? "running" : "skipped",
      }).select().single();
      if (!match) { results.push({ rule: rule.name, skipped: true }); continue; }
      try {
        for (const a of rule.actions ?? []) await runAction(supabase, a, entity ?? {}, eventType);
        await supabase.from("crm_automation_runs").update({ status: "success", completed_at: new Date().toISOString() }).eq("id", run.id);
        results.push({ rule: rule.name, ok: true });
      } catch (err: any) {
        await supabase.from("crm_automation_runs").update({ status: "failed", error: err.message, completed_at: new Date().toISOString() }).eq("id", run.id);
        results.push({ rule: rule.name, error: err.message });
      }
    }
    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("crm-automation-runner", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

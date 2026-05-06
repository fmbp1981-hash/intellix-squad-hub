// AI Deal Coach - structured insight generation for a deal
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const tool = {
  type: "function",
  function: {
    name: "deal_insight",
    description: "Análise completa do deal",
    parameters: {
      type: "object",
      properties: {
        win_probability: { type: "number", description: "0-100" },
        summary: { type: "string" },
        recommendations: { type: "array", items: { type: "object", properties: { title: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] }, rationale: { type: "string" } }, required: ["title", "priority", "rationale"] } },
        risks: { type: "array", items: { type: "object", properties: { description: { type: "string" }, severity: { type: "string", enum: ["high", "medium", "low"] }, mitigation: { type: "string" } }, required: ["description", "severity", "mitigation"] } },
        next_actions: { type: "array", items: { type: "object", properties: { action: { type: "string" }, owner: { type: "string" }, due_in_days: { type: "number" } }, required: ["action", "owner", "due_in_days"] } },
        draft_email: { type: "string", description: "E-mail de follow-up em PT-BR pronto para envio" },
      },
      required: ["win_probability", "summary", "recommendations", "risks", "next_actions", "draft_email"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { dealId } = await req.json();
    if (!dealId) return new Response(JSON.stringify({ error: "dealId requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: deal } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    if (!deal) return new Response(JSON.stringify({ error: "deal não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: lead } = deal.lead_id ? await supabase.from("leads").select("*").eq("id", deal.lead_id).maybeSingle() : { data: null };
    const { data: acts } = await supabase.from("crm_activities").select("type,subject,body,occurred_at").eq("deal_id", dealId).order("occurred_at", { ascending: false }).limit(20);

    const ctx = `Deal: ${deal.company_name}
Status: ${deal.status} | Valor: R$${deal.value} | Prob atual: ${deal.probability ?? "—"}%
Fechamento esperado: ${deal.expected_close ?? "—"}
Modelo: ${deal.pricing_model ?? "—"}
Escopo: ${deal.scope_summary}
${lead ? `Lead origem: ${lead.source}, score ${lead.score ?? "—"}, segmento ${lead.segment ?? "—"}` : ""}

Atividades:
${(acts ?? []).map((a: any) => `- ${a.occurred_at?.slice(0, 10)} [${a.type}] ${a.subject}`).join("\n") || "—"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um Sales Coach sênior B2B. Analise o deal e produza insights acionáveis em PT-BR usando a ferramenta deal_insight." },
          { role: "user", content: ctx },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "deal_insight" } },
      }),
    });

    if (resp.status === 429 || resp.status === 402) {
      return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limit" : "Sem créditos" }), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return new Response(JSON.stringify({ error: "Sem resposta estruturada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const parsed = JSON.parse(args);

    const { data: inserted, error } = await supabase.from("deal_ai_insights").insert({
      deal_id: dealId,
      win_probability: parsed.win_probability,
      summary: parsed.summary,
      recommendations: parsed.recommendations,
      risks: parsed.risks,
      next_actions: parsed.next_actions,
      draft_email: parsed.draft_email,
      model: "google/gemini-3-flash-preview",
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ insight: inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-deal-coach", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

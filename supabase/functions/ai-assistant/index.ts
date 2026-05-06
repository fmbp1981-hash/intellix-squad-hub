// AI Assistant - streaming contextual chat for projects, deals, sprints
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function loadContext(supabase: any, ctx: string, id: string): Promise<string> {
  if (ctx === "project") {
    const { data: p } = await supabase.from("agile_projects").select("*").eq("id", id).maybeSingle();
    if (!p) return "Projeto não encontrado.";
    const { data: epics } = await supabase.from("epics").select("title,status,priority,moscow,story_points_estimated").eq("project_id", id);
    const { data: stories } = await supabase.from("user_stories").select("persona,action,benefit,status,story_points,moscow,blocked").eq("project_id", id).limit(50);
    const { data: sprints } = await supabase.from("sprints").select("number,name,status,goal,committed_points,completed_points").eq("project_id", id).order("number", { ascending: false }).limit(5);
    const { data: imp } = await supabase.from("impediments").select("title,impact,status").eq("project_id", id).eq("status", "open");
    return `# Projeto: ${p.name}
Cliente: ${p.client_name ?? "—"} | Status: ${p.status} | Tipo: ${p.project_type}
Velocidade atual: ${p.current_velocity ?? "—"} | Pontos totais: ${p.total_story_points} | Concluídos: ${p.completed_points}
Definition of Done: ${p.definition_of_done ?? "—"}

## Épicos (${epics?.length ?? 0})
${(epics ?? []).map((e: any) => `- [${e.status}] ${e.title} (${e.moscow ?? "—"}, ${e.story_points_estimated ?? "?"} pts)`).join("\n")}

## Histórias (amostra)
${(stories ?? []).map((s: any) => `- [${s.status}] Como ${s.persona}, quero ${s.action}, para ${s.benefit} (${s.story_points ?? "?"} pts)${s.blocked ? " 🚫" : ""}`).join("\n")}

## Sprints recentes
${(sprints ?? []).map((s: any) => `- Sprint ${s.number} ${s.name ?? ""} [${s.status}]: ${s.completed_points}/${s.committed_points} pts — ${s.goal}`).join("\n")}

## Impedimentos abertos
${(imp ?? []).map((i: any) => `- [${i.impact}] ${i.title}`).join("\n") || "Nenhum"}`;
  }
  if (ctx === "deal") {
    const { data: d } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    if (!d) return "Deal não encontrado.";
    const { data: acts } = await supabase.from("crm_activities").select("type,subject,occurred_at").eq("deal_id", id).order("occurred_at", { ascending: false }).limit(10);
    return `# Deal: ${d.company_name}
Status: ${d.status} | Valor: R$${d.value} | Probabilidade: ${d.probability ?? "—"}%
Fechamento esperado: ${d.expected_close ?? "—"} | Modelo: ${d.pricing_model ?? "—"}
Escopo: ${d.scope_summary}

## Atividades recentes
${(acts ?? []).map((a: any) => `- ${a.occurred_at?.slice(0, 10)} [${a.type}] ${a.subject}`).join("\n") || "Sem atividades"}`;
  }
  if (ctx === "sprint") {
    const { data: s } = await supabase.from("sprints").select("*").eq("id", id).maybeSingle();
    if (!s) return "Sprint não encontrada.";
    const { data: stories } = await supabase.from("user_stories").select("action,status,story_points,blocked,blocked_reason").eq("sprint_id", id);
    const { data: imp } = await supabase.from("impediments").select("title,impact,status").eq("sprint_id", id);
    return `# Sprint ${s.number} — ${s.name ?? ""}
Goal: ${s.goal}
Status: ${s.status} | ${s.start_date} → ${s.end_date}
Comprometido: ${s.committed_points} | Concluído: ${s.completed_points}

## Histórias
${(stories ?? []).map((x: any) => `- [${x.status}] ${x.action} (${x.story_points ?? "?"} pts)${x.blocked ? ` 🚫 ${x.blocked_reason}` : ""}`).join("\n")}

## Impedimentos
${(imp ?? []).map((i: any) => `- [${i.status}/${i.impact}] ${i.title}`).join("\n") || "Nenhum"}`;
  }
  return "Contexto global: nenhuma entidade específica.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { context = "global", entityId, prompt, history = [], mode = "ask" } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const ctxText = entityId ? await loadContext(supabase, context, entityId) : "Sem contexto específico.";

    const systemByMode: Record<string, string> = {
      ask: "Você é um assistente sênior de operações da Intellix. Responda de forma objetiva, em português, usando o contexto fornecido. Cite dados concretos quando possível.",
      summarize: "Resuma o contexto fornecido em até 6 bullets, destacando saúde, riscos e próximos passos.",
      next_actions: "Liste 3 a 5 próximas ações priorizadas (alta/média/baixa) com responsável sugerido.",
      risk_analysis: "Identifique riscos (técnicos, de prazo, de escopo, de pessoas) com severidade e mitigação.",
    };
    const system = `${systemByMode[mode] ?? systemByMode.ask}\n\n--- CONTEXTO ---\n${ctxText}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: system }, ...history, { role: "user", content: prompt }],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) return new Response(JSON.stringify({ error: `Gateway error ${resp.status}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

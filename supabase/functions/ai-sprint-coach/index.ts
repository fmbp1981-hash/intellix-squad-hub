// AI Sprint Coach - analyse active sprint and emit alerts
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
    name: "sprint_alerts",
    description: "Lista de alertas detectados",
    parameters: {
      type: "object",
      properties: {
        alerts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["delay_risk", "scope_creep", "blocker_aging", "low_throughput", "wip_overload", "quality"] },
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              message: { type: "string" },
              suggested_action: { type: "string" },
            },
            required: ["type", "severity", "message", "suggested_action"],
          },
        },
      },
      required: ["alerts"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { sprintId } = await req.json();
    if (!sprintId) return new Response(JSON.stringify({ error: "sprintId requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: sprint } = await supabase.from("sprints").select("*").eq("id", sprintId).maybeSingle();
    if (!sprint) return new Response(JSON.stringify({ error: "sprint não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: stories } = await supabase.from("user_stories").select("action,status,story_points,blocked,blocked_reason,started_at").eq("sprint_id", sprintId);
    const { data: imp } = await supabase.from("impediments").select("title,impact,status,created_at").eq("sprint_id", sprintId);
    const { data: metrics } = await supabase.from("sprint_metrics").select("*").eq("sprint_id", sprintId).order("recorded_date", { ascending: false }).limit(7);

    const ctx = `Sprint ${sprint.number} (${sprint.status}) ${sprint.start_date}→${sprint.end_date}
Goal: ${sprint.goal}
Comprometido: ${sprint.committed_points} | Concluído: ${sprint.completed_points} | Adicionado: ${sprint.added_points} | Removido: ${sprint.removed_points}

Histórias:
${(stories ?? []).map((s: any) => `- [${s.status}] ${s.action} (${s.story_points ?? "?"} pts)${s.blocked ? ` BLOCKED: ${s.blocked_reason}` : ""}`).join("\n")}

Impedimentos:
${(imp ?? []).map((i: any) => `- [${i.status}/${i.impact}] ${i.title} (aberto em ${i.created_at?.slice(0, 10)})`).join("\n") || "—"}

Métricas (últimos 7 dias):
${(metrics ?? []).map((m: any) => `- ${m.recorded_date}: restante ${m.remaining_points}/ ideal ${m.ideal_remaining}, WIP ${m.wip_count}`).join("\n") || "—"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um Scrum Master AI. Analise a sprint e gere alertas acionáveis (vazios se tudo estiver saudável)." },
          { role: "user", content: ctx },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "sprint_alerts" } },
      }),
    });
    if (resp.status === 429 || resp.status === 402) return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limit" : "Sem créditos" }), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const alerts = args ? JSON.parse(args).alerts : [];

    if (alerts.length) {
      await supabase.from("sprint_ai_alerts").insert(alerts.map((a: any) => ({
        sprint_id: sprintId,
        project_id: sprint.project_id,
        severity: a.severity,
        type: a.type,
        message: a.message,
        suggested_action: a.suggested_action,
      })));
    }
    return new Response(JSON.stringify({ alerts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-sprint-coach", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

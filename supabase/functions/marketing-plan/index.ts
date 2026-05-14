// marketing-plan — Maya (Claude Sonnet 4.6)
// Define as 3 pautas da semana e salva em content_calendar
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { callMarketingAgent } from "../_shared/marketing-llm.ts";

const MAYA_SYSTEM = `Você é Maya, diretora editorial da IntelliX.AI.
Com base nos tópicos curados e na estratégia da marca, defina as 3 pautas da semana.
Regras:
- Segunda: formato Estático, pilar P1 (Verdade Incômoda)
- Quarta: formato Carrossel 7 slides, pilar P2 ou P3
- Sexta: formato Reel ou Carrossel, pilar P3 ou P5
- Público: CEOs e líderes de PMEs no Brasil/LATAM
- Tom: estratégico, calmo, confiante
- NUNCA use: API, workflow, chatbot, automação, GPT, LLM, n8n, Make, Supabase, pipeline, stack, deploy
Retorne SOMENTE um array JSON:
[{"scheduled_for":"2026-05-18T12:00:00-03:00","pillar":"P1","format":"estatico","theme":"...","hook_suggestion":"..."}]`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (svc && auth !== `Bearer ${svc}`) return jsonResponse({ error: "unauthorized" }, 401);

  const { week_start } = await req.json().catch(() => ({}));
  if (!week_start) return jsonResponse({ error: "week_start required" }, 400);

  const supa = adminClient();

  const [{ data: curated }, { data: strategy }] = await Promise.all([
    supa.from("trends_curated").select("titulo_original,angulo_editorial,categoria,potencial_engajamento,formato_sugerido").eq("is_top_5_semana", true).limit(10),
    supa.from("strategy_context").select("value").eq("key", "intellix_instagram_strategy").single(),
  ]);

  const topicsText = (curated ?? []).map((t, i) => `${i + 1}. ${t.titulo_original} — ângulo: ${t.angulo_editorial ?? "n/a"}`).join("\n");
  const strat = JSON.stringify((strategy as any)?.value ?? {}, null, 2);

  const result = await callMarketingAgent("maya", [
    { role: "system", content: MAYA_SYSTEM },
    { role: "user", content: `Semana de ${week_start}.\n\nEstratégia:\n${strat}\n\nTópicos curados:\n${topicsText}` },
  ]);

  let pautas: any[] = [];
  try {
    const match = result.content.match(/\[[\s\S]*\]/);
    pautas = match ? JSON.parse(match[0]) : [];
  } catch {
    return jsonResponse({ error: "parse_failed", raw: result.content.slice(0, 500) }, 500);
  }

  const toInsert = pautas.map((p) => ({
    week_start,
    scheduled_for:     p.scheduled_for,
    pillar:            p.pillar,
    format:            p.format,
    theme:             p.theme,
    hook_suggestion:   p.hook_suggestion,
    trends_curated_ids: "[]",
    status:            "draft",
  }));

  if (toInsert.length > 0) {
    const { error } = await supa.from("content_calendar").insert(toInsert);
    if (error) return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true, week_start, pautas_count: toInsert.length });
});

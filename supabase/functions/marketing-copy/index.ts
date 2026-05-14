// marketing-copy — Téo (Claude Sonnet 4.6)
// Escreve hook, legenda, CTA, hashtags e estrutura de slides
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { callMarketingAgent, dispatchNext } from "../_shared/marketing-llm.ts";

const FORBIDDEN = ["API","workflow","chatbot","automação","GPT","LLM","n8n","Make","Supabase","pipeline","stack","deploy","automacao"];

const TEO_SYSTEM = `Você é Téo, redator sênior da IntelliX.AI.
Escreva copy de alta performance para Instagram para CEOs e líderes de PMEs.
Regras absolutas:
- NUNCA use: API, workflow, chatbot, automação, GPT, LLM, n8n, Make, Supabase, pipeline, stack, deploy
- Tom: estratégico, direto, resultado de negócio
- Gancho: primeiras 15 palavras devem prender sem o restante
- CTA: claro, orientado a valor, sem pressão
- Hashtags: 5-8, mistura broad + nicho
Para carrossel: inclua slide_structure com {slide_index, title, body} para cada slide
Retorne SOMENTE JSON:
{"hook":"...","caption":"...","cta":"...","hashtags":["..."],"slide_structure":[{"slide_index":1,"title":"...","body":"..."}]}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (svc && auth !== `Bearer ${svc}`) return jsonResponse({ error: "unauthorized" }, 401);

  const { calendar_id } = await req.json().catch(() => ({}));
  if (!calendar_id) return jsonResponse({ error: "calendar_id required" }, 400);

  const supa = adminClient();
  const [{ data: cal }, { data: strategy }] = await Promise.all([
    supa.from("content_calendar").select("*").eq("id", calendar_id).single(),
    supa.from("strategy_context").select("value").eq("key", "intellix_instagram_strategy").single(),
  ]);

  if (!cal) return jsonResponse({ error: "calendar_not_found" }, 404);

  const strat = JSON.stringify((strategy as any)?.value ?? {}, null, 2);
  const result = await callMarketingAgent("teo", [
    { role: "system", content: TEO_SYSTEM },
    { role: "user", content: `Pauta aprovada:\nTema: ${cal.theme}\nPilar: ${cal.pillar}\nFormato: ${cal.format}\nGancho sugerido: ${cal.hook_suggestion ?? "livre"}\n\nEstratégia:\n${strat}` },
  ]);

  let copy: any = {};
  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    copy = match ? JSON.parse(match[0]) : {};
  } catch {
    return jsonResponse({ error: "parse_failed", raw: result.content.slice(0, 500) }, 500);
  }

  // Detecta termos proibidos
  const fullText = `${copy.hook ?? ""} ${copy.caption ?? ""}`.toLowerCase();
  const foundForbidden = FORBIDDEN.filter(t => fullText.includes(t.toLowerCase()));

  const { data: draft, error } = await supa.from("content_drafts").insert({
    calendar_id,
    hook:                  copy.hook ?? "",
    caption:               copy.caption ?? "",
    cta:                   copy.cta ?? "",
    hashtags:              copy.hashtags ?? [],
    slide_structure:       copy.slide_structure ?? null,
    word_count:            (copy.caption ?? "").split(/\s+/).length,
    forbidden_terms_found: foundForbidden.length > 0 ? foundForbidden : null,
    status:                "draft",
  }).select("id").single();

  if (error) return jsonResponse({ error: error.message }, 500);

  // Dispara Vera automaticamente
  dispatchNext("marketing-visual", { draft_id: draft!.id });

  return jsonResponse({ ok: true, draft_id: draft!.id, forbidden_found: foundForbidden });
});

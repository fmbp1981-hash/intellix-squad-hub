// marketing-intelligence — Otto (Claude Sonnet 4.6)
// Análise de perfis externos (Instagram/website) sob demanda
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { callMarketingAgent } from "../_shared/marketing-llm.ts";

const OTTO_SYSTEM = `Você é Otto, analista de inteligência competitiva da IntelliX.AI.
Analise o conteúdo fornecido e extraia o Design DNA completo.
Retorne SOMENTE JSON:
{"editorial_insights":"...","dominant_format":"...","posting_frequency":"...","recommended_adaptations":[{"area":"...","suggestion":"..."}],"dna":{"layout_style":"...","text_density":"light|medium|heavy","hook_patterns":["..."],"copy_framework":"...","avg_words_per_slide":12,"emoji_usage":"none|light|moderate|heavy","hashtag_count":8,"uses_face":false,"uses_illustrations":false,"uses_photography":false,"cta_slide_style":"...","confidence_score":0.85}}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (svc && auth !== `Bearer ${svc}`) return jsonResponse({ error: "unauthorized" }, 401);

  const { target, type } = await req.json().catch(() => ({}));
  if (!target || !type) return jsonResponse({ error: "target and type required" }, 400);

  const supa = adminClient();

  // Fetch conteúdo via Jina Reader para websites
  let fetchedContent = "";
  if (type === "website" || type === "blog") {
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${target}`);
      if (jinaRes.ok) fetchedContent = (await jinaRes.text()).slice(0, 8000);
    } catch { /* continua sem conteúdo */ }
  }

  const result = await callMarketingAgent("otto", [
    { role: "system", content: OTTO_SYSTEM },
    {
      role: "user",
      content: `Analise: ${target} (tipo: ${type})\n\n${fetchedContent ? `Conteúdo extraído:\n${fetchedContent}` : "Analise com base no handle/URL fornecido."}`,
    },
  ]);

  let analysis: any = {};
  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    analysis = match ? JSON.parse(match[0]) : {};
  } catch {
    return jsonResponse({ error: "parse_failed", raw: result.content.slice(0, 500) }, 500);
  }

  const { data: profile, error: pErr } = await supa.from("competitor_profiles").insert({
    handle_or_url:            target,
    platform:                 type,
    editorial_insights:       analysis.editorial_insights ?? "",
    dominant_format:          analysis.dominant_format ?? "",
    posting_frequency:        analysis.posting_frequency ?? "",
    recommended_adaptations:  analysis.recommended_adaptations ?? [],
  }).select("id").single();
  if (pErr) return jsonResponse({ error: pErr.message }, 500);

  const dna = analysis.dna ?? {};
  const { data: dnaRow, error: dErr } = await supa.from("design_dna_extracted").insert({
    competitor_profile_id: profile!.id,
    layout_style:          dna.layout_style ?? "",
    text_density:          dna.text_density ?? "medium",
    hook_patterns:         dna.hook_patterns ?? [],
    copy_framework:        dna.copy_framework ?? "",
    avg_words_per_slide:   dna.avg_words_per_slide ?? 0,
    emoji_usage:           dna.emoji_usage ?? "light",
    hashtag_count:         dna.hashtag_count ?? 0,
    uses_face:             dna.uses_face ?? false,
    uses_illustrations:    dna.uses_illustrations ?? false,
    uses_photography:      dna.uses_photography ?? false,
    cta_slide_style:       dna.cta_slide_style ?? "",
    confidence_score:      dna.confidence_score ?? 0.7,
    notes:                 analysis.editorial_insights ?? "",
  }).select("id").single();
  if (dErr) return jsonResponse({ error: dErr.message }, 500);

  return jsonResponse({
    ok: true,
    profile_id: profile!.id,
    dna_id: dnaRow!.id,
    recommended_adaptations: analysis.recommended_adaptations ?? [],
  });
});

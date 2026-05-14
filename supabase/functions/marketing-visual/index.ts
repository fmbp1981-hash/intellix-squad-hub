// marketing-visual — Vera (Claude Sonnet 4.6)
// Gera briefing visual com specs por slide e canva_master_prompt
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { callMarketingAgent, dispatchNext } from "../_shared/marketing-llm.ts";

const VERA_SYSTEM = `Você é Vera, diretora de arte da IntelliX.AI.
Crie briefing visual detalhado para cada post aprovado.
Paleta obrigatória IntelliX:
- Background: #0D2B45 (azul marinho profundo)
- Accent: #F5C434 (dourado)
- Primary: #269BEA (azul elétrico)
- Branco: #FFFFFF
- Fonte título: DM Sans Bold
- Fonte corpo: Inter Regular
NUNCA aplique cores ou fontes externas de concorrentes — apenas inspire na estrutura visual.
Para carrossel: specs para cada slide com layout, notas visuais e prompt Canva específico.
Retorne SOMENTE JSON:
{"slide_specs":[{"slide_index":1,"layout":"cover|text_heavy|quote|cta","visual_notes":"...","canva_prompt":"..."}],"canva_master_prompt":"...","uses_face":false,"cover_style":"clean|bold|minimal"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (svc && auth !== `Bearer ${svc}`) return jsonResponse({ error: "unauthorized" }, 401);

  const { draft_id, competitor_dna_id } = await req.json().catch(() => ({}));
  if (!draft_id) return jsonResponse({ error: "draft_id required" }, 400);

  const supa = adminClient();
  const queries: Promise<any>[] = [
    supa.from("content_drafts").select("*, content_calendar(*)").eq("id", draft_id).single(),
    supa.from("strategy_context").select("value").eq("key", "intellix_instagram_strategy").single(),
  ];
  if (competitor_dna_id) {
    queries.push(supa.from("design_dna_extracted").select("*").eq("id", competitor_dna_id).single());
  }

  const results = await Promise.all(queries);
  const draft    = (results[0] as any).data;
  const strategy = (results[1] as any).data;
  const dna      = competitor_dna_id ? (results[2] as any).data : null;

  if (!draft) return jsonResponse({ error: "draft_not_found" }, 404);

  const dnaContext = dna
    ? `\nDNA de referência estrutural (manter paleta IntelliX): layout=${dna.layout_style}, densidade=${dna.text_density}, cobertura=${dna.cover_style}`
    : "";

  const result = await callMarketingAgent("vera", [
    { role: "system", content: VERA_SYSTEM },
    {
      role: "user",
      content: `Gancho: ${draft.hook}\nLegenda: ${draft.caption}\nFormato: ${(draft.content_calendar as any)?.format ?? "estatico"}\nSlides: ${JSON.stringify(draft.slide_structure ?? [])}${dnaContext}`,
    },
  ]);

  let brief: any = {};
  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    brief = match ? JSON.parse(match[0]) : {};
  } catch {
    return jsonResponse({ error: "parse_failed", raw: result.content.slice(0, 500) }, 500);
  }

  const { data: vb, error } = await supa.from("visual_briefs").insert({
    draft_id,
    slide_specs:          brief.slide_specs ?? null,
    canva_master_prompt:  brief.canva_master_prompt ?? "",
    uses_face:            brief.uses_face ?? false,
    cover_style:          brief.cover_style ?? "clean",
    competitor_dna_id:    competitor_dna_id ?? null,
  }).select("id").single();

  if (error) return jsonResponse({ error: error.message }, 500);

  // Dispara Sofia
  dispatchNext("marketing-review", { draft_id });

  return jsonResponse({ ok: true, visual_brief_id: vb!.id });
});

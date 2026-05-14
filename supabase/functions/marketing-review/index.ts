// marketing-review — Sofia (Claude Opus 4.6)
// Checklist de 7 pontos; aprova ou devolve com issues
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { callMarketingAgent } from "../_shared/marketing-llm.ts";

const SOFIA_SYSTEM = `Você é Sofia, revisora sênior da IntelliX.AI.
Aplique o checklist de 7 pontos e decida: approved | rejected | revision_needed.
Checklist:
1. jargao_ok: NENHUM dos termos proibidos (API, workflow, chatbot, automação, GPT, LLM, n8n, Make, Supabase, pipeline, stack, deploy)
2. tom_ok: linguagem de resultado de negócio, não técnica
3. gancho_ok: primeiras 15 palavras prendem sem o restante
4. cta_ok: claro, sem pressão, orientado a valor
5. visual_ok: paleta IntelliX correta no briefing (#0D2B45, #F5C434, #269BEA)
6. formato_ok: estrutura certa para o dia (7 slides na Quarta, estático na Segunda)
7. pilar_ok: post alinhado ao pilar definido
Retorne SOMENTE JSON:
{"status":"approved|rejected|revision_needed","checklist":{"jargao_ok":true,"tom_ok":true,"gancho_ok":true,"cta_ok":true,"visual_ok":true,"formato_ok":true,"pilar_ok":true},"issues_found":[],"suggestions":""}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (svc && auth !== `Bearer ${svc}`) return jsonResponse({ error: "unauthorized" }, 401);

  const { draft_id } = await req.json().catch(() => ({}));
  if (!draft_id) return jsonResponse({ error: "draft_id required" }, 400);

  const supa = adminClient();
  const [{ data: draft }, { data: vb }] = await Promise.all([
    supa.from("content_drafts").select("*, content_calendar(pillar,format,scheduled_for)").eq("id", draft_id).single(),
    supa.from("visual_briefs").select("*").eq("draft_id", draft_id).maybeSingle(),
  ]);
  if (!draft) return jsonResponse({ error: "draft_not_found" }, 404);

  const cal = (draft as any).content_calendar ?? {};
  const context = `
Gancho: ${draft.hook}
Legenda: ${draft.caption}
CTA: ${draft.cta ?? "—"}
Hashtags: ${(draft.hashtags ?? []).join(" ")}
Pilar: ${cal.pillar ?? "?"}
Formato: ${cal.format ?? "?"}
Termos proibidos detectados: ${(draft.forbidden_terms_found ?? []).join(", ") || "nenhum"}
Canva master prompt: ${vb?.canva_master_prompt ?? "—"}
Cores no brief: ${vb ? `bg=${vb.bg_color}, accent=${vb.accent_color}, primary=${vb.primary_color}` : "sem brief"}`;

  const result = await callMarketingAgent("sofia", [
    { role: "system", content: SOFIA_SYSTEM },
    { role: "user", content: context },
  ]);

  let review: any = {};
  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    review = match ? JSON.parse(match[0]) : {};
  } catch {
    return jsonResponse({ error: "parse_failed", raw: result.content.slice(0, 500) }, 500);
  }

  const { error: rrErr } = await supa.from("review_results").insert({
    draft_id,
    status:       review.status ?? "revision_needed",
    checklist:    review.checklist ?? {},
    issues_found: review.issues_found ?? [],
    suggestions:  review.suggestions ?? "",
  });
  if (rrErr) return jsonResponse({ error: rrErr.message }, 500);

  // Atualiza status do draft
  const draftStatus = review.status === "approved" ? "approved" : "rejected";
  await supa.from("content_drafts").update({ status: draftStatus }).eq("id", draft_id);

  return jsonResponse({ ok: true, review_status: review.status, issues: review.issues_found ?? [] });
});

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { loadLlmConfig, runLlm, LlmMessage } from "../_shared/llm-provider.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

// ── Schema ────────────────────────────────────────────────────────────────────

const BodySchema = z.union([
  z.object({ step: z.literal("lucio_research") }),
  z.object({ step: z.literal("maya_calendar") }),
  z.object({ step: z.literal("teo_copy"),     calendar_id: z.string().uuid(), post_number: z.number().int().min(1).max(3) }),
  z.object({ step: z.literal("vera_visual"),  calendar_id: z.string().uuid(), post_number: z.number().int().min(1).max(3), draft_id: z.string().uuid() }),
  z.object({ step: z.literal("sofia_review"), calendar_id: z.string().uuid(), post_number: z.number().int().min(1).max(3), draft_id: z.string().uuid(), visual_brief_id: z.string().uuid() }),
]);

type Body = z.infer<typeof BodySchema>;

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_REVIEW_RETRIES = 3;

// ── Shared helpers ────────────────────────────────────────────────────────────

function thisMonday(): string {
  const d = new Date();
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().split("T")[0];
}

/** Extrai o primeiro bloco ```json ... ``` do output do LLM como objeto. */
function extractJson<T>(output: string): T | null {
  const re = /```json\s*([\s\S]*?)\s*```/g;
  for (const m of output.matchAll(re)) {
    try { return JSON.parse(m[1]) as T; } catch { /* try next */ }
  }
  try { return JSON.parse(output.trim()) as T; } catch { /* */ }
  return null;
}

async function buildSystemPrompt(
  agent: { name: string; persona: string | null; system_prompt: string | null; skill_name: string | null },
  input: unknown,
  supa: SupabaseClient,
): Promise<string> {
  const base = agent.system_prompt ?? agent.persona ?? `Você é ${agent.name}. Responda em JSON estruturado.`;
  if (!agent.skill_name) return base;

  const inputText = typeof input === "string" ? input : JSON.stringify(input);
  const inputTokens = inputText.toLowerCase().split(/\W+/).filter(Boolean);

  const { data: skillFiles } = await supa
    .from("skill_files")
    .select("file_path, content_md, is_always_loaded, load_when_context")
    .eq("skill_name", agent.skill_name);

  if (!skillFiles?.length) return base;

  const alwaysLoaded = skillFiles.filter((f) => f.is_always_loaded);
  const contextual = skillFiles.filter((f) => {
    if (f.is_always_loaded) return false;
    const triggers: string[] = Array.isArray(f.load_when_context) ? f.load_when_context : [];
    return triggers.some((t) =>
      inputTokens.some((tok) =>
        tok.includes(t.toLowerCase()) || t.toLowerCase().includes(tok)
      )
    );
  });

  const blocks = [...alwaysLoaded, ...contextual].map(
    (f) => `\n\n---\n\n## SKILL CARREGADA: ${f.file_path}\n\n${f.content_md}`,
  );
  return base + blocks.join("");
}

async function loadAgent(llmConfigKey: string, supa: SupabaseClient) {
  const { data } = await supa
    .from("agent_configs")
    .select("id, name, persona, system_prompt, skill_name, llm_config_key")
    .eq("llm_config_key", llmConfigKey)
    .eq("active", true)
    .maybeSingle();
  if (!data) throw new Error(`agent not found for key: ${llmConfigKey}`);
  return data;
}

async function getAdminUserId(supa: SupabaseClient): Promise<string | null> {
  const { data } = await supa
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function notify(
  supa: SupabaseClient,
  opts: { title: string; body: string; priority?: string; category: string; userId?: string | null },
) {
  await supa.from("notifications").insert({
    user_id: opts.userId ?? null,
    type: opts.category,
    title: opts.title,
    body: opts.body,
    channel: "whatsapp",
    priority: opts.priority ?? "high",
    category: opts.category,
    scheduled_for: new Date().toISOString(),
  });
}

function selfChain(step: Record<string, unknown>) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketing-weekly-pipeline`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(step),
  }).catch((e) => console.error("[pipeline] chain error", e));
}

async function runAgent(
  agent: Awaited<ReturnType<typeof loadAgent>>,
  userMsg: string,
  supa: SupabaseClient,
): Promise<string> {
  const systemPrompt = await buildSystemPrompt(agent, userMsg, supa);
  const cfg = await loadLlmConfig(agent.llm_config_key);
  const messages: LlmMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMsg },
  ];
  const result = await runLlm(cfg, messages);
  return result.content;
}

// ── Steps ─────────────────────────────────────────────────────────────────────

async function stepLucioResearch(supa: SupabaseClient) {
  const agent = await loadAgent("squad:marketing:researcher", supa);
  const weekStart = thisMonday();

  const userMsg = `Pesquise as 5 principais tendências de conteúdo digital para a semana de ${weekStart}. Foque em temas relevantes para B2B tech, IA e produtividade.

Retorne EXCLUSIVAMENTE um JSON no formato:
\`\`\`json
{
  "items": [
    {
      "rank": 1,
      "trend": "nome da tendência",
      "relevance": "por que é relevante agora",
      "suggested_angle": "ângulo de conteúdo recomendado",
      "sources": ["fonte 1", "fonte 2"]
    }
  ]
}
\`\`\``;

  const output = await runAgent(agent, userMsg, supa);
  const parsed = extractJson<{ items: unknown[] }>(output);

  const { data: report, error } = await supa
    .from("trends_reports")
    .insert({
      week_start: weekStart,
      run_date: new Date().toISOString().split("T")[0],
      items_json: parsed?.items ?? [],
      source_agent: agent.name,
    })
    .select("id")
    .single();

  if (error) throw new Error(`trends_reports insert: ${error.message}`);
  console.log(`[lucio] report ${report.id} — ${parsed?.items?.length ?? 0} trends`);
  return { ok: true, report_id: report.id, items_count: parsed?.items?.length ?? 0 };
}

async function stepMayaCalendar(supa: SupabaseClient) {
  const agent = await loadAgent("squad:marketing:strategist", supa);

  const { data: report } = await supa
    .from("trends_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) throw new Error("nenhum trends_report encontrado — execute lucio_research primeiro");

  const weekStart = report.week_start;
  const userMsg = `Com base no relatório de tendências abaixo, crie o calendário editorial para a semana de ${weekStart} com exatamente 3 posts.

Tendências da semana:
${JSON.stringify(report.items_json, null, 2)}

Retorne EXCLUSIVAMENTE um JSON no formato:
\`\`\`json
{
  "posts": [
    {
      "post_number": 1,
      "theme": "tema do post",
      "trend_reference": "qual tendência este post aproveita",
      "instagram": { "objective": "...", "format": "carrossel|reels|feed", "hook": "...", "cta": "..." },
      "linkedin": { "objective": "...", "format": "artigo|post|documento", "hook": "...", "cta": "..." },
      "frameworks": ["AIDA", "StoryBrand"],
      "target_audience": "..."
    }
  ],
  "notes_for_felipe": "observações estratégicas para o PO"
}
\`\`\``;

  const output = await runAgent(agent, userMsg, supa);
  const parsed = extractJson<{ posts: unknown[]; notes_for_felipe?: string }>(output);

  const { data: calendar, error } = await supa
    .from("content_calendar")
    .insert({
      week_start: weekStart,
      posts_json: parsed?.posts ?? [],
      status: "pending_approval",
      based_on_report_id: report.id,
      notes_for_felipe: parsed?.notes_for_felipe ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`content_calendar insert: ${error.message}`);

  const adminId = await getAdminUserId(supa);
  await notify(supa, {
    userId: adminId,
    title: "📅 Calendário editorial pronto para aprovação",
    body: `Maya gerou o calendário da semana ${weekStart} com ${(parsed?.posts ?? []).length} posts.\n\nNotas: ${parsed?.notes_for_felipe ?? "—"}\n\nCalendário ID: ${calendar.id}`,
    category: "calendar_approval",
  });

  console.log(`[maya] calendar ${calendar.id} — pending_approval`);
  return { ok: true, calendar_id: calendar.id, week_start: weekStart };
}

async function stepTeo(supa: SupabaseClient, calendarId: string, postNumber: number) {
  const agent = await loadAgent("squad:marketing:copywriter", supa);

  const { data: calendar } = await supa
    .from("content_calendar")
    .select("posts_json, week_start, status")
    .eq("id", calendarId)
    .single();

  if (!calendar) throw new Error(`calendar ${calendarId} not found`);
  if (calendar.status === "pending_approval") {
    throw new Error(`calendar ${calendarId} still pending approval — Felipe must approve first`);
  }

  const posts = calendar.posts_json as any[];
  const postSpec = posts.find((p: any) => p.post_number === postNumber);
  if (!postSpec) throw new Error(`post_number ${postNumber} not in calendar`);

  const userMsg = `Crie a copy completa para o Post ${postNumber} da semana ${calendar.week_start}.

Briefing aprovado:
${JSON.stringify(postSpec, null, 2)}

Retorne EXCLUSIVAMENTE um JSON no formato:
\`\`\`json
{
  "instagram_json": {
    "caption": "texto completo do post",
    "hashtags": ["#tag1", "#tag2"],
    "first_comment": "primeiro comentário com hashtags adicionais",
    "alt_text": "descrição de acessibilidade"
  },
  "linkedin_json": {
    "headline": "título do post",
    "body": "corpo completo do post",
    "hashtags": ["#tag1"],
    "cta": "chamada para ação"
  },
  "frameworks_used": ["AIDA"],
  "open_questions": ["dúvidas que o copy levanta para o PO"]
}
\`\`\``;

  const output = await runAgent(agent, userMsg, supa);
  const parsed = extractJson<{
    instagram_json: unknown;
    linkedin_json: unknown;
    frameworks_used: string[];
    open_questions: string[];
  }>(output);

  // Upsert — se já existir (retry), atualiza
  const { data: existing } = await supa
    .from("content_drafts")
    .select("id")
    .eq("calendar_id", calendarId)
    .eq("post_number", postNumber)
    .maybeSingle();

  let draftId: string;
  if (existing) {
    await supa.from("content_drafts").update({
      instagram_json: parsed?.instagram_json ?? null,
      linkedin_json: parsed?.linkedin_json ?? null,
      frameworks_used: parsed?.frameworks_used ?? [],
      open_questions: parsed?.open_questions ?? [],
      status: "pending_visual",
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    draftId = existing.id;
  } else {
    const { data: draft, error } = await supa
      .from("content_drafts")
      .insert({
        calendar_id: calendarId,
        post_number: postNumber,
        instagram_json: parsed?.instagram_json ?? null,
        linkedin_json: parsed?.linkedin_json ?? null,
        frameworks_used: parsed?.frameworks_used ?? [],
        open_questions: parsed?.open_questions ?? [],
        status: "pending_visual",
      })
      .select("id")
      .single();
    if (error) throw new Error(`content_drafts insert: ${error.message}`);
    draftId = draft.id;
  }

  console.log(`[teo] draft ${draftId} — post ${postNumber}`);
  selfChain({ step: "vera_visual", calendar_id: calendarId, post_number: postNumber, draft_id: draftId });
  return { ok: true, draft_id: draftId };
}

async function stepVera(supa: SupabaseClient, calendarId: string, postNumber: number, draftId: string) {
  const agent = await loadAgent("squad:marketing:art-director", supa);

  const { data: draft } = await supa
    .from("content_drafts")
    .select("instagram_json, linkedin_json")
    .eq("id", draftId)
    .single();

  if (!draft) throw new Error(`draft ${draftId} not found`);

  const userMsg = `Crie o briefing visual executável para o Post ${postNumber}.

Copy do Téo:
Instagram: ${JSON.stringify(draft.instagram_json, null, 2)}
LinkedIn: ${JSON.stringify(draft.linkedin_json, null, 2)}

Retorne EXCLUSIVAMENTE um JSON no formato:
\`\`\`json
{
  "instagram_brief_json": {
    "format": "carrossel 4:5 | feed 1:1 | stories 9:16",
    "dimensions": "1080x1350px",
    "visual_concept": "descrição do conceito visual",
    "color_palette": ["#hex1", "#hex2"],
    "typography": "fonte principal + hierarquia",
    "elements": ["elemento visual 1", "elemento visual 2"],
    "mood": "moderno | minimalista | vibrante",
    "reference_style": "referência estética"
  },
  "linkedin_brief_json": {
    "format": "documento PDF | imagem única | carrossel",
    "dimensions": "1200x627px",
    "visual_concept": "descrição do conceito visual",
    "color_palette": ["#hex1"],
    "typography": "fonte + hierarquia",
    "elements": ["elemento 1"],
    "mood": "profissional | institucional",
    "reference_style": "referência"
  }
}
\`\`\``;

  const output = await runAgent(agent, userMsg, supa);
  const parsed = extractJson<{ instagram_brief_json: unknown; linkedin_brief_json: unknown }>(output);

  // Upsert visual brief
  const { data: existing } = await supa
    .from("visual_briefs")
    .select("id")
    .eq("draft_id", draftId)
    .maybeSingle();

  let briefId: string;
  if (existing) {
    await supa.from("visual_briefs").update({
      instagram_brief_json: parsed?.instagram_brief_json ?? null,
      linkedin_brief_json: parsed?.linkedin_brief_json ?? null,
      status: "pending_review",
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    briefId = existing.id;
  } else {
    const { data: brief, error } = await supa
      .from("visual_briefs")
      .insert({
        draft_id: draftId,
        instagram_brief_json: parsed?.instagram_brief_json ?? null,
        linkedin_brief_json: parsed?.linkedin_brief_json ?? null,
        status: "pending_review",
      })
      .select("id")
      .single();
    if (error) throw new Error(`visual_briefs insert: ${error.message}`);
    briefId = brief.id;
  }

  await supa.from("content_drafts").update({ status: "pending_review" }).eq("id", draftId);

  console.log(`[vera] brief ${briefId} — draft ${draftId}`);
  selfChain({ step: "sofia_review", calendar_id: calendarId, post_number: postNumber, draft_id: draftId, visual_brief_id: briefId });
  return { ok: true, visual_brief_id: briefId };
}

async function stepSofia(
  supa: SupabaseClient,
  calendarId: string,
  postNumber: number,
  draftId: string,
  visualBriefId: string,
) {
  const agent = await loadAgent("squad:marketing:editor", supa);

  // Limite de retries para evitar loop infinito
  const { count: reviewCount } = await supa
    .from("review_results")
    .select("id", { count: "exact", head: true })
    .eq("draft_id", draftId);

  if ((reviewCount ?? 0) >= MAX_REVIEW_RETRIES) {
    await supa.from("content_drafts").update({ status: "needs_human_review" }).eq("id", draftId);
    const adminId = await getAdminUserId(supa);
    await notify(supa, {
      userId: adminId,
      title: `⚠️ Post ${postNumber} requer revisão manual`,
      body: `Após ${MAX_REVIEW_RETRIES} revisões, o Post ${postNumber} não foi aprovado. Acesse o painel para revisão manual.\nDraft ID: ${draftId}`,
      category: "needs_human_review",
    });
    return { ok: true, status: "needs_human_review", draft_id: draftId };
  }

  const [{ data: draft }, { data: brief }] = await Promise.all([
    supa.from("content_drafts").select("instagram_json, linkedin_json, frameworks_used, open_questions").eq("id", draftId).single(),
    supa.from("visual_briefs").select("instagram_brief_json, linkedin_brief_json").eq("id", visualBriefId).single(),
  ]);

  if (!draft) throw new Error(`draft ${draftId} not found`);
  if (!brief) throw new Error(`brief ${visualBriefId} not found`);

  const userMsg = `Revise com rigor o Post ${postNumber}. Esta é a revisão #${(reviewCount ?? 0) + 1} de no máximo ${MAX_REVIEW_RETRIES}.

COPY (Téo):
Instagram: ${JSON.stringify(draft.instagram_json, null, 2)}
LinkedIn: ${JSON.stringify(draft.linkedin_json, null, 2)}
Frameworks usados: ${JSON.stringify(draft.frameworks_used)}
Open questions: ${JSON.stringify(draft.open_questions)}

BRIEFING VISUAL (Vera):
Instagram: ${JSON.stringify(brief.instagram_brief_json, null, 2)}
LinkedIn: ${JSON.stringify(brief.linkedin_brief_json, null, 2)}

Retorne EXCLUSIVAMENTE um JSON no formato:
\`\`\`json
{
  "verdict": "approved",
  "copy_issues": [],
  "visual_issues": [],
  "coherence_issues": [],
  "areas_of_excellence": ["ponto forte 1"],
  "summary_for_felipe": "resumo executivo para o PO",
  "next_action": "pronto para publicação | reescrever copy | revisar visual"
}
\`\`\`
Se houver problemas, use "needs_revision" no verdict e liste os issues.`;

  const output = await runAgent(agent, userMsg, supa);
  const parsed = extractJson<{
    verdict: "approved" | "needs_revision";
    copy_issues: string[];
    visual_issues: string[];
    coherence_issues: string[];
    areas_of_excellence: string[];
    summary_for_felipe: string;
    next_action: string;
  }>(output);

  const verdict = parsed?.verdict === "approved" ? "approved" : "needs_revision";
  const isApproved = verdict === "approved";
  const hasCopyIssues = (parsed?.copy_issues?.length ?? 0) > 0 || (parsed?.coherence_issues?.length ?? 0) > 0;

  await supa.from("review_results").insert({
    draft_id: draftId,
    visual_brief_id: visualBriefId,
    verdict,
    copy_issues_json: parsed?.copy_issues ?? [],
    visual_issues_json: parsed?.visual_issues ?? [],
    coherence_issues_json: parsed?.coherence_issues ?? [],
    ready_for_felipe: isApproved,
    summary_for_felipe: parsed?.summary_for_felipe ?? null,
    next_action: parsed?.next_action ?? null,
    areas_of_excellence: parsed?.areas_of_excellence ?? [],
    review_notes: null,
  });

  await supa.from("content_drafts").update({
    status: isApproved ? "approved" : (hasCopyIssues ? "revision_copy" : "revision_visual"),
    updated_at: new Date().toISOString(),
  }).eq("id", draftId);

  if (isApproved) {
    await supa.from("visual_briefs").update({ status: "approved" }).eq("id", visualBriefId);

    // Verifica se todos os 3 posts estão aprovados
    const { count: approvedCount } = await supa
      .from("content_drafts")
      .select("id", { count: "exact", head: true })
      .eq("calendar_id", calendarId)
      .eq("status", "approved");

    if ((approvedCount ?? 0) >= 3) {
      await supa.from("content_calendar").update({ status: "approved_final" }).eq("id", calendarId);
      const adminId = await getAdminUserId(supa);
      await notify(supa, {
        userId: adminId,
        title: "✅ Conteúdo semanal pronto — aprovação final",
        body: `Sofia aprovou os 3 posts da semana. Acesse o painel para revisão final e agendamento de publicação.\nCalendário ID: ${calendarId}`,
        category: "final_approval",
      });
      console.log(`[sofia] all 3 posts approved — calendar ${calendarId} approved_final`);
    } else if (postNumber < 3) {
      selfChain({ step: "teo_copy", calendar_id: calendarId, post_number: postNumber + 1 });
    }
  } else {
    // Retry: copy/coherence issues → Téo; visual only → Vera
    if (hasCopyIssues) {
      selfChain({ step: "teo_copy", calendar_id: calendarId, post_number: postNumber });
    } else {
      selfChain({ step: "vera_visual", calendar_id: calendarId, post_number: postNumber, draft_id: draftId });
    }
  }

  console.log(`[sofia] post ${postNumber} — ${verdict} (retry ${reviewCount ?? 0})`);
  return { ok: true, verdict, post_number: postNumber };
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (auth !== expected) return jsonResponse({ error: "unauthorized" }, 401);

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const body: Body = parsed.data;

  const supa = adminClient();

  try {
    switch (body.step) {
      case "lucio_research": return jsonResponse(await stepLucioResearch(supa));
      case "maya_calendar":  return jsonResponse(await stepMayaCalendar(supa));
      case "teo_copy":       return jsonResponse(await stepTeo(supa, body.calendar_id, body.post_number));
      case "vera_visual":    return jsonResponse(await stepVera(supa, body.calendar_id, body.post_number, body.draft_id));
      case "sofia_review":   return jsonResponse(await stepSofia(supa, body.calendar_id, body.post_number, body.draft_id, body.visual_brief_id));
    }
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[pipeline:${body.step}]`, msg);
    return jsonResponse({ error: msg }, 500);
  }
});

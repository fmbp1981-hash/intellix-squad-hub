// supabase/functions/marketing-planner/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { callLLM, loadAgentLLMConfig } from "../_shared/llm-client.ts";
import { buildBrandSystemBlock, PILAR_CONTEXT, CAPTION_STRATEGY } from "../_shared/brand-context.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const SnippetSchema = z.object({
  title: z.string(),
  snippet: z.string(),
  url: z.string(),
  source: z.string(),
  relevance_score: z.number().optional(),
});

const RequestSchema = z.object({
  snippets: z.array(SnippetSchema),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!apiKey || auth !== `Bearer ${apiKey}`) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { snippets, week_start } = parsed.data;
  const weekOf = week_start ?? nextMonday();

  const db = adminClient();
  const llmConfig = await loadAgentLLMConfig(db, "marketing-ideator", {
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    temperature: 0.8,
    maxTokens: 4096,
  });

  const contextText = snippets
    .slice(0, 15)
    .map((s, i) => `[${i + 1}] (${s.source}) ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const systemPrompt = `Você é o estrategista de conteúdo da IntelliX.AI.

${buildBrandSystemBlock()}

Crie um calendário de 7 posts (um por dia, segunda a domingo) com base nas pesquisas da semana.
Regras:
- Pelo menos 2 posts devem promover diretamente produtos/serviços IntelliX
- Varie pilares: não repita o mesmo pilar em dias consecutivos
- Alterne plataformas: Instagram (posts visuais/carrossel) e LinkedIn (texto long-form)
- CTAs permitidos: ${CAPTION_STRATEGY.allowedCTAs.slice(0, 5).join(" | ")}
- NUNCA: "Comenta [PALAVRA]", DM automático`;

  const userPrompt = `Com base nas pesquisas abaixo, gere EXATAMENTE 7 ideias de post para a semana de ${weekOf}.

Pesquisas da semana:
${contextText || "Sem pesquisas externas — use conhecimento geral sobre IA em negócios B2B brasileiros."}

Responda SOMENTE em JSON válido, array de 7 objetos:
[
  {
    "day_offset": 0,
    "title": "...",
    "pilar": "resultado_ia|educacao_pratica|bastidores|posicionamento|comercial",
    "angle": "...",
    "platform": "instagram|linkedin|whatsapp",
    "content_type": "informational|product_promotion|virada_inteligente|news_data",
    "needs_image": true|false,
    "theme_prompt": "..."
  }
]

day_offset: 0=segunda, 1=terça, ..., 6=domingo`;

  let ideas: Array<{
    day_offset: number; title: string; pilar: string; angle: string;
    platform: string; content_type: string; needs_image: boolean; theme_prompt: string;
  }>;

  try {
    const content = await callLLM(llmConfig, systemPrompt, userPrompt);
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no json array");
    ideas = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(ideas) || ideas.length === 0) throw new Error("empty array");
  } catch (e) {
    console.error("[marketing-planner] LLM/parse error:", e);
    return jsonResponse({ error: "llm_failed" }, 503);
  }

  const weekStart = new Date(weekOf + "T12:00:00Z");
  const drafts = ideas.slice(0, 7).map((idea) => {
    const scheduledDate = new Date(weekStart);
    scheduledDate.setDate(scheduledDate.getDate() + (idea.day_offset ?? 0));

    return {
      title: idea.title,
      pilar: idea.pilar,
      angle: idea.angle,
      platform: idea.platform,
      content_type: idea.content_type,
      needs_image: Boolean(idea.needs_image),
      theme_prompt: idea.theme_prompt ?? "",
      research_snippets: snippets.slice(0, 10),
      status: "idea_pending",
      trigger_mode: "cron_weekly",
      scheduled_for: scheduledDate.toISOString().split("T")[0],
      week_of: weekOf,
    };
  });

  const { data: inserted, error } = await db
    .from("marketing_drafts")
    .insert(drafts)
    .select("id, title, scheduled_for, platform");

  if (error) {
    console.error("[marketing-planner] db insert error:", error);
    return jsonResponse({ error: "db_insert_failed", detail: error.message }, 500);
  }

  console.log(`[marketing-planner] created ${inserted?.length ?? 0} drafts for week ${weekOf}`);
  return jsonResponse({ success: true, week_of: weekOf, drafts: inserted });
});

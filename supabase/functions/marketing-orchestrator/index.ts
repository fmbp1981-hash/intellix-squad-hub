import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const RequestSchema = z.object({
  theme_prompt: z.string().optional(),
  platform: z.enum(["linkedin", "instagram", "whatsapp"]).default("linkedin"),
});

const MARKETING_TOPICS = [
  "IA aplicada a processos de negócios PME Brasil",
  "automação inteligente vendas e operações",
  "Shadow AI governança empresarial",
  "resultados reais com IA em empresas B2B",
  "letramento em IA equipes corporativas",
];

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

  const { theme_prompt, platform } = parsed.data;
  const trigger_mode = theme_prompt ? "manual" : "scheduled";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const fnBase = `${supabaseUrl}/functions/v1`;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };

  const dayOfWeek = new Date().getDay();
  const researchQuery = MARKETING_TOPICS[dayOfWeek % MARKETING_TOPICS.length];

  console.log(`[marketing-orchestrator] mode=${trigger_mode} query="${researchQuery}" theme="${theme_prompt ?? "none"}"`);

  // Step 1: Research
  let snippets: unknown[] = [];
  try {
    const researchRes = await fetch(`${fnBase}/marketing-researcher`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: researchQuery, theme_prompt }),
    });
    const researchData = await researchRes.json() as { snippets?: unknown[] };
    snippets = researchData.snippets ?? [];
    console.log(`[marketing-orchestrator] ${snippets.length} snippets collected`);
  } catch (e) {
    console.error("[marketing-orchestrator] researcher error:", e);
  }

  // Step 2: Ideate
  let ideas: Array<{ title: string; pilar: string; angle: string; platform: string }> = [];
  try {
    const ideaRes = await fetch(`${fnBase}/marketing-ideator`, {
      method: "POST",
      headers,
      body: JSON.stringify({ snippets, theme_prompt, platform }),
    });
    const ideaData = await ideaRes.json() as { ideas?: typeof ideas };
    ideas = ideaData.ideas ?? [];
    console.log(`[marketing-orchestrator] ${ideas.length} ideas generated`);
  } catch (e) {
    console.error("[marketing-orchestrator] ideator error:", e);
  }

  if (ideas.length === 0) {
    return jsonResponse({ error: "no_ideas_generated" }, 500);
  }

  // Step 3: Write each idea (sequential to avoid OpenAI rate limit)
  const draftIds: string[] = [];
  for (const idea of ideas) {
    try {
      const writeRes = await fetch(`${fnBase}/marketing-writer`, {
        method: "POST",
        headers,
        body: JSON.stringify({ idea, snippets, theme_prompt, trigger_mode }),
      });
      const writeData = await writeRes.json() as { draft_id?: string };
      if (writeData.draft_id) draftIds.push(writeData.draft_id);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error("[marketing-orchestrator] writer error:", e);
    }
  }

  console.log(`[marketing-orchestrator] done — ${draftIds.length} drafts saved`);
  return jsonResponse({ success: true, drafts_created: draftIds.length, draft_ids: draftIds });
});

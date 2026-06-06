import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
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

  // Auth via Supabase JWT (verify_jwt = true)
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { theme_prompt, platform } = parsed.data;
  const trigger_mode = theme_prompt ? "manual" : "scheduled";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const fnBase = `${supabaseUrl}/functions/v1`;
  const internalHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };

  const dayOfWeek = new Date().getDay();
  const researchQuery = theme_prompt ?? MARKETING_TOPICS[dayOfWeek % MARKETING_TOPICS.length];

  console.log(`[orchestrator] mode=${trigger_mode} query="${researchQuery}"`);

  // Step 1: Research
  let snippets: unknown[] = [];
  try {
    const res = await fetch(`${fnBase}/marketing-researcher`, {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({ query: researchQuery, theme_prompt }),
    });
    const data = await res.json() as { snippets?: unknown[] };
    snippets = data.snippets ?? [];
  } catch (e) {
    console.error("[orchestrator] researcher error:", e);
  }

  // Step 2: Ideate — generates 3 ideas
  let ideas: Array<{ title: string; pilar: string; angle: string; platform: string; content_type: string; needs_image: boolean }> = [];
  try {
    const res = await fetch(`${fnBase}/marketing-ideator`, {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({ snippets, theme_prompt, platform }),
    });
    const data = await res.json() as { ideas?: typeof ideas };
    ideas = data.ideas ?? [];
  } catch (e) {
    console.error("[orchestrator] ideator error:", e);
  }

  if (ideas.length === 0) return jsonResponse({ error: "no_ideas_generated" }, 500);

  // Step 3: Save ideas as idea_pending — user approves before content is generated
  const db = adminClient();
  const topSnippets = (snippets as Array<{ source: string; url: string; title: string; snippet: string }>)
    .slice(0, 3)
    .map((s) => ({ source: s.source, url: s.url, title: s.title }));

  const rows = ideas.map((idea) => ({
    title: idea.title,
    angle: idea.angle,
    pilar: idea.pilar,
    platform: idea.platform,
    content_type: idea.content_type ?? "informational",
    needs_image: idea.needs_image ?? false,
    status: "idea_pending" as const,
    theme_prompt: theme_prompt ?? null,
    research_snippets: topSnippets,
    trigger_mode,
    content: "",
  }));

  const { data: saved, error } = await db
    .from("marketing_drafts")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("[orchestrator] DB insert error", error);
    return jsonResponse({ error: "db_insert_failed" }, 500);
  }

  console.log(`[orchestrator] ${saved?.length ?? 0} ideas saved as idea_pending`);
  return jsonResponse({ success: true, ideas_created: saved?.length ?? 0, idea_ids: saved?.map((r: { id: string }) => r.id) ?? [] });
});

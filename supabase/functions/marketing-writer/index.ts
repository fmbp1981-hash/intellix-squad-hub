import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { buildBrandSystemBlock, PILAR_CONTEXT, CONTENT_FORMATS, CAPTION_STRATEGY, ContentFormat } from "../_shared/brand-context.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const IdeaSchema = z.object({
  title: z.string(),
  pilar: z.enum(["resultado_ia", "educacao_pratica", "bastidores", "posicionamento", "comercial"]),
  angle: z.string(),
  platform: z.enum(["linkedin", "instagram", "whatsapp"]),
  content_type: z.enum(["informational", "product_promotion", "virada_inteligente", "news_data"]).default("informational"),
  needs_image: z.boolean().default(false),
});

const SnippetSchema = z.object({
  source: z.enum(["knowledge", "perplexity", "linkedin"]),
  url: z.string(),
  title: z.string(),
  snippet: z.string(),
});

const RequestSchema = z.object({
  idea: IdeaSchema,
  snippets: z.array(SnippetSchema).max(10),
  theme_prompt: z.string().optional(),
  trigger_mode: z.enum(["scheduled", "manual"]).default("scheduled"),
});

const platformGuidance: Record<string, string> = {
  linkedin: "Post LinkedIn: texto corrido, 800–1500 caracteres, sem emojis, 1–2 hashtags no final, 1 CTA claro.",
  instagram: "Post Instagram: legendas curtas (até 300 chars) + 5 hashtags relevantes, pode usar 1–2 emojis estratégicos.",
  whatsapp: "Mensagem WhatsApp: informal, direta, até 300 chars, sem hashtags.",
};

function pickFormat(pilar: string, platform: string): ContentFormat {
  if (platform === "instagram") return "A";
  if (pilar === "comercial") return "D";
  if (pilar === "posicionamento" || pilar === "bastidores") return "C";
  if (pilar === "educacao_pratica") return "B";
  return "A";
}

function buildFormatGuidance(format: ContentFormat, platform: string): string {
  const f = CONTENT_FORMATS[format];
  if (platform === "whatsapp") return platformGuidance.whatsapp;
  return `Formato ${format} — ${f.name} (${f.slides ?? "post único"}): ${f.structure}`;
}

const styleByPilar: Record<string, string> = {
  resultado_ia: "clean data visualization, modern dark dashboard, teal and indigo tones, infographic layout with clear labels",
  educacao_pratica: "minimalist educational illustration, soft purple gradient background, clean geometric shapes",
  bastidores: "authentic developer workspace, dark moody lighting, code editor aesthetic",
  posicionamento: "bold geometric composition, deep purple to midnight blue, strong typographic layout",
  comercial: "modern SaaS product visual, gradient indigo to violet, professional and confident",
};

// resultado_ia e comercial usam gpt-image-2 (melhor para texto/dados/infográficos)
// demais pilares usam gemini-3.1-flash-image (ilustrações gerais, mais barato)
const TEXT_CRITICAL_PILARS = new Set(["resultado_ia", "comercial"]);

async function generateImageGptImage2(openaiKey: string, prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "gpt-image-2", prompt, size: "1024x1024", quality: "medium" }),
    });
    if (!res.ok) {
      console.error("[marketing-writer] gpt-image-2 error", res.status, await res.text());
      return null;
    }
    const data = await res.json() as { data: Array<{ b64_json: string }> };
    return data.data?.[0]?.b64_json ?? null;
  } catch (e) {
    console.error("[marketing-writer] gpt-image-2 exception:", e);
    return null;
  }
}

async function generateImageGemini(geminiKey: string, prompt: string, openaiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent",
      {
        method: "POST",
        headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
    );
    if (res.status === 429) {
      console.warn("[marketing-writer] gemini quota exhausted — fallback to gpt-image-2");
      return generateImageGptImage2(openaiKey, prompt);
    }
    if (!res.ok) {
      console.error("[marketing-writer] gemini-image error", res.status, await res.text());
      return null;
    }
    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ inlineData?: { data: string } }> } }>;
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts.find((p) => p.inlineData)?.inlineData?.data ?? null;
  } catch (e) {
    console.error("[marketing-writer] gemini-image exception:", e);
    return null;
  }
}

async function generateImage(openaiKey: string, geminiKey: string | undefined, title: string, pilar: string): Promise<string | null> {
  const style = styleByPilar[pilar] ?? "modern B2B tech illustration, dark theme, purple accents";
  const prompt = `Professional social media cover image for a B2B AI consulting company post about: "${title}". Style: ${style}. No text overlay. Aspect ratio 1:1. Clean, minimal, modern.`;

  if (TEXT_CRITICAL_PILARS.has(pilar) || !geminiKey) {
    return generateImageGptImage2(openaiKey, prompt);
  }
  return generateImageGemini(geminiKey, prompt, openaiKey);
}

function b64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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

  const { idea, snippets, theme_prompt, trigger_mode } = parsed.data;

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return jsonResponse({ error: "openai_api_key_missing" }, 503);

  const contextText = snippets.slice(0, 4)
    .map((s) => `Fonte (${s.source}): ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const format = pickFormat(idea.pilar, idea.platform);
  const formatGuidance = buildFormatGuidance(format, idea.platform);

  const pilarCtx = PILAR_CONTEXT[idea.pilar];
  const formatDef = CONTENT_FORMATS[format];
  const captionGuide = idea.platform === "linkedin"
    ? CAPTION_STRATEGY.b2b.slice(0, 3).join(" | ")
    : CAPTION_STRATEGY.b2c.slice(0, 3).join(" | ");

  const systemPrompt = `Você é o redator de conteúdo da IntelliX.AI.

${buildBrandSystemBlock()}

## Técnicas de copy obrigatórias para este post (Formato ${format} — ${formatDef.name})
${formatDef.copyTechniques.slice(0, 4).map((t, i) => `${i + 1}. ${t}`).join("\n")}

## Estrutura slide a slide
${formatDef.structure.map((s) => `• ${s}`).join("\n")}

## Exemplos de hook adaptados para IntelliX
${pilarCtx.hooks.map((h) => `→ "${h}"`).join("\n")}

## Identidade visual do formato
${formatDef.visualStyle}

## Estratégia de legenda (${idea.platform})
${captionGuide}
Palavras-gatilho sugeridas: ${CAPTION_STRATEGY.triggerWords.join(" | ")}

## Diretrizes de escrita
- Voz coloquial brasileira inteligente: use "pra", "tá", "ninguém te conta" quando soar natural.
- Frases curtas — máximo 2 linhas por parágrafo.
- Nunca comece com "Olá" ou introdução — vá direto ao gancho.
- Prefira números reais a adjetivos vagos.
- Sentence case em PT-BR sempre.

## Formato e plataforma
${formatGuidance}
${idea.platform !== "whatsapp" ? `\n${platformGuidance[idea.platform]}` : ""}`;

  const userPrompt = `Escreva um post completo para ${idea.platform} sobre:
Título: ${idea.title}
Ângulo: ${idea.angle}
Pilar: ${pilarCtx?.description ?? idea.pilar}
Tipo de conteúdo: ${idea.content_type}

${contextText ? `Contexto de pesquisa:\n${contextText}` : ""}
${theme_prompt ? `\nTema solicitado: "${theme_prompt}"` : ""}

Escreva APENAS o post final, sem comentários ou explicações adicionais.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    console.error("[marketing-writer] OpenAI error", res.status);
    return jsonResponse({ error: "openai_failed" }, 503);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "";

  if (!content.trim()) {
    return jsonResponse({ error: "empty_content" }, 500);
  }

  const db = adminClient();
  const topSnippets = snippets.slice(0, 3).map((s) => ({
    source: s.source,
    url: s.url,
    title: s.title,
  }));

  const { data: draft, error } = await db
    .from("marketing_drafts")
    .insert({
      title: idea.title,
      content,
      pilar: idea.pilar,
      platform: idea.platform,
      content_type: idea.content_type,
      needs_image: idea.needs_image,
      status: "generated",
      theme_prompt: theme_prompt ?? null,
      research_snippets: topSnippets,
      trigger_mode,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[marketing-writer] DB insert error", error);
    return jsonResponse({ error: "db_insert_failed" }, 500);
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  let imageUrl: string | null = null;
  if (idea.needs_image) {
    try {
      const b64 = await generateImage(openaiKey, geminiKey, idea.title, idea.pilar);
      if (b64) {
        const imageBytes = b64ToUint8Array(b64);
        const path = `marketing/${draft.id}.png`;
        const { error: uploadError } = await db.storage
          .from("assets")
          .upload(path, imageBytes, { contentType: "image/png", upsert: true });

        if (!uploadError) {
          const { data: urlData } = db.storage.from("assets").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
          await db.from("marketing_drafts").update({ image_url: imageUrl }).eq("id", draft.id);
          console.log(`[marketing-writer] image uploaded → ${imageUrl}`);
        } else {
          console.error("[marketing-writer] storage upload error:", uploadError);
        }
      }
    } catch (e) {
      console.error("[marketing-writer] image pipeline error (non-fatal):", e);
    }
  }

  console.log(`[marketing-writer] draft=${draft.id} pilar=${idea.pilar} type=${idea.content_type} image=${imageUrl ? "yes" : "no"}`);
  return jsonResponse({ success: true, draft_id: draft.id, image_url: imageUrl });
});

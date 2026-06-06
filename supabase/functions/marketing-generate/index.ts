// Called when user approves an idea — generates content + optional DALL-E 3 image
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { buildBrandSystemBlock, PILAR_CONTEXT, CONTENT_FORMATS, CAPTION_STRATEGY, ContentFormat } from "../_shared/brand-context.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const RequestSchema = z.object({
  draft_id: z.string().uuid(),
});

const platformGuidance: Record<string, string> = {
  linkedin: "Post LinkedIn: texto corrido, 800–1500 caracteres, sem emojis, 1–2 hashtags no final, 1 CTA claro.",
  instagram: "Post Instagram: 3 slides de carrossel. Slide 1: gancho (1 linha). Slide 2: desenvolvimento (3–5 pontos curtos). Slide 3: CTA + 5 hashtags relevantes. Separe slides com '---SLIDE---'.",
  whatsapp: "Mensagem WhatsApp: informal, direta, até 300 chars, sem hashtags.",
};

const styleByPilar: Record<string, string> = {
  resultado_ia: "clean data visualization, modern dark dashboard, teal and indigo tones, infographic layout with clear labels",
  educacao_pratica: "minimalist educational illustration, soft purple gradient background, clean geometric shapes",
  bastidores: "authentic developer workspace, dark moody lighting, code editor aesthetic",
  posicionamento: "bold geometric composition, deep purple to midnight blue, strong typographic layout",
  comercial: "modern SaaS product visual, gradient indigo to violet, professional and confident",
};

const TEXT_CRITICAL_PILARS = new Set(["resultado_ia", "comercial"]);

async function generateImageGptImage2(openaiKey: string, prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "gpt-image-2", prompt, size: "1024x1024", quality: "medium" }),
    });
    if (!res.ok) {
      console.error("[marketing-generate] gpt-image-2 error", res.status, await res.text());
      return null;
    }
    const data = await res.json() as { data: Array<{ b64_json: string }> };
    return data.data?.[0]?.b64_json ?? null;
  } catch (e) {
    console.error("[marketing-generate] gpt-image-2 exception:", e);
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
      console.warn("[marketing-generate] gemini quota exhausted — fallback to gpt-image-2");
      return generateImageGptImage2(openaiKey, prompt);
    }
    if (!res.ok) {
      console.error("[marketing-generate] gemini-image error", res.status, await res.text());
      return null;
    }
    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ inlineData?: { data: string } }> } }>;
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts.find((p) => p.inlineData)?.inlineData?.data ?? null;
  } catch (e) {
    console.error("[marketing-generate] gemini-image exception:", e);
    return null;
  }
}

function pickFormat(pilar: string, platform: string): ContentFormat {
  if (platform === "instagram") return "A";
  if (pilar === "comercial") return "D";
  if (pilar === "posicionamento" || pilar === "bastidores") return "C";
  if (pilar === "educacao_pratica") return "B";
  return "A";
}

function buildImagePrompt(title: string, pilar: string): string {
  const style = styleByPilar[pilar] ?? "modern B2B tech illustration, dark theme, purple accents";
  return `Professional social media image for B2B AI consulting post: "${title}". Style: ${style}. No text overlay. Aspect ratio 1:1. Clean, minimal, modern.`;
}

async function generateImage(openaiKey: string, geminiKey: string | undefined, title: string, pilar: string): Promise<string | null> {
  const prompt = buildImagePrompt(title, pilar);
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

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { draft_id } = parsed.data;
  const db = adminClient();

  const { data: draft, error: fetchErr } = await db
    .from("marketing_drafts")
    .select("id, title, angle, pilar, platform, content_type, needs_image, theme_prompt, research_snippets, trigger_mode")
    .eq("id", draft_id)
    .eq("status", "idea_pending")
    .single();

  if (fetchErr || !draft) {
    return jsonResponse({ error: "idea_not_found_or_not_pending" }, 404);
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return jsonResponse({ error: "openai_api_key_missing" }, 503);

  await db.from("marketing_drafts").update({ status: "generated" }).eq("id", draft_id);

  const contextText = ((draft.research_snippets ?? []) as Array<{ title: string }>)
    .map((s: { title: string }, i: number) => `[${i + 1}] ${s.title}`)
    .join("\n");

  const format = pickFormat(draft.pilar, draft.platform);
  const formatDef = CONTENT_FORMATS[format];
  const formatGuidance = draft.platform === "whatsapp"
    ? platformGuidance.whatsapp
    : `Formato ${format} — ${formatDef.name} (${formatDef.slides ?? "post único"})`;

  const pilarCtx = PILAR_CONTEXT[draft.pilar as keyof typeof PILAR_CONTEXT];
  const captionGuide = draft.platform === "linkedin"
    ? CAPTION_STRATEGY.b2b.slice(0, 3).join(" | ")
    : CAPTION_STRATEGY.b2c.slice(0, 3).join(" | ");

  const systemPrompt = `Você é o redator da IntelliX.AI.

${buildBrandSystemBlock()}

## Técnicas de copy obrigatórias para este post (Formato ${format} — ${formatDef.name})
${formatDef.copyTechniques.slice(0, 4).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}

## Estrutura slide a slide
${formatDef.structure.map((s: string) => `• ${s}`).join("\n")}

${pilarCtx ? `## Exemplos de hook para este pilar\n${pilarCtx.hooks.map((h: string) => `→ "${h}"`).join("\n")}` : ""}

## Identidade visual do formato
${formatDef.visualStyle}

## Estratégia de legenda (${draft.platform})
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
${draft.platform !== "whatsapp" ? `\n${platformGuidance[draft.platform] ?? ""}` : ""}`;

  const SLIDE_COUNT: Record<ContentFormat, number> = { A: 9, B: 9, C: 5, D: 7 };
  const isCarousel = draft.platform === "instagram";
  const slideInstruction = isCarousel
    ? `Gere EXATAMENTE ${SLIDE_COUNT[format]} slides separados por ---SLIDE--- (sem texto antes do primeiro slide nem depois do último).
Cada slide: máximo 4 linhas de texto. Slide 1 = gancho. Slides 2-${SLIDE_COUNT[format] - 2} = desenvolvimento. Slide ${SLIDE_COUNT[format] - 1} = virada/síntese. Slide ${SLIDE_COUNT[format]} = CTA com palavra-gatilho em MAIÚSCULAS.`
    : "Escreva o post final em texto corrido.";

  const userPrompt = `Escreva o post:
Título: ${draft.title}
Ângulo: ${draft.angle ?? ""}
Pilar: ${pilarCtx?.description ?? draft.pilar}
Tipo: ${draft.content_type ?? "informational"}
${contextText ? `\nContexto:\n${contextText}` : ""}
${draft.theme_prompt ? `\nTema: "${draft.theme_prompt}"` : ""}

${slideInstruction}`;

  const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.7,
    }),
  });

  if (!chatRes.ok) return jsonResponse({ error: "openai_failed" }, 503);

  const chatData = await chatRes.json() as { choices: Array<{ message: { content: string } }> };
  const content = chatData.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) return jsonResponse({ error: "empty_content" }, 500);

  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  let imageUrl: string | null = null;
  if (draft.needs_image) {
    try {
      const b64 = await generateImage(openaiKey, geminiKey, draft.title, draft.pilar);
      if (b64) {
        const bytes = b64ToUint8Array(b64);
        const { error: uploadErr } = await db.storage
          .from("assets")
          .upload(`marketing/${draft_id}.png`, bytes, { contentType: "image/png", upsert: true });
        if (!uploadErr) {
          const { data: urlData } = db.storage.from("assets").getPublicUrl(`marketing/${draft_id}.png`);
          imageUrl = urlData.publicUrl;
        }
      }
    } catch (e) {
      console.error("[marketing-generate] image error (non-fatal):", e);
    }
  }

  await db.from("marketing_drafts").update({
    content,
    image_url: imageUrl,
    status: "generated",
  }).eq("id", draft_id);

  console.log(`[marketing-generate] draft=${draft_id} type=${draft.content_type} image=${imageUrl ? "yes" : "no"}`);
  return jsonResponse({ success: true, draft_id, image_url: imageUrl });
});

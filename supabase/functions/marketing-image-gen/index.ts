// marketing-image-gen — LLM-first image generation
// Step 1: GPT-4o interprets the post and writes N distinct, narrative-specific image prompts
// Step 2: GPT Image 2 generates each image from its unique prompt

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

// ─── LLM prompt builder ───────────────────────────────────────────────────────

function buildDirectorSystemPrompt(contentType: string): string {
  const isPromotional = contentType === "product_promotion" || contentType === "virada_inteligente";

  const styleGuide = isPromotional ? `
## IMAGE TRACK: PREMIUM BRAND / PROMOTIONAL
Style reference: @cavendishconsultoria — cinematic dark photography, executive silhouettes in premium boardrooms,
dramatic lighting, confident corporate atmosphere. Maximum visual impact for conversion and CTA posts.

USE:
- Executive silhouettes (back/side, no faces) in command centers, boardrooms at night, premium offices
- Cinematic low-key lighting, city lights in background
- Dramatic contrast, luxury brand feel
- Bold headline typography integrated as part of the scene
- Feels like a high-end corporate brand campaign` : `
## IMAGE TRACK: EDITORIAL / INFORMATIONAL
Style reference: @gestaoai, @thaleslaray, @cathyduraes — clean editorial, professional but accessible,
bold typographic compositions, data-driven visuals, authentic business context.

USE:
- Clean editorial compositions with strong hierarchy
- Data visualization elements (charts, dashboards, metrics) relevant to the post
- Professional photography style but less cinematic — more direct and readable
- Bold headline text as the primary focal element, supported by clean visuals
- Feels like a well-designed editorial or business magazine spread`;

  return `You are a senior creative director specializing in B2B social media visuals for Brazilian AI consulting.

Your task: given a marketing post, write precise and narrative image prompts for GPT Image 2.

${styleGuide}

## Visual reference style — ALL TRACKS
Match the quality and style of these reference accounts:
- @cavendishconsultoria: cinematic dark photography, executive silhouettes in premium boardrooms,
  dramatic lighting, confident corporate atmosphere, real people in real contexts
- @cathyduraes: clean editorial design, strong typography hierarchy, professional photography,
  authentic business moments, warm-to-dark lighting
- @gestaoai: bold typographic compositions, data-driven visuals, editorial photography with text overlay,
  professional and direct, no decorative elements
- @thaleslaray: storytelling imagery, authentic human moments in business context, emotional editorial

## ABSOLUTE BANS — these kill the quality instantly
- NO robot hands, NO robotic arms, NO mechanical fingers pointing at anything
- NO floating logos (WhatsApp, OpenAI, Meta, etc.) in space
- NO generic "neural network nodes" floating in blue space
- NO digital brain / glowing brain illustrations
- NO holographic floating interfaces without human context
- NO stock-art tech patterns (circuit boards, binary code, abstract nodes)
- NO cartoonish 3D characters or avatars
- Each image must be RECOGNIZABLY about the specific post topic

## What works — DO THIS
- Real executive silhouettes (from behind, side profile — no visible faces) in command centers, boardrooms, offices at night
- Cinematic photography: dramatic low-key lighting, city lights in background, premium environments
- Specific scenarios tied to the post content (team meeting about AI, executive reviewing dashboards, etc.)
- Bold typography integrated into the scene as part of the composition
- High-contrast, premium feel — like a luxury B2B brand campaign

## IntelliX.AI brand
- Background: #171723 (deep navy-black)
- Primary: #196FA8 (corporate blue)
- Accent: #F2A82A (gold)
- Feel: premium, sober, Brazilian B2B, confidence without arrogance

## Response format — JSON only, no markdown:
[
  {
    "prompt": "complete prompt in English for GPT Image 2, with specific scene, lighting, composition, mood",
    "style_note": "1-line description of this variation's visual concept"
  }
]`;
}

function buildDirectorUserPrompt(
  title: string,
  angle: string | null,
  content: string,
  pilar: string,
  platform: string,
  count: number,
  contentType: string,
): string {
  const excerpt = content
    .replace(/---SLIDE---/g, " ")
    .replace(/\*\*/g, "")
    .replace(/#+\s/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 500);

  const pilarContext: Record<string, string> = {
    resultado_ia: "cases e resultados reais de IA aplicada em negócios",
    educacao_pratica: "educação e letramento em IA para líderes e equipes",
    bastidores: "bastidores da IntelliX.AI, processo interno, como a IA é construída",
    posicionamento: "posicionamento de mercado, liderança, visão estratégica sobre IA",
    comercial: "proposta comercial, produto IntelliX.AI, captação de clientes",
  };

  const platformNote = platform === "instagram"
    ? "Instagram feed — formato 1:1 quadrado, impacto visual imediato, composição bold"
    : "LinkedIn feed — formato mais sóbrio, executivo, profissional";

  const trackNote = (contentType === "product_promotion" || contentType === "virada_inteligente")
    ? "TRACK: PREMIUM BRAND — cinematográfico, executivo, máximo impacto para conversão"
    : "TRACK: EDITORIAL — clean, legível, tipografia forte, visual direto ao ponto";

  const typographyNote = `TYPOGRAPHY DIRECTIVE: Use Space Grotesk bold/800 for the main headline in the image. JetBrains Mono for any data/statistic elements. All text minimum 24px equivalent. Color: white #FAFAFA or gold #F2A82A on dark navy #171723 background.`;

  return `Crie ${count} prompt(s) de imagem DISTINTOS e ESPECÍFICOS para este post:

TÍTULO: ${title}
${angle ? `ÂNGULO: ${angle}` : ""}
PILAR: ${pilarContext[pilar] ?? pilar}
PLATAFORMA: ${platformNote}
${trackNote}
${typographyNote}
CONTEÚDO:
${excerpt}

Requisitos para cada prompt:
1. Descreva uma CENA ESPECÍFICA que representa visualmente este post — não genérica
2. Inclua: ambiente, iluminação, composição, elementos visuais específicos ao tema
3. Pode incluir silhuetas de pessoas em contextos profissionais (sem rostos visíveis)
4. Pode incluir elementos de interface/dashboard RELEVANTES ao tema do post
5. Cada variação deve ter um conceito visual DIFERENTE das outras
6. OBRIGATÓRIO: inclua no prompt uma instrução para inserir o título do post como headline bold tipográfico na imagem. Use as primeiras palavras mais impactantes do título (máximo 6-8 palavras em CAPS), posicionado na parte superior ou inferior da imagem, fonte sans-serif branca ou dourada com alto contraste sobre o fundo escuro
7. Escreva o prompt em inglês, detalhado, 3-5 frases`;
}

async function callGPT4(openaiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.9,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GPT-4o-mini ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "";
}

// ─── Image generation ─────────────────────────────────────────────────────────

const BASE_STYLE_SUFFIX = `
BRAND COLORS: Deep navy background #171723 (never pure black). Blue #196FA8 for technical highlights. Gold #F2A82A for CTAs and standout numbers only — max 1 amber element per image.
BRAND GRADIENT: 135° from #F2A82A (gold) to #196FA8 (blue) — use on accent elements, titles, or divider lines.
TYPOGRAPHY: Space Grotesk sans-serif — bold/800 weight for headlines, 600 for body. JetBrains Mono for stats, eyebrows, data labels. Minimum 24px equivalent for any text element.
STYLE: Cinematic photorealistic editorial photography OR premium illustrated infographic — never generic tech stock art.
LIGHTING: Dramatic low-key, dark atmosphere reinforcing the #171723 background.
COMPOSITION: Square 1:1 format. Clear focal point. Professional, premium B2B feel.
TEXT IN IMAGE: Include the post headline as a bold typographic element — Space Grotesk, white (#FAFAFA) or gold (#F2A82A), strong contrast, positioned in bottom or top third. Max 8 words in CAPS for the headline.
LOGO PLACEMENT: IntelliX.AI wordmark (gold "IntelliX" + blue ".AI") in bottom-left or top-left corner, small and unobtrusive.
ACCENT RULE: A 5-6px horizontal line with the brand gradient (gold→blue) can be used as a decorative divider.
BANNED ELEMENTS: NO robot hands, NO floating logos, NO glowing brains, NO abstract node networks, NO cartoonish elements, NO pure black backgrounds, NO white backgrounds.`;

async function generateImage(openaiKey: string, prompt: string): Promise<string | null> {
  const fullPrompt = `${prompt}\n\n${BASE_STYLE_SUFFIX}`.slice(0, 4000);
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: "gpt-image-2", prompt: fullPrompt, size: "1024x1024", quality: "medium" }),
  });
  if (!res.ok) {
    console.error(`[image-gen] OpenAI image ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json() as { data: Array<{ b64_json: string }> };
  return data.data?.[0]?.b64_json ?? null;
}

async function uploadToStorage(
  db: ReturnType<typeof adminClient>,
  draftId: string,
  index: number,
  b64: string,
): Promise<string | null> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const path = `marketing/${draftId}/gen_${Date.now()}_${index}.png`;
  const { error } = await db.storage.from("assets").upload(path, bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) { console.error("[image-gen] storage upload failed:", error); return null; }

  const { data } = db.storage.from("assets").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ey")) return jsonResponse({ error: "unauthorized" }, 401);

  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!openaiKey) return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);

  const body = await req.json().catch(() => ({})) as {
    draft_id?: string;
    count?: number;
    slide_content?: string;
    slide_index?: number;
  };
  const { draft_id, count = 1, slide_content, slide_index } = body;

  if (!draft_id) return jsonResponse({ error: "draft_id required" }, 400);

  const imageCount = Math.min(Math.max(Math.floor(count), 1), 10);

  const db = adminClient();
  const { data: draft, error: fetchErr } = await db
    .from("marketing_drafts")
    .select("id, title, angle, content, pilar, platform, content_type")
    .eq("id", draft_id)
    .single();

  if (fetchErr || !draft) return jsonResponse({ error: "draft_not_found" }, 404);

  const { title, angle, content, pilar, platform, content_type } = draft as {
    id: string; title: string; angle: string | null;
    content: string; pilar: string; platform: string; content_type: string | null;
  };

  const effectiveContent = slide_content
    ? `[SLIDE ${(slide_index ?? 0) + 1}]\n${slide_content}\n\nPOST TITLE: ${title}`
    : content;

  const slideLabel = slide_index !== undefined ? ` [slide ${slide_index + 1}]` : "";
  console.log(`[image-gen] step 1 — GPT-4o writing ${imageCount} prompt(s) for: "${title}"${slideLabel} [type=${content_type}]`);

  // Step 1: LLM interprets the post and writes specific image prompts
  let imagePrompts: Array<{ prompt: string; style_note: string }> = [];
  try {
    const raw = await callGPT4(
      openaiKey,
      buildDirectorSystemPrompt(content_type ?? "informational"),
      buildDirectorUserPrompt(title, angle, effectiveContent, pilar, platform, imageCount, content_type ?? "informational"),
    );
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no JSON array in response");
    imagePrompts = JSON.parse(jsonMatch[0]);
    console.log(`[image-gen] prompts generated: ${imagePrompts.map(p => p.style_note).join(" | ")}`);
  } catch (e) {
    console.error("[image-gen] prompt generation failed:", e);
    return jsonResponse({ error: "prompt_generation_failed" }, 500);
  }

  if (imagePrompts.length === 0) return jsonResponse({ error: "no_prompts_generated" }, 500);

  // Step 2: Generate images in parallel from unique prompts
  console.log(`[image-gen] step 2 — generating ${imagePrompts.length} image(s) with GPT Image 2`);
  const b64Results = await Promise.all(
    imagePrompts.map((p, i) =>
      generateImage(openaiKey, p.prompt).then(b => ({ b, i, style: p.style_note }))
    )
  );

  const urls: string[] = [];
  for (const { b, i, style } of b64Results) {
    if (!b) { console.warn(`[image-gen] image ${i} (${style}) failed`); continue; }
    const url = await uploadToStorage(db, draft_id, i, b);
    if (url) { urls.push(url); console.log(`[image-gen] ✅ ${i} — ${style}`); }
  }

  if (urls.length === 0) return jsonResponse({ error: "all_images_failed" }, 500);

  // Merge with existing generated_images
  const { data: current } = await db
    .from("marketing_drafts")
    .select("generated_images")
    .eq("id", draft_id)
    .single();

  const existing = (current as { generated_images: string[] | null } | null)?.generated_images ?? [];
  const merged = [...existing, ...urls];

  await db.from("marketing_drafts").update({ generated_images: merged }).eq("id", draft_id);

  console.log(`[image-gen] ✅ ${urls.length}/${imageCount} images generated for draft ${draft_id}`);
  return jsonResponse({ success: true, urls, total: merged.length });
});

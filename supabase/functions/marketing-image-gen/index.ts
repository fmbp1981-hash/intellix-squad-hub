// marketing-image-gen — LLM-first image generation
// Step 1: GPT-4o interprets the post and writes N distinct, contextual image prompts in Portuguese
// Step 2: GPT Image 2 generates each image from its unique prompt

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

// ─── Style tracks por pilar ───────────────────────────────────────────────────

const PILAR_STYLE: Record<string, string> = {
  resultado_ia: `
VISUAL STYLE: Authentic corporate photography — real people in real business moments celebrating or reviewing results.
ENVIRONMENTS: Bright modern offices, meeting rooms with natural light, open coworking spaces, executives reviewing dashboards on screens.
LIGHTING: Natural light from windows, warm office lighting, bright and energetic — NOT dark or cinematic.
HUMAN ELEMENT: Diverse Brazilian professionals (varied ages, skin tones, gender) — genuine smiles, team collaboration, handshakes, reviewing screens together.
AVOID: Dark dramatic scenes, silhouettes only, overly technical visuals.`,

  educacao_pratica: `
VISUAL STYLE: Editorial educational photography — knowledge transfer, learning, workshops.
ENVIRONMENTS: Training rooms, whiteboards with diagrams, laptop-focused work sessions, digital presentations on big screens, team workshops.
LIGHTING: Clean bright lighting, professional but approachable.
HUMAN ELEMENT: Trainers presenting to groups, professionals taking notes, interactive learning sessions, people pointing at screens.
AVOID: Dark moody scenes, purely abstract visuals.`,

  bastidores: `
VISUAL STYLE: Behind-the-scenes documentary photography — authentic moments showing the IntelliX team building things.
ENVIRONMENTS: Home office setups, small team rooms, code on screens, sticky notes on whiteboards, post-it planning sessions, candid work moments.
LIGHTING: Varied — natural light, monitor glow, mixed real environments.
HUMAN ELEMENT: Candid shots, people focused on work, screens visible with interfaces.
AVOID: Overly polished corporate stock photography.`,

  posicionamento: `
VISUAL STYLE: Premium brand editorial — confident leadership and market positioning.
ENVIRONMENTS: High-end boardrooms, executive offices with city views, speaking events, stage presentations, outdoor business district.
LIGHTING: Dramatic but not dark — cinematic with premium feel, sunset tones, architectural lighting.
HUMAN ELEMENT: Confident executive silhouettes (side/back, no faces) OR leaders presenting on stage.
AVOID: Generic office scenes, overly casual contexts.`,

  comercial: `
VISUAL STYLE: Conversion-focused premium brand — high visual impact, aspirational B2B.
ENVIRONMENTS: Premium boardrooms, executive presentations, deal-closing moments, celebration of partnership/contract.
LIGHTING: Cinematic, dramatic, confident — gold and blue tones.
HUMAN ELEMENT: Professional handshakes, executives in conversation, confident body language.
AVOID: Generic stock images, cartoonish representations.`,
};

// ─── LLM prompt builder ───────────────────────────────────────────────────────

function buildDirectorSystemPrompt(pilar: string): string {
  const styleTrack = PILAR_STYLE[pilar] ?? PILAR_STYLE.educacao_pratica;

  return `You are a senior creative director for IntelliX.AI, a Brazilian B2B AI consulting company.
Your task: given a marketing post, write DISTINCT and CONTEXTUALLY SPECIFIC image prompts for GPT Image 2.

## Brand Identity
- Company: IntelliX.AI (Brazilian AI consulting — helps companies apply AI practically)
- Audience: Brazilian business leaders, managers, entrepreneurs
- Feel: Professional, trustworthy, results-oriented — NOT generic tech startup

## Style track for this post
${styleTrack}

## Universal rules for ALL images
- DIVERSITY: Show racially diverse Brazilian professionals (Black, Brown, White, Asian Brazilians) in realistic proportions
- REALISM: Photorealistic photography style — NOT illustrations, NOT cartoons, NOT 3D renders
- CONTEXT: Each image must clearly represent the SPECIFIC post topic — a viewer must understand the subject from the image alone
- NO TEXT IN IMAGE: Do NOT include any text, words, titles, labels, or typography in the generated image. The design team will add text separately.
- COMPOSITION: Square 1:1. Clear focal point. Professional but human.
- BACKGROUNDS: Mix of dark, medium, and bright environments depending on context — avoid ALL images being dark
- ENVIRONMENT VARIETY: Each variation must show a DIFFERENT setting (office, outdoor, home office, meeting room, stage, etc.)

## Absolute bans
- NO robot hands, arms, or mechanical fingers
- NO floating logos (WhatsApp, OpenAI, Meta, Instagram, etc.)
- NO glowing brains or digital brain illustrations
- NO abstract neural networks / node graphs floating in space
- NO holographic interfaces without human context
- NO stock-art circuit boards, binary code, or generic tech patterns
- NO cartoonish 3D avatars or characters
- NO stereotyped or tokenized representation of diversity
- NO pure black backgrounds (#000000) — use #171723 deep navy if dark
- NO text, words, captions, or typography of any kind

## Response format — JSON only, no markdown:
[
  {
    "prompt": "complete, specific image prompt in English for GPT Image 2 — 4-6 sentences describing scene, people, environment, lighting, composition, mood",
    "style_note": "1-line description of this variation's visual concept in Portuguese"
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
): string {
  const excerpt = content
    .replace(/---SLIDE---/g, " ")
    .replace(/\*\*/g, "")
    .replace(/#+\s/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 600);

  const pilarContext: Record<string, string> = {
    resultado_ia: "Cases e resultados reais de IA aplicada em negócios brasileiros",
    educacao_pratica: "Educação e letramento em IA para líderes e equipes brasileiras",
    bastidores: "Bastidores da IntelliX.AI — como a IA é construída e entregue",
    posicionamento: "Posicionamento de mercado e visão estratégica sobre IA",
    comercial: "Proposta comercial IntelliX.AI — captação e conversão de clientes",
  };

  const platformNote = platform === "instagram"
    ? "Instagram feed — 1:1 square, immediate visual impact, bold composition"
    : "LinkedIn feed — professional, executive, credibility-forward";

  return `Create ${count} DISTINCT image prompt(s) for this specific post:

POST TITLE: ${title}
${angle ? `POST ANGLE: ${angle}` : ""}
POST PILAR: ${pilarContext[pilar] ?? pilar}
PLATFORM: ${platformNote}

POST CONTENT SUMMARY:
${excerpt}

Requirements for each prompt:
1. The image must visually represent THIS SPECIFIC post topic — not a generic AI or business scene
2. Describe concrete elements: who is in the scene, what they are doing, where they are, what time of day
3. Each variation must show a COMPLETELY DIFFERENT environment/scenario/composition
4. Include specific contextual details that connect to the post's message (e.g., if post is about reducing email time with AI, show a professional looking relieved at their inbox on a laptop)
5. Explicitly state diverse Brazilian professionals in the scene when humans are present
6. DO NOT include any text, titles, words, or labels in the image prompt — the design team adds text separately
7. Lighting and background should VARY between prompts — not all dark, not all bright
8. Write each prompt in English, 4-6 specific sentences`;
}

async function callGPT4(openaiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.95,
      max_tokens: 2500,
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
PHOTOGRAPHY STYLE: Photorealistic, high-quality corporate/editorial photography. Shot with a professional camera — natural depth of field, realistic textures, authentic lighting.
NO TEXT: Absolutely no words, letters, numbers, labels, titles, captions, or any typography in the image. The image must be purely visual, no text whatsoever.
NO AI CLICHÉS: No robot hands, no glowing brains, no floating interfaces, no neural network nodes, no circuit patterns.
COMPOSITION: Square 1:1 format. Clear main subject. Well-balanced composition with breathing room.
DIVERSITY: Racially and gender-diverse Brazilian professionals when humans appear.
BRAND COLORS (environment accents only, not text): Deep navy #171723 for dark elements, Corporate blue #196FA8 for highlights, Gold #F2A82A for warm accent elements.`;

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

  const { title, angle, content, pilar, platform } = draft as {
    id: string; title: string; angle: string | null;
    content: string; pilar: string; platform: string; content_type: string | null;
  };

  const effectiveContent = slide_content
    ? `[SLIDE ${(slide_index ?? 0) + 1}]\n${slide_content}\n\nPOST TITLE: ${title}`
    : content;

  const slideLabel = slide_index !== undefined ? ` [slide ${slide_index + 1}]` : "";
  console.log(`[image-gen] step 1 — GPT-4o writing ${imageCount} prompt(s) for: "${title}"${slideLabel} [pilar=${pilar}]`);

  // Step 1: LLM interprets the post and writes specific image prompts
  let imagePrompts: Array<{ prompt: string; style_note: string }> = [];
  try {
    const raw = await callGPT4(
      openaiKey,
      buildDirectorSystemPrompt(pilar),
      buildDirectorUserPrompt(title, angle, effectiveContent, pilar, platform, imageCount),
    );
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no JSON array in response");
    imagePrompts = JSON.parse(jsonMatch[0]);
    console.log(`[image-gen] prompts: ${imagePrompts.map(p => p.style_note).join(" | ")}`);
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

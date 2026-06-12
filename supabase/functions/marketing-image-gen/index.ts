// marketing-image-gen — LLM-first image generation
// Step 1: GPT-4o interprets the post and writes N distinct, narrative-specific image prompts
// Step 2: GPT Image 2 generates each image from its unique prompt

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

// ─── LLM prompt builder ───────────────────────────────────────────────────────

function buildDirectorSystemPrompt(): string {
  return `Você é um diretor de criação sênior especializado em conteúdo visual para redes sociais B2B no Brasil.

Sua tarefa: dado um post de marketing, criar prompts precisos e narrativos para geração de imagens com IA (GPT Image 2).

## Estilo de referência obrigatório
As imagens devem ter o mesmo nível de qualidade e estilo de publicações profissionais de marcas como:
- Posts editoriais com fotografia profissional escura e cinematográfica
- Silhuetas de executivos em reuniões, salas de comando, ambientes corporativos premium
- Ou ilustrações 3D isométricas ALTAMENTE específicas ao tema (não genéricas)
- Composição limpa, foco visual claro, identidade visual forte

## O que NUNCA fazer
- Sem padrões genéricos de "rede neural flutuando no espaço azul"
- Sem cérebros digitais sem contexto
- Sem nós de rede abstratos que poderiam ser de qualquer empresa de tecnologia
- Cada imagem deve ser ÚNICA e reconhecidamente sobre o tema do post

## Paleta e marca IntelliX.AI
- Fundo escuro: #171723 (azul-noite profundo)
- Primário: #196FA8 (azul corporativo)
- Destaque: #F2A82A (dourado)
- Estilo: premium, sóbrio, B2B brasileiro, consultoria de IA

## Formato de resposta
Retorne SOMENTE JSON válido, sem markdown:
[
  {
    "prompt": "prompt completo em inglês para o GPT Image 2, com cena específica, iluminação, composição e detalhes",
    "style_note": "descrição em 1 linha do que esta variação representa"
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

  return `Crie ${count} prompt(s) de imagem DISTINTOS e ESPECÍFICOS para este post:

TÍTULO: ${title}
${angle ? `ÂNGULO: ${angle}` : ""}
PILAR: ${pilarContext[pilar] ?? pilar}
PLATAFORMA: ${platformNote}
CONTEÚDO:
${excerpt}

Requisitos para cada prompt:
1. Descreva uma CENA ESPECÍFICA que representa visualmente este post — não genérica
2. Inclua: ambiente, iluminação, composição, elementos visuais específicos ao tema
3. Pode incluir silhuetas de pessoas em contextos profissionais (sem rostos visíveis)
4. Pode incluir elementos de interface/dashboard RELEVANTES ao tema do post
5. Cada variação deve ter um conceito visual DIFERENTE das outras
6. Escreva o prompt em inglês, detalhado, 3-5 frases`;
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
Dark background #171723, deep navy atmosphere. Blue #196FA8 and gold #F2A82A accent colors.
Cinematic lighting, premium B2B aesthetic, high production value.
NO text overlays, NO readable words, NO logos. Photorealistic or high-end 3D illustration.
Square 1:1 format, bold composition.`;

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

  const body = await req.json().catch(() => ({})) as { draft_id?: string; count?: number };
  const { draft_id, count = 1 } = body;

  if (!draft_id) return jsonResponse({ error: "draft_id required" }, 400);

  const imageCount = Math.min(Math.max(Math.floor(count), 1), 4);

  const db = adminClient();
  const { data: draft, error: fetchErr } = await db
    .from("marketing_drafts")
    .select("id, title, angle, content, pilar, platform")
    .eq("id", draft_id)
    .single();

  if (fetchErr || !draft) return jsonResponse({ error: "draft_not_found" }, 404);

  const { title, angle, content, pilar, platform } = draft as {
    id: string; title: string; angle: string | null;
    content: string; pilar: string; platform: string;
  };

  console.log(`[image-gen] step 1 — GPT-4o writing ${imageCount} narrative prompt(s) for: "${title}"`);

  // Step 1: LLM interprets the post and writes specific image prompts
  let imagePrompts: Array<{ prompt: string; style_note: string }> = [];
  try {
    const raw = await callGPT4(
      openaiKey,
      buildDirectorSystemPrompt(),
      buildDirectorUserPrompt(title, angle, content, pilar, platform, imageCount),
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

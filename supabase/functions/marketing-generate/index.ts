// Called when user approves an idea — generates content + DALL-E 3 image
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const RequestSchema = z.object({
  draft_id: z.string().uuid(),
});

const platformGuidance: Record<string, string> = {
  linkedin: "Post LinkedIn: texto corrido, 800–1500 caracteres, sem emojis, 1–2 hashtags no final, 1 CTA claro.",
  instagram: "Post Instagram: 3 slides de carrossel. Slide 1: gancho (1 linha). Slide 2: desenvolvimento (3–5 pontos curtos). Slide 3: CTA + 5 hashtags relevantes. Separe slides com '---SLIDE---'.",
  whatsapp: "Mensagem WhatsApp: informal, direta, até 300 chars, sem hashtags.",
};

const pilarContext: Record<string, string> = {
  resultado_ia: "Foque em case real, métricas concretas, antes/depois.",
  educacao_pratica: "Ensine algo prático. Passos concretos. Termine com insight acionável.",
  bastidores: "Build in public. Mostre a decisão real, o aprendizado.",
  posicionamento: "Hot take. Uma opinião clara sobre o mercado de IA.",
  comercial: "Benefício > feature. CTA direto. Honesto.",
};

const styleByPilar: Record<string, string> = {
  resultado_ia: "clean data visualization, modern dark dashboard, teal and indigo tones, abstract graph patterns",
  educacao_pratica: "minimalist educational style, soft purple gradient background, clean geometric shapes",
  bastidores: "authentic developer workspace aesthetic, dark moody lighting, code and terminal elements",
  posicionamento: "bold geometric composition, deep purple to midnight blue, strong typographic layout",
  comercial: "modern SaaS product visual, gradient from indigo to violet, professional and confident",
};

async function generateImage(openaiKey: string, title: string, pilar: string): Promise<string | null> {
  const style = styleByPilar[pilar] ?? "modern B2B tech illustration, dark theme, purple accents";
  const prompt = `Professional social media image for B2B AI consulting post: "${title}". Style: ${style}. No text overlay. Aspect ratio 1:1. Clean, minimal, modern.`;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "b64_json" }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data: Array<{ b64_json: string }> };
    return data.data?.[0]?.b64_json ?? null;
  } catch {
    return null;
  }
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

  // Auth via Supabase JWT (verify_jwt = true)
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { draft_id } = parsed.data;
  const db = adminClient();

  // Load the idea
  const { data: draft, error: fetchErr } = await db
    .from("marketing_drafts")
    .select("id, title, angle, pilar, platform, theme_prompt, research_snippets, trigger_mode")
    .eq("id", draft_id)
    .eq("status", "idea_pending")
    .single();

  if (fetchErr || !draft) {
    return jsonResponse({ error: "idea_not_found_or_not_pending" }, 404);
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return jsonResponse({ error: "openai_api_key_missing" }, 503);

  // Mark as generating to prevent double-clicks
  await db.from("marketing_drafts").update({ status: "generated" }).eq("id", draft_id);

  const contextText = ((draft.research_snippets ?? []) as Array<{ title: string }>)
    .map((s: { title: string }, i: number) => `[${i + 1}] ${s.title}`)
    .join("\n");

  const systemPrompt = `Você é o redator da IntelliX.AI.
Brand voice: especialista confiante, claro e direto. NUNCA: "revolucionário", "disruptivo", "incrível".
SEMPRE inclua: "Resultado Visível. Tecnologia Invisível." ou "Sem hype. Com método."
Prefira números e fatos. PT-BR, sentence case.

${platformGuidance[draft.platform]}`;

  const userPrompt = `Escreva o post:
Título: ${draft.title}
Ângulo: ${draft.angle}
Pilar: ${pilarContext[draft.pilar] ?? ""}
${contextText ? `\nContexto:\n${contextText}` : ""}
${draft.theme_prompt ? `\nTema: "${draft.theme_prompt}"` : ""}

Escreva APENAS o post final.`;

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

  // Generate image
  let imageUrl: string | null = null;
  try {
    const b64 = await generateImage(openaiKey, draft.title, draft.pilar);
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

  // Update draft with generated content
  await db.from("marketing_drafts").update({
    content,
    image_url: imageUrl,
    status: "generated",
  }).eq("id", draft_id);

  console.log(`[marketing-generate] draft=${draft_id} image=${imageUrl ? "yes" : "no"}`);
  return jsonResponse({ success: true, draft_id, image_url: imageUrl });
});

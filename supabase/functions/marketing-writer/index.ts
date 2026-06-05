import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const IdeaSchema = z.object({
  title: z.string(),
  pilar: z.enum(["resultado_ia", "educacao_pratica", "bastidores", "posicionamento", "comercial"]),
  angle: z.string(),
  platform: z.enum(["linkedin", "instagram", "whatsapp"]),
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

const pilarContext: Record<string, string> = {
  resultado_ia: "Foque em case real, métricas concretas, antes/depois. Se não houver case específico, use dado do mercado.",
  educacao_pratica: "Ensine algo prático. Passos concretos. Desmistifique. Termine com insight acionável.",
  bastidores: "Build in public. Mostre a decisão real, o aprendizado, o que deu errado ou certo.",
  posicionamento: "Hot take. Contrarianismo saudável. Uma opinião clara sobre o mercado de IA.",
  comercial: "Apresente produto/Virada de forma honesta. Benefício > feature. CTA direto.",
};

async function generateImage(openaiKey: string, title: string, pilar: string): Promise<string | null> {
  const styleByPilar: Record<string, string> = {
    resultado_ia: "clean data visualization aesthetic, modern dashboard, teal and dark blue tones",
    educacao_pratica: "minimalist educational infographic style, clean typography, soft purple gradient",
    bastidores: "authentic behind-the-scenes tech workspace, dark moody lighting, developer aesthetic",
    posicionamento: "bold typographic poster, high contrast black and white, strong geometric shapes",
    comercial: "modern SaaS product visual, gradient purple to blue, professional and sleek",
  };

  const style = styleByPilar[pilar] ?? "modern tech business illustration, dark theme, purple accents";
  const prompt = `Professional social media cover image for a B2B AI consulting company post about: "${title}". Style: ${style}. No text overlay. Aspect ratio 1:1. Clean, minimal, modern.`;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!res.ok) {
      console.error("[marketing-writer] DALL-E error", res.status, await res.text());
      return null;
    }

    const data = await res.json() as { data: Array<{ b64_json: string }> };
    return data.data?.[0]?.b64_json ?? null;
  } catch (e) {
    console.error("[marketing-writer] image generation error:", e);
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

  const systemPrompt = `Você é o redator de conteúdo da IntelliX.AI.
Regras absolutas de brand voice:
- Tom: especialista confiante, não arrogante. Claro e direto.
- NUNCA use: "revolucionário", "disruptivo", "incrível", "top demais", clichês de IA.
- SEMPRE inclua ao menos uma: "Resultado Visível. Tecnologia Invisível." OU "Sem hype. Com método."
- Prefira números e fatos a adjetivos vagos.
- PT-BR, sentence case.

${platformGuidance[idea.platform]}`;

  const userPrompt = `Escreva um post completo para ${idea.platform} sobre:
Título: ${idea.title}
Ângulo: ${idea.angle}
Pilar: ${pilarContext[idea.pilar]}

${contextText ? `Contexto de pesquisa:\n${contextText}` : ""}

${theme_prompt ? `Tema solicitado: "${theme_prompt}"` : ""}

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

  // Insert draft first to get the ID
  const { data: draft, error } = await db
    .from("marketing_drafts")
    .insert({
      title: idea.title,
      content,
      pilar: idea.pilar,
      platform: idea.platform,
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

  // Generate image async — don't block draft creation
  let imageUrl: string | null = null;
  try {
    const b64 = await generateImage(openaiKey, idea.title, idea.pilar);
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

  console.log(`[marketing-writer] draft saved id=${draft.id} pilar=${idea.pilar} platform=${idea.platform} image=${imageUrl ? "yes" : "no"}`);
  return jsonResponse({ success: true, draft_id: draft.id, image_url: imageUrl });
});

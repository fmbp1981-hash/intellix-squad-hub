import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { buildBrandSystemBlock, PILAR_CONTEXT, CONTENT_MIX, CONTENT_FORMATS, CAPTION_STRATEGY } from "../_shared/brand-context.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const SnippetSchema = z.object({
  source: z.enum(["knowledge", "perplexity", "linkedin"]),
  url: z.string(),
  title: z.string(),
  snippet: z.string(),
});

const RequestSchema = z.object({
  snippets: z.array(SnippetSchema).min(0).max(20),
  theme_prompt: z.string().optional(),
  platform: z.enum(["linkedin", "instagram", "whatsapp"]).default("linkedin"),
});

export interface PostIdea {
  title: string;
  pilar: "resultado_ia" | "educacao_pratica" | "bastidores" | "posicionamento" | "comercial";
  angle: string;
  platform: "linkedin" | "instagram" | "whatsapp";
  content_type: "informational" | "product_promotion" | "virada_inteligente" | "news_data";
  needs_image: boolean;
}

const PILAR_DISTRIBUTION: PostIdea["pilar"][] = [
  "resultado_ia",
  "educacao_pratica",
  "bastidores",
  "posicionamento",
  "comercial",
];

const CONTENT_TYPE_VALUES: PostIdea["content_type"][] = [
  "informational",
  "product_promotion",
  "virada_inteligente",
  "news_data",
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

  const { snippets, theme_prompt, platform } = parsed.data;

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return jsonResponse({ error: "openai_api_key_missing" }, 503);

  const contextText = snippets
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const hookSamples = Object.entries(PILAR_CONTEXT)
    .map(([pilar, ctx]) => `${pilar}: ${ctx.hooks[0]}`)
    .join("\n");

  const systemPrompt = `Você é o estrategista de conteúdo da IntelliX.AI.

${buildBrandSystemBlock()}

## Pilares, distribuição e formato recomendado
- resultado_ia (40%): ${PILAR_CONTEXT.resultado_ia.description} → Formato ${PILAR_CONTEXT.resultado_ia.format}
- bastidores (incluído nos 40%): ${PILAR_CONTEXT.bastidores.description} → Formato ${PILAR_CONTEXT.bastidores.format}
- posicionamento (20%): ${PILAR_CONTEXT.posicionamento.description} → Formato ${PILAR_CONTEXT.posicionamento.format}
- educacao_pratica (10%): ${PILAR_CONTEXT.educacao_pratica.description} → Formato ${PILAR_CONTEXT.educacao_pratica.format}
- comercial (20%): ${PILAR_CONTEXT.comercial.description} → Formato ${PILAR_CONTEXT.comercial.format}

## Tipos de conteúdo e imagem
- informational: educação, bastidores, posicionamento, notícias — needs_image: false (75-85% do total)
- product_promotion: promoção de produto/case IntelliX com identidade visual — needs_image: true
- virada_inteligente: Virada Inteligente exclusivamente — needs_image: true
- news_data: dado/notícia de mercado de IA, sem marca — needs_image: false

## Exemplos de hooks por pilar
${hookSamples}

## CTAs permitidos: ${CAPTION_STRATEGY.allowedCTAs.slice(0, 5).join(" | ")}
## PROIBIDO: Comenta [PALAVRA], Digita X nos comentários — não há automação de DM ativa.

Plataforma alvo: ${platform}`;

  const userPrompt = `Com base nos trechos de pesquisa abaixo${theme_prompt ? ` e no tema: "${theme_prompt}"` : ""}, gere EXATAMENTE 3 ideias de post.
Distribua os pilares de forma variada (evite repetir o mesmo pilar).
Siga o mix: prefira 2 informacionais + 1 com imagem (ou 3 informacionais se não houver gancho comercial relevante).

Contexto pesquisado:
${contextText || "Sem contexto externo — use conhecimento geral sobre IA em negócios B2B."}

Responda SOMENTE em JSON válido, sem markdown:
[
  {
    "title": "...",
    "pilar": "resultado_ia|educacao_pratica|bastidores|posicionamento|comercial",
    "angle": "...",
    "content_type": "informational|product_promotion|virada_inteligente|news_data",
    "needs_image": true|false
  }
]`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    console.error("[marketing-ideator] OpenAI error", res.status);
    return jsonResponse({ error: "openai_failed" }, 503);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "[]";

  let ideas: PostIdea[];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no json array");
    const raw = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      pilar: string;
      angle: string;
      content_type: string;
      needs_image: boolean;
    }>;
    ideas = raw.slice(0, 3).map((r) => ({
      title: r.title,
      pilar: (PILAR_DISTRIBUTION.includes(r.pilar as PostIdea["pilar"])
        ? r.pilar
        : "educacao_pratica") as PostIdea["pilar"],
      angle: r.angle,
      platform,
      content_type: (CONTENT_TYPE_VALUES.includes(r.content_type as PostIdea["content_type"])
        ? r.content_type
        : "informational") as PostIdea["content_type"],
      needs_image: Boolean(r.needs_image),
    }));
  } catch (e) {
    console.error("[marketing-ideator] parse error", e, content.slice(0, 200));
    return jsonResponse({ error: "parse_failed" }, 500);
  }

  console.log(`[marketing-ideator] generated ${ideas.length} ideas`);
  return jsonResponse({ success: true, ideas });
});

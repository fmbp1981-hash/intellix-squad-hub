import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
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
}

const PILAR_DISTRIBUTION: PostIdea["pilar"][] = [
  "resultado_ia",
  "educacao_pratica",
  "bastidores",
  "posicionamento",
  "comercial",
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

  const systemPrompt = `Você é o estrategista de conteúdo da IntelliX.AI.
Empresa: IntelliX.AI — "Resultado Visível. Tecnologia Invisível."
Pilares de conteúdo (% de distribuição obrigatória):
- resultado_ia: 30% — cases reais, métricas, antes/depois
- educacao_pratica: 25% — tutoriais, desmistificação de IA
- bastidores: 20% — build in public, decisões técnicas
- posicionamento: 15% — hot takes, contrarianismo saudável
- comercial: 10% — lançamentos, Virada Inteligente, CTAs

Tom: direto, sem hype, orientado a resultado. Nunca use: "revolucionário", "disruptivo", "incrível".
Plataforma alvo: ${platform}`;

  const userPrompt = `Com base nos trechos de pesquisa abaixo${theme_prompt ? ` e no tema: "${theme_prompt}"` : ""}, gere EXATAMENTE 3 ideias de post.
Distribua os pilares de forma variada (evite repetir o mesmo pilar).

Contexto pesquisado:
${contextText || "Sem contexto externo — use conhecimento geral sobre IA em negócios B2B."}

Responda SOMENTE em JSON válido, sem markdown:
[
  {"title": "...", "pilar": "resultado_ia|educacao_pratica|bastidores|posicionamento|comercial", "angle": "..."},
  {"title": "...", "pilar": "...", "angle": "..."},
  {"title": "...", "pilar": "...", "angle": "..."}
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
    const raw = JSON.parse(jsonMatch[0]) as Array<{ title: string; pilar: string; angle: string }>;
    ideas = raw.slice(0, 3).map((r) => ({
      title: r.title,
      pilar: (PILAR_DISTRIBUTION.includes(r.pilar as PostIdea["pilar"])
        ? r.pilar
        : "educacao_pratica") as PostIdea["pilar"],
      angle: r.angle,
      platform,
    }));
  } catch (e) {
    console.error("[marketing-ideator] parse error", e, content.slice(0, 200));
    return jsonResponse({ error: "parse_failed" }, 500);
  }

  console.log(`[marketing-ideator] generated ${ideas.length} ideas`);
  return jsonResponse({ success: true, ideas });
});

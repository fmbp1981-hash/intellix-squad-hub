// Called when user approves an idea — generates content + optional image
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { buildBrandSystemBlock, PILAR_CONTEXT, CONTENT_FORMATS, CAPTION_STRATEGY, ContentFormat } from "../_shared/brand-context.ts";
import { callLLM, loadAgentLLMConfig } from "../_shared/llm-client.ts";
import { extractOgImages } from "../_shared/og-extractor.ts";
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
  // Instagram: resultado_ia e educacao_pratica usam Formato E (Data Story — Narrativa Prescritiva)
  if (platform === "instagram" && (pilar === "resultado_ia" || pilar === "educacao_pratica")) return "E";
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

interface NewsSnippet {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

interface SlideImage {
  slide: number;
  title: string;
  image_url: string | null;
  copy: string;
  practical_tip: string;
}

// Generates the full Monday news digest: per-slide copy + OG images + CTA slide.
// LLM copy and OG extraction run in parallel. No per-slide AI image fallback (too slow).
async function generateNewsDigest(
  snippets: NewsSnippet[],
  llmConfig: Awaited<ReturnType<typeof loadAgentLLMConfig>>,
): Promise<{ content: string; slideImages: SlideImage[] }> {
  const topSnippets = snippets.slice(0, 7);

  const systemPrompt = `Você é o redator da IntelliX.AI. Escreve conteúdo para Instagram no estilo curador de IA para líderes e empreendedores brasileiros.

Voz: informal, direta, orientada ao benefício. Use "pra", "tá", "hoje mesmo".
Nunca use jargão técnico sem explicar. Prefira ações concretas a conceitos abstratos.

INTEGRIDADE DE DADOS (INVIOLÁVEL):
- Use APENAS os dados, fatos e números presentes nas notícias fornecidas. NUNCA invente estatísticas.
- Mencione sempre a fonte de forma natural: "segundo [veículo]", "de acordo com [empresa]".
- Se o snippet não tiver dados suficientes, escreva de forma qualitativa — sem preencher com fatos inexistentes.
- NUNCA invente relatos ou resultados de clientes.`;

  const newsLines = topSnippets
    .map((s, i) => `[${i + 1}] ${s.title}\nContexto: ${s.snippet}`)
    .join("\n\n");

  const userPrompt = `Para cada notícia abaixo, escreva o texto de UM slide de carrossel Instagram com:
- "headline": manchete curta e impactante (máx 8 palavras, destaque palavras-chave em MAIÚSCULAS)
- "context": o que isso significa pra negócios (1-2 frases curtas)
- "practical_tip": começa obrigatoriamente com "Como usar HOJE:" + 1 ação concreta e aplicável imediatamente por líderes/empreendedores (1-2 linhas)

Notícias:
${newsLines}

Responda SOMENTE em JSON válido, array de ${topSnippets.length} objetos:
[{"index":0,"headline":"...","context":"...","practical_tip":"Como usar HOJE: ..."}]`;

  // LLM copy + OG extraction run in parallel
  const [copyRaw, ogResults] = await Promise.all([
    callLLM(llmConfig, systemPrompt, userPrompt).catch(() => ""),
    extractOgImages(topSnippets),
  ]);

  let slidesCopy: Array<{ index: number; headline: string; context: string; practical_tip: string }> = [];
  try {
    const match = copyRaw.match(/\[[\s\S]*\]/);
    if (match) slidesCopy = JSON.parse(match[0]);
  } catch {
    // fallback copy from raw snippets
  }

  const slideImages: SlideImage[] = topSnippets.map((s, i) => {
    const copy = slidesCopy[i] ?? {
      index: i,
      headline: s.title,
      context: s.snippet,
      practical_tip: "Como usar HOJE: avalie como essa novidade impacta sua operação e compartilhe com seu time.",
    };
    const fullCopy = `${copy.headline}\n\n${copy.context}\n\n${copy.practical_tip}`;
    return {
      slide: i + 2,
      title: copy.headline,
      image_url: ogResults[i]?.ogImage ?? null,  // OG only — no AI fallback (latency)
      copy: fullCopy,
      practical_tip: copy.practical_tip,
    };
  });

  const manchetes = slidesCopy.length > 0
    ? slidesCopy.map((s) => `— ${s.headline}`).join("\n")
    : topSnippets.map((s) => `— ${s.title}`).join("\n");

  const content = `Separei tudo que rolou em IA essa semana pra você não precisar garimpar. 👇

${manchetes}

Salva esse post pra consultar durante a semana.

Quer implementar IA na sua empresa com resultado real? A IntelliX.AI faz isso por você — da estratégia ao deploy. Link na bio.

#InteligenciaArtificial #IAnegócios #LiderancaDigital #TransformacaoDigital #IntelliXAI #AutomacaoInteligente #IAparaNegócios #GestaoComIA #EmpreendedorDigital`;

  return { content, slideImages };
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
CTAs permitidos: ${CAPTION_STRATEGY.allowedCTAs.slice(0, 5).join(" | ")}
NUNCA usar: Comenta [PALAVRA] ou variações — sem automação de DM ativa.

## Integridade de dados (INVIOLÁVEL)
- NUNCA invente relatos, depoimentos ou resultados de clientes — use apenas estimativas genéricas como "empresas como a sua" ou "times que adotam IA".
- NUNCA crie números, estatísticas, datas ou fatos que não estejam no contexto de pesquisa fornecido.
- Para posts de notícia/novidade (news_data): use APENAS dados presentes nos snippets recebidos. Se um dado não veio no contexto, não o inclua.
- Quando usar dados de pesquisa, indique a origem de forma natural: "segundo [fonte]", "de acordo com [estudo]", "dados de [empresa]".
- Se não houver dados suficientes no contexto, escreva de forma principiológica e qualitativa — sem inventar números.

## Diretrizes de escrita
- Voz coloquial brasileira inteligente: use "pra", "tá", "ninguém te conta" quando soar natural.
- Frases curtas — máximo 2 linhas por parágrafo.
- Nunca comece com "Olá" ou introdução — vá direto ao gancho.
- Prefira números reais a adjetivos vagos — mas SOMENTE se os números vierem do contexto de pesquisa.
- Sentence case em PT-BR sempre.

## Formato e plataforma
${formatGuidance}
${draft.platform !== "whatsapp" ? `\n${platformGuidance[draft.platform] ?? ""}` : ""}`;

  const SLIDE_COUNT: Record<ContentFormat, number> = { A: 9, B: 9, C: 5, D: 7, E: 7 };
  const isCarousel = draft.platform === "instagram";

  // Formato E: instrução específica por slide (Anatomia Carla Feder)
  // IMPORTANTE: os papéis de cada slide são INSTRUÇÃO INTERNA — NÃO aparecem no texto.
  // A narrativa flui naturalmente sem anunciar sua estrutura.
  const slideInstructionE = `Gere EXATAMENTE 7 slides separados por ---SLIDE--- (sem texto antes do primeiro nem depois do último).
Máximo 4 linhas por slide. NÃO use labels, títulos ou rótulos estruturais no texto — a narrativa flui naturalmente.

SLIDE 1 [papel: DADO ÂNCORA]: Escreva APENAS o número/estatística em tamanho destaque + no máximo 1 linha de subtítulo mínimo. Nenhum contexto ainda. Ex: "46%" numa linha + "das equipes já usam IA na sua empresa — sem você saber." Sem mais nada.

SLIDE 2 [papel: CONTEXTO]: Escreva de onde vem esse dado e o cenário de mercado. Tom factual. Máx 3 linhas. Termine sem resolver — deixe o leitor querendo mais.

SLIDE 3 [papel: INSIGHT]: Explique por que isso está acontecendo — a causa raiz em linguagem de gestor de negócios, não técnica. Direto. Sem anunciar "por que isso acontece:".

SLIDE 4 [papel: IMPLICAÇÃO]: Mostre o que esse dado muda para o negócio do leitor agora. Consequência concreta, inescapável. Sem anunciar "o que isso significa:".

SLIDE 5 [papel: RECOMENDAÇÃO — o mais importante]: Diga o que fazer. Verbo imperativo + ação específica + contexto de tempo ("hoje", "esta semana"). Sem anunciar "o que fazer:". Este slide precisa fazer o leitor querer salvar o post.

SLIDE 6 [papel: INTELLIX]: Uma ou duas frases mostrando naturalmente como a IntelliX ou um produto específico (RadarAI, ForjaAI, Virada) conecta com isso — sem vender explicitamente.

SLIDE 7 [papel: CTA]: CTA de baixa pressão. Ex: "Se esse dado faz sentido pra você, me chama no direct." NUNCA "Comenta [PALAVRA]".`;

  const slideInstruction = isCarousel
    ? format === "E"
      ? slideInstructionE
      : `Gere EXATAMENTE ${SLIDE_COUNT[format]} slides separados por ---SLIDE--- (sem texto antes do primeiro slide nem depois do último).
Cada slide: máximo 4 linhas de texto. Slide 1 = gancho. Slides 2-${SLIDE_COUNT[format] - 2} = desenvolvimento. Slide ${SLIDE_COUNT[format] - 1} = virada/síntese. Slide ${SLIDE_COUNT[format]} = CTA — use "Link na bio", "Me chama no direct" ou "Acessa o link na bio". NUNCA "Comenta [PALAVRA]".`
    : "Escreva o post final em texto corrido.";

  const userPrompt = `Escreva o post:
Título: ${draft.title}
Ângulo: ${draft.angle ?? ""}
Pilar: ${pilarCtx?.description ?? draft.pilar}
Tipo: ${draft.content_type ?? "informational"}
${contextText ? `\nContexto:\n${contextText}` : ""}
${draft.theme_prompt ? `\nTema: "${draft.theme_prompt}"` : ""}

${slideInstruction}`;

  const llmConfig = await loadAgentLLMConfig(db, "marketing-generator", {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    temperature: 0.7,
    maxTokens: 4096,
  });
  const content = await callLLM(llmConfig, systemPrompt, userPrompt);
  if (!content.trim()) return jsonResponse({ error: "empty_content" }, 500);

  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  // News digest carrossel — special path: per-slide copy + OG images + CTA
  if (draft.content_type === "news_data" && draft.platform === "instagram") {
    const snippets = (draft.research_snippets ?? []) as NewsSnippet[];
    const { content: digestContent, slideImages } = await generateNewsDigest(snippets, llmConfig);

    // CTA slide (last)
    const ctaSlide: SlideImage = {
      slide: slideImages.length + 2,
      title: "IntelliX.AI — IA que gera resultado",
      image_url: null,
      copy: "Quer implementar IA na sua empresa com resultado real?\n\nA IntelliX.AI cuida de tudo: estratégia, automação e deploy.\n\nLink na bio 👆",
      practical_tip: "",
    };

    const allSlides = [
      { slide: 1, title: "Capa", image_url: null, copy: "Tudo que rolou de IA nessa semana 🤖\nResumo para Líderes e Empreendedores", practical_tip: "" },
      ...slideImages,
      ctaSlide,
    ];

    await db.from("marketing_drafts").update({
      content: digestContent,
      slide_images: allSlides,
      status: "generated",
    }).eq("id", draft_id);

    console.log(`[marketing-generate] news_digest draft=${draft_id} slides=${allSlides.length}`);
    return jsonResponse({ success: true, draft_id, slide_count: allSlides.length });
  }

  // Image generation is handled exclusively by marketing-image-gen (LLM-first approach).
  // marketing-generate only sets content + status. Virada brand images are pre-set on the idea.
  const existingImageUrl: string | null = (draft.image_url as string | null) ?? null;

  await db.from("marketing_drafts").update({
    content,
    image_url: existingImageUrl,
    status: "generated",
  }).eq("id", draft_id);

  console.log(`[marketing-generate] draft=${draft_id} type=${draft.content_type} platform=${draft.platform} format=${format}`);
  return jsonResponse({ success: true, draft_id, image_url: existingImageUrl });
});

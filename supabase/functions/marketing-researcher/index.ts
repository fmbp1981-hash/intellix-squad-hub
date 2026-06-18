// supabase/functions/marketing-researcher/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-client.ts";
import { fetchGmailSnippets } from "../_shared/gmail-client.ts";
import { fetchGoogleNews, fetchInstagramProfile, fetchLinkedInAnthropic, fetchLinkedInIntelliX, fetchLinkedInRBI } from "../_shared/serp-client.ts";
import { fetchPerplexityNews } from "../_shared/perplexity-client.ts";
import { adminClient } from "../_shared/auth.ts";

// Content-style references + AI voices worth monitoring
const INSTAGRAM_PROFILES = [
  "gestaoai",
  "thaleslaray",
  "dumasolucoes",
  "cathyduraes",
  "cavendishconsultoria",
  "inventormiguel",
];

export interface ResearchSnippet {
  title: string;
  snippet: string;
  url: string;
  source: "google_news" | "gmail" | "instagram" | "linkedin" | "kb" | "perplexity";
  relevance_score?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!apiKey || auth !== `Bearer ${apiKey}`) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  console.log("[marketing-researcher] starting research — 11 sources in parallel");

  const results = await Promise.allSettled([
    fetchGoogleNews("inteligência artificial negócios Brasil automação", 12),  // [0]
    fetchGmailSnippets(),                                                       // [1]
    fetchPerplexityNews(),                                                      // [2]
    ...INSTAGRAM_PROFILES.map((h) => fetchInstagramProfile(h, 3)),             // [3..8]
    fetchLinkedInAnthropic(4),                                                  // [9]
    fetchLinkedInIntelliX(4),                                                   // [10]
    fetchLinkedInRBI(4),                                                        // [11]
  ]);

  const [newsR, gmailR, perplexityR, ...rest] = results;
  const igResults = rest.slice(0, INSTAGRAM_PROFILES.length);
  const [linkedinAnthropicR, linkedinIntelliXR, linkedinRBIR] = rest.slice(INSTAGRAM_PROFILES.length);

  const allSnippets: ResearchSnippet[] = [];

  if (newsR.status === "fulfilled") {
    allSnippets.push(...newsR.value.map((s) => ({ ...s, source: "google_news" as const })));
  } else console.warn("[marketing-researcher] google_news failed:", newsR.reason);

  if (gmailR.status === "fulfilled") {
    allSnippets.push(
      ...gmailR.value.map((s) => ({
        title: s.subject,
        snippet: s.snippet,
        url: `gmail:${s.id}`,
        source: "gmail" as const,
      }))
    );
  } else console.warn("[marketing-researcher] gmail failed:", gmailR.reason);

  if (perplexityR.status === "fulfilled") {
    allSnippets.push(...perplexityR.value.map((s) => ({ ...s, source: "perplexity" as const })));
  } else console.warn("[marketing-researcher] perplexity failed:", perplexityR.reason);

  for (let i = 0; i < INSTAGRAM_PROFILES.length; i++) {
    const igR = igResults[i];
    if (igR?.status === "fulfilled") {
      allSnippets.push(...igR.value.map((s: ResearchSnippet) => ({ ...s, source: "instagram" as const })));
    } else console.warn(`[marketing-researcher] instagram @${INSTAGRAM_PROFILES[i]} failed`);
  }

  if (linkedinAnthropicR?.status === "fulfilled") {
    allSnippets.push(...linkedinAnthropicR.value.map((s: ResearchSnippet) => ({ ...s, source: "linkedin" as const })));
  }
  if (linkedinIntelliXR?.status === "fulfilled") {
    allSnippets.push(...linkedinIntelliXR.value.map((s: ResearchSnippet) => ({ ...s, source: "linkedin" as const })));
  }
  if (linkedinRBIR?.status === "fulfilled") {
    allSnippets.push(...linkedinRBIR.value.map((s: ResearchSnippet) => ({ ...s, source: "linkedin" as const })));
  }

  // KB interna
  const db = adminClient();
  const { data: kbItems } = await db
    .from("knowledge_base")
    .select("title, content")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (kbItems) {
    allSnippets.push(
      ...(kbItems as Array<{ title: string; content: string }>).map((k) => ({
        title: k.title,
        snippet: k.content.slice(0, 300),
        url: "intellix-kb",
        source: "kb" as const,
      }))
    );
  }

  console.log(`[marketing-researcher] collected ${allSnippets.length} raw snippets`);

  if (allSnippets.length === 0) {
    return jsonResponse({ success: true, snippets: [], total_raw: 0 });
  }

  const snippetList = allSnippets
    .map((s, i) => `[${i}] [${s.source}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  let ranked: ResearchSnippet[] = allSnippets;

  try {
    const rankResponse = await callLLM(
      { provider: "anthropic", model: "claude-haiku-4-5-20251001", temperature: 0.1, maxTokens: 1024 },
      "Você ranqueia snippets de pesquisa por relevância para marketing de IA.",
      `Avalie cada snippet (0-10) por relevância para criar posts sobre automação com IA em negócios brasileiros para a IntelliX.AI. Priorize: novidades de ferramentas de IA (ChatGPT, Claude, Gemini), impacto em negócios, dados e estatísticas reais. Responda SOMENTE em JSON: [{"index": 0, "score": 8}, ...]\n\n${snippetList}`
    );

    const jsonMatch = rankResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const scores = JSON.parse(jsonMatch[0]) as Array<{ index: number; score: number }>;
      const scoreMap = new Map(scores.map((s) => [s.index, s.score]));
      ranked = allSnippets
        .map((s, i) => ({ ...s, relevance_score: scoreMap.get(i) ?? 5 }))
        .filter((s) => (s.relevance_score ?? 0) >= 5)
        .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
        .slice(0, 20);
    }
  } catch (e) {
    console.warn("[marketing-researcher] ranking failed, returning unranked:", e);
  }

  console.log(`[marketing-researcher] returning ${ranked.length} ranked snippets`);
  return jsonResponse({ success: true, snippets: ranked, total_raw: allSnippets.length });
});

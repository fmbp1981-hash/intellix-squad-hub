// Perplexity Sonar — real-time AI news search
// Auth: PERPLEXITY_API_KEY secret (sonar model, search_recency_filter: week)

export interface PerplexitySnippet {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

// Topics searched on every researcher run (last 7 days filter applied by Sonar)
const PERPLEXITY_QUERIES = [
  "novidades e lançamentos de ferramentas de IA esta semana — ChatGPT, Claude, Gemini, Copilot, Grok",
  "impacto de inteligência artificial em negócios e automação empresarial — últimas notícias",
];

export async function fetchPerplexityNews(): Promise<PerplexitySnippet[]> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) {
    console.warn("[perplexity-client] PERPLEXITY_API_KEY not set — skipping");
    return [];
  }

  const results: PerplexitySnippet[] = [];

  for (const query of PERPLEXITY_QUERIES) {
    try {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                "Você é um pesquisador de IA. Forneça um resumo factual e direto das últimas notícias sobre o tema. Cite explicitamente de onde veio cada informação (nome do veículo ou empresa). Não invente dados.",
            },
            { role: "user", content: query },
          ],
          max_tokens: 600,
          search_recency_filter: "week",
          return_citations: true,
        }),
      });

      if (!res.ok) {
        console.warn(`[perplexity-client] query failed ${res.status}: ${await res.text()}`);
        continue;
      }

      const data = await res.json() as {
        choices: Array<{ message: { content: string } }>;
        citations?: string[];
      };

      const content = data.choices?.[0]?.message?.content ?? "";
      const citations = data.citations ?? [];

      if (content.trim()) {
        results.push({
          title: query,
          snippet: content.slice(0, 800),
          url: citations[0] ?? "perplexity-sonar",
          source: "perplexity",
        });
      }
    } catch (e) {
      console.warn("[perplexity-client] exception:", e);
    }
  }

  return results;
}

// supabase/functions/marketing-researcher/index.ts
import { z } from "https://esm.sh/zod@3.23.8";

// Inlined from _shared/cors.ts (Management API deploy workaround — no relative imports)
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

const RequestSchema = z.object({
  query: z.string().min(3).max(500),
  theme_prompt: z.string().optional(),
});

export interface ResearchSnippet {
  source: "knowledge" | "perplexity" | "linkedin";
  url: string;
  snippet: string;
  title: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { query, theme_prompt } = parsed.data;
  const searchQuery = theme_prompt ? `${theme_prompt} ${query}` : query;

  const [knowledgeSnippets, perplexitySnippets, linkedinSnippets] = await Promise.allSettled([
    searchKnowledge(searchQuery, serviceKey),
    searchPerplexity(searchQuery),
    searchLinkedin(searchQuery),
  ]);

  const snippets: ResearchSnippet[] = [
    ...(knowledgeSnippets.status === "fulfilled" ? knowledgeSnippets.value : []),
    ...(perplexitySnippets.status === "fulfilled" ? perplexitySnippets.value : []),
    ...(linkedinSnippets.status === "fulfilled" ? linkedinSnippets.value : []),
  ];

  console.log(`[marketing-researcher] query="${searchQuery}" snippets=${snippets.length}`);

  return jsonResponse({ success: true, snippets, total: snippets.length });
});

async function searchKnowledge(query: string, serviceKey: string): Promise<ResearchSnippet[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const res = await fetch(`${supabaseUrl}/functions/v1/knowledge-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query, top_k: 3 }),
  });

  if (!res.ok) {
    console.error("[marketing-researcher] knowledge-search failed", res.status);
    return [];
  }

  const data = await res.json() as { results: Array<{ document_title: string; content: string; section_title: string | null }> };
  return (data.results ?? []).map((r) => ({
    source: "knowledge" as const,
    url: `internal://knowledge/${r.document_title}`,
    title: r.document_title,
    snippet: r.content.slice(0, 400),
  }));
}

async function searchPerplexity(query: string): Promise<ResearchSnippet[]> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) {
    console.error("[marketing-researcher] PERPLEXITY_API_KEY not set");
    return [];
  }

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        {
          role: "user",
          content: `Pesquise sobre: "${query}". Retorne 3 trechos relevantes sobre IA aplicada a negócios, com título e URL de fonte. Responda em JSON: [{"title":"...","url":"...","snippet":"..."}]`,
        },
      ],
      return_citations: true,
    }),
  });

  if (!res.ok) {
    console.error("[marketing-researcher] Perplexity failed", res.status);
    return [];
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "[]";

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ title: string; url: string; snippet: string }>;
    return parsed.slice(0, 3).map((p) => ({
      source: "perplexity" as const,
      url: p.url ?? "https://perplexity.ai",
      title: p.title ?? query,
      snippet: (p.snippet ?? "").slice(0, 400),
    }));
  } catch {
    return [];
  }
}

async function searchLinkedin(query: string): Promise<ResearchSnippet[]> {
  const apiKey = Deno.env.get("SERPAPI_KEY");
  if (!apiKey) {
    console.error("[marketing-researcher] SERPAPI_KEY not set");
    return [];
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google",
    q: `site:linkedin.com/posts ${query} IA negócios`,
    num: "5",
    hl: "pt",
    gl: "br",
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) {
    console.error("[marketing-researcher] SerpAPI failed", res.status);
    return [];
  }

  const data = await res.json() as { organic_results?: Array<{ title: string; link: string; snippet: string }> };
  return (data.organic_results ?? []).slice(0, 3).map((r) => ({
    source: "linkedin" as const,
    url: r.link,
    title: r.title,
    snippet: (r.snippet ?? "").slice(0, 400),
  }));
}

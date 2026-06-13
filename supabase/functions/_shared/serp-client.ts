// supabase/functions/_shared/serp-client.ts

export interface SerpSnippet {
  title: string;
  snippet: string;
  url: string;
  source: string;
  date?: string;
}

const SERP_BASE = "https://serpapi.com/search.json";

async function serpFetch(params: Record<string, string>): Promise<Response> {
  const apiKey = Deno.env.get("SERPAPI_KEY");
  if (!apiKey) throw new Error("[serp-client] SERPAPI_KEY missing");

  const url = SERP_BASE + "?" + new URLSearchParams({ ...params, api_key: apiKey });
  return fetch(url);
}

export async function fetchGoogleNews(query: string, numResults = 10): Promise<SerpSnippet[]> {
  const res = await serpFetch({ engine: "google_news", q: query, hl: "pt-br", gl: "br" });
  if (!res.ok) throw new Error(`[serp-client] google_news failed ${res.status}`);

  const data = await res.json() as {
    news_results?: Array<{ title: string; snippet?: string; link: string; source?: { name: string }; date?: string }>;
  };

  return (data.news_results ?? []).slice(0, numResults).map((r) => ({
    title: r.title,
    snippet: r.snippet ?? r.title,
    url: r.link,
    source: r.source?.name ?? "Google News",
    date: r.date,
  }));
}

export async function fetchInstagramProfile(handle: string, numResults = 5): Promise<SerpSnippet[]> {
  const query = `site:instagram.com/${handle} inteligência artificial OR IA OR automação`;
  const res = await serpFetch({ engine: "google", q: query, num: "10", tbs: "qdr:w", hl: "pt-br", gl: "br" });
  if (!res.ok) throw new Error(`[serp-client] instagram @${handle} failed ${res.status}`);

  const data = await res.json() as {
    organic_results?: Array<{ title: string; snippet?: string; link: string; date?: string }>;
  };

  return (data.organic_results ?? []).slice(0, numResults).map((r) => ({
    title: r.title,
    snippet: r.snippet ?? r.title,
    url: r.link,
    source: `instagram/@${handle}`,
    date: r.date,
  }));
}

export async function fetchLinkedInAnthropic(numResults = 5): Promise<SerpSnippet[]> {
  const query = `site:linkedin.com (Anthropic OR Claude) inteligência artificial OR AI`;
  const res = await serpFetch({ engine: "google", q: query, num: "10", tbs: "qdr:w", hl: "pt-br", gl: "br" });
  if (!res.ok) throw new Error(`[serp-client] linkedin failed ${res.status}`);

  const data = await res.json() as {
    organic_results?: Array<{ title: string; snippet?: string; link: string; date?: string }>;
  };

  return (data.organic_results ?? []).slice(0, numResults).map((r) => ({
    title: r.title,
    snippet: r.snippet ?? r.title,
    url: r.link,
    source: "linkedin/anthropic",
    date: r.date,
  }));
}

export async function fetchLinkedInIntelliX(numResults = 5): Promise<SerpSnippet[]> {
  const query = `site:linkedin.com "IntelliX" OR "intellixai" inteligência artificial OR IA OR automação`;
  const res = await serpFetch({ engine: "google", q: query, num: "10", tbs: "qdr:m", hl: "pt-br", gl: "br" });
  if (!res.ok) throw new Error(`[serp-client] linkedin/intellix failed ${res.status}`);

  const data = await res.json() as {
    organic_results?: Array<{ title: string; snippet?: string; link: string; date?: string }>;
  };

  return (data.organic_results ?? []).slice(0, numResults).map((r) => ({
    title: r.title,
    snippet: r.snippet ?? r.title,
    url: r.link,
    source: "linkedin/intellixai",
    date: r.date,
  }));
}

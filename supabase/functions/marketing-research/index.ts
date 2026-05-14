// marketing-research — Lúcio
// Coleta de 4 fontes em paralelo e salva em trends_raw
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { dispatchNext } from "../_shared/marketing-llm.ts";

const QUERIES = [
  "inteligência artificial empresas brasileiras 2026",
  "IA PME produtividade resultados",
  "automação inteligente negócios Brasil",
  "transformação digital liderança executiva",
];

async function fetchBraveSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const key = Deno.env.get("BRAVE_SEARCH_API_KEY");
  if (!key) return [];
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&freshness=pw`;
  const res = await fetch(url, { headers: { "X-Subscription-Token": key, Accept: "application/json" } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.web?.results ?? []).map((r: any) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.description ?? "",
  }));
}

async function fetchGoogleNewsRSS(query: string): Promise<{ title: string; url: string; snippet: string; published_at: string }[]> {
  const encoded = encodeURIComponent(query);
  const feedUrl = `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const res = await fetch(feedUrl);
  if (!res.ok) return [];
  const xml = await res.text();
  const items: { title: string; url: string; snippet: string; published_at: string }[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  for (const m of xml.matchAll(re)) {
    const block = m[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? block.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const link  = block.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
    const desc  = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ?? "";
    const pub   = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    if (title) items.push({ title, url: link, snippet: desc.replace(/<[^>]+>/g, "").slice(0, 300), published_at: pub });
  }
  return items.slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (svc && auth !== `Bearer ${svc}`) return jsonResponse({ error: "unauthorized" }, 401);

  const supa = adminClient();
  const batchId = crypto.randomUUID();
  const rows: any[] = [];

  // Coleta em paralelo
  const [braveResults, newsResults] = await Promise.all([
    Promise.all(QUERIES.map(fetchBraveSearch)),
    Promise.all(QUERIES.map(fetchGoogleNewsRSS)),
  ]);

  for (const list of braveResults) {
    for (const item of list) {
      rows.push({ batch_id: batchId, source: "brave_search", title: item.title, url: item.url, content_snippet: item.snippet });
    }
  }
  for (const list of newsResults) {
    for (const item of list) {
      rows.push({ batch_id: batchId, source: "google_news", title: item.title, url: item.url, content_snippet: item.snippet, published_at: item.published_at || null });
    }
  }

  if (rows.length > 0) {
    const { error } = await supa.from("trends_raw").insert(rows);
    if (error) return jsonResponse({ error: error.message }, 500);
  }

  // Dispara curadoria
  dispatchNext("marketing-curation", { batch_id: batchId });

  return jsonResponse({ ok: true, batch_id: batchId, items_collected: rows.length });
});

// supabase/functions/knowledge-search/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const SearchRequestSchema = z.object({
  query:    z.string().min(3).max(1000),
  agent_id: z.string().uuid().optional(),
  top_k:    z.number().int().min(1).max(10).default(5),
  layer:    z.enum(["estrategia", "oferta", "operacao"]).optional(),
});

type SearchRequest = z.infer<typeof SearchRequestSchema>;

interface ChunkResult {
  chunk_id:       string;
  document_id:    string;
  doc_number:     number;
  document_title: string;
  section_title:  string | null;
  content:        string;
  similarity:     number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed" }, 405);

  const started = Date.now();

  const parsed = SearchRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ success: false, error: parsed.error.flatten() }, 400);
  const payload = parsed.data;

  try {
    const results = await search(req, payload);
    return jsonResponse({
      success:       true,
      query:         payload.query,
      results,
      total_results: results.length,
      elapsed_ms:    Date.now() - started,
    });
  } catch (err) {
    console.error("[knowledge-search]", err);
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.startsWith("openai_") ? 503 : 500;
    return jsonResponse({ success: false, error: msg }, status);
  }
});

const OPENAI_EMBED_MODEL = "text-embedding-3-small";
const SIMILARITY_THRESHOLD = 0.70;

async function isAdminRequest(req: Request): Promise<boolean> {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey.length > 0 && bearer.length === serviceKey.length) {
    const a = new TextEncoder().encode(bearer);
    const b = new TextEncoder().encode(serviceKey);
    if (crypto.subtle.timingSafeEqual(a, b)) return true;
  }
  const check = await requireAdmin(req);
  return !("error" in check);
}

async function embedQuery(query: string): Promise<number[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("openai_api_key_missing");

  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:      OPENAI_EMBED_MODEL,
      input:      query,
      dimensions: 1536,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[knowledge-search] OpenAI error", resp.status, text.slice(0, 200));
    throw new Error(`openai_embeddings_failed`);
  }

  const json = await resp.json() as { data: { embedding: number[] }[] };
  if (!Array.isArray(json.data) || json.data.length === 0) {
    console.error("[knowledge-search] OpenAI unexpected response", JSON.stringify(json).slice(0, 200));
    throw new Error("openai_embeddings_unexpected_response");
  }
  return json.data[0].embedding;
}

async function search(req: Request, p: SearchRequest): Promise<ChunkResult[]> {
  const [isAdmin, queryEmbedding] = await Promise.all([
    isAdminRequest(req),
    embedQuery(p.query),
  ]);

  const supa = adminClient();

  const { data, error } = await supa.rpc("match_knowledge_chunks", {
    query_embedding:      queryEmbedding,
    similarity_threshold: SIMILARITY_THRESHOLD,
    match_count:          p.top_k,
    filter_restricted:    !isAdmin,
    filter_layer:         p.layer ?? null,
  });

  if (error) {
    console.error("[knowledge-search] RPC error", error);
    throw new Error("rpc_failed");
  }
  if (!data) return [];

  return (data as ChunkResult[]).map((row) => ({
    chunk_id:       row.chunk_id,
    document_id:    row.document_id,
    doc_number:     row.doc_number,
    document_title: row.document_title,
    section_title:  row.section_title,
    content:        row.content,
    similarity:     row.similarity,
  }));
}

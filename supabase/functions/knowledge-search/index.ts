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

async function search(_req: Request, _p: SearchRequest): Promise<ChunkResult[]> {
  throw new Error("not_implemented");
}

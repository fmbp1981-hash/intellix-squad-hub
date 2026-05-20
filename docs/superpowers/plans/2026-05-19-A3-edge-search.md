# A-3 · Edge Function `knowledge-search` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `knowledge-search` Supabase Edge Function that embeds a natural-language query and returns the most similar knowledge chunks via pgvector cosine similarity, with Doc 09 hidden from non-admin callers.

**Architecture:** Two parts — (1) a migration adding a `match_knowledge_chunks` SQL function (pgvector rpc pattern, required by Supabase JS for vector queries); (2) a Deno edge function at `supabase/functions/knowledge-search/index.ts` that embeds the query, calls the SQL function via `supabase.rpc()`, and returns ranked chunks. Admin detection: service-role bearer → full results; user JWT with admin role → full results; anon key / regular user → `is_restricted = false` filter applied.

**Tech Stack:** Deno · Supabase JS v2 · Zod 3.23.8 · OpenAI `text-embedding-3-small` · pgvector `<=>` cosine distance.

---

## Context

A-1 migration created `knowledge_documents` + `knowledge_chunks` with `vector(1536)` and HNSW index.  
A-2 edge function `knowledge-ingest` populates those tables.  
A-3 (this plan) exposes a search endpoint so agents (A-4) can query the base.

Behavior spec: `C:\Projects\intellix-squad-hub\behaviors\A-3-edge-search.md`

Resolved decisions:
- **pgvector via RPC**: Supabase JS v2 does not expose `<=>` operator natively; raw SQL functions called via `supabase.rpc()` is the correct pattern.
- **Auth**: `adminClient()` for all queries (bypasses RLS). Admin detection is manual: compare bearer token to `SUPABASE_SERVICE_ROLE_KEY` first (fast path for agent/system calls), then fall back to `requireAdmin(req)` for user JWT checks.
- **Layer filter**: passed as optional param to the SQL function (`NULL` = no filter).
- **Threshold**: 0.70 similarity minimum, hardcoded as a constant.

---

## File Structure

**Create:**
- `supabase/migrations/20260521_knowledge_search_fn.sql` — SQL function `match_knowledge_chunks`
- `supabase/functions/knowledge-search/index.ts` — edge function

**Reuse (read-only):**
- `supabase/functions/_shared/cors.ts` — `corsHeaders`, `jsonResponse`
- `supabase/functions/_shared/auth.ts` — `adminClient()`, `requireAdmin(req)`

---

### Task 1: Migration — `match_knowledge_chunks` SQL function

**Files:**
- Create: `supabase/migrations/20260521_knowledge_search_fn.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260521_knowledge_search_fn.sql
-- Provides pgvector cosine similarity search for knowledge-search edge function.
-- Called via supabase.rpc('match_knowledge_chunks', { ... })

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding   vector(1536),
  similarity_threshold float    DEFAULT 0.70,
  match_count       int         DEFAULT 5,
  filter_restricted boolean     DEFAULT true,
  filter_layer      text        DEFAULT NULL
)
RETURNS TABLE (
  chunk_id       uuid,
  document_id    uuid,
  doc_number     integer,
  document_title text,
  section_title  text,
  content        text,
  similarity     float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id                                               AS chunk_id,
    kc.document_id                                      AS document_id,
    kd.doc_number                                       AS doc_number,
    kd.title                                            AS document_title,
    kc.section_title                                    AS section_title,
    kc.content                                          AS content,
    (1 - (kc.embedding <=> query_embedding))::float     AS similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE
    (NOT filter_restricted OR kd.is_restricted = false)
    AND (1 - (kc.embedding <=> query_embedding)) > similarity_threshold
    AND (filter_layer IS NULL OR kd.layer = filter_layer)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Allow authenticated users and service_role to call this function
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(
  vector(1536), float, int, boolean, text
) TO authenticated, service_role;
```

- [ ] **Step 2: Apply in Supabase SQL Editor (Felipe)**

Run the file content in the SQL Editor of project `hynadwlwrscvjubryqlg`. Verify:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'match_knowledge_chunks';
-- Expected: 1 row returned
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260521_knowledge_search_fn.sql
git commit -m "feat(knowledge-search): add match_knowledge_chunks pgvector sql function"
```

---

### Task 2: Edge function scaffold + Zod schema

**Files:**
- Create: `supabase/functions/knowledge-search/index.ts`

- [ ] **Step 1: Create the file with imports, Zod schema, and handler skeleton**

```ts
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

interface ChunkResult {
  chunk_id:       string;
  document_id:    string;
  doc_number:     number;
  document_title: string;
  section_title:  string | null;
  content:        string;
  similarity:     number;
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/knowledge-search/index.ts
git commit -m "feat(knowledge-search): scaffold edge function with zod + cors"
```

---

### Task 3: Admin check helper + OpenAI query embedding

**Files:**
- Modify: `supabase/functions/knowledge-search/index.ts`

- [ ] **Step 1: Add `isAdminRequest` helper and `embedQuery` function, insert before `search()`**

```ts
const OPENAI_EMBED_MODEL = "text-embedding-3-small";
const SIMILARITY_THRESHOLD = 0.70;

async function isAdminRequest(req: Request): Promise<boolean> {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (bearer === (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) return true;
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
    throw new Error(`openai_embeddings_failed_${resp.status}: ${text.slice(0, 200)}`);
  }

  const json = await resp.json() as { data: { embedding: number[] }[] };
  if (!Array.isArray(json.data) || json.data.length === 0) {
    throw new Error(`openai_embeddings_unexpected_response: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.data[0].embedding;
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/knowledge-search/index.ts
git commit -m "feat(knowledge-search): admin check helper + openai query embedding"
```

---

### Task 4: RPC search call + response formatting (implement `search()`)

**Files:**
- Modify: `supabase/functions/knowledge-search/index.ts`

- [ ] **Step 1: Replace `search()` stub with full implementation**

```ts
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

  if (error) throw new Error(`rpc_failed: ${error.message}`);
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/knowledge-search/index.ts
git commit -m "feat(knowledge-search): rpc pgvector search + response formatting"
```

---

### Task 5: Deploy + smoke test (manual by Felipe)

**Files:**
- None (manual ops — Supabase CLI not auth'd in worktree)

- [ ] **Step 1: Apply the migration in Supabase SQL Editor** (if not already done in Task 1 Step 2)

Run the content of `supabase/migrations/20260521_knowledge_search_fn.sql` in the SQL Editor of project `hynadwlwrscvjubryqlg`.

- [ ] **Step 2: Deploy the edge function**

```bash
supabase functions deploy knowledge-search --project-ref hynadwlwrscvjubryqlg
```

- [ ] **Step 3: Smoke test — query that should return results (non-admin)**

```bash
curl -X POST "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/knowledge-search" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "processo de entrega da IntelliX", "top_k": 3}'
```

Expected: `{ "success": true, "results": [...], "total_results": N > 0, "elapsed_ms": < 500 }` (only non-restricted docs).

- [ ] **Step 4: Smoke test — same query with service_role (should include Doc 09 if relevant)**

```bash
curl -X POST "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/knowledge-search" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "precificação e preço", "top_k": 5}'
```

Expected: `success: true` — may include Doc 09 results if those chunks match.

- [ ] **Step 5: Verify Doc 09 never appears for non-admin**

```bash
curl -X POST "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/knowledge-search" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "precificação e preço interno", "top_k": 10}'
```

Expected: `results` array contains zero items with `doc_number: 9`.

- [ ] **Step 6: Test no-results case (low-similarity query)**

```bash
curl -X POST "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/knowledge-search" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "xyz abc nonsense query with no semantic match", "top_k": 5}'
```

Expected: `{ "success": true, "results": [], "total_results": 0 }` — no error, empty array.

- [ ] **Step 7: Test Zod validation (query too short)**

```bash
curl -X POST "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/knowledge-search" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "ab"}'
```

Expected: HTTP 400 with `{ "success": false, "error": { ... } }`.

---

## Verification (end-to-end)

After all tasks:

1. `supabase functions list` shows `knowledge-search`.
2. Non-admin query returns chunks with `similarity >= 0.70`, `doc_number != 9`.
3. Service-role query CAN return `doc_number: 9` chunks (if relevant).
4. Empty-result query returns `results: []`, not an error.
5. `top_k: 0` returns HTTP 400 (Zod `min(1)` fails).
6. No auth header returns HTTP 401 (Supabase platform).
7. OpenAI down → HTTP 503 with `openai_embeddings_failed_*`.
8. `elapsed_ms < 500` for p95 (embedding + RPC).

Once these pass, A-3 is done and A-4 (update personas Bia/Carlos) and A-5 (KnowledgeBaseTab UI) are unblocked.

---

## Critical files referenced

- Behavior spec: `C:\Projects\intellix-squad-hub\behaviors\A-3-edge-search.md`
- Migration (A-1): `C:\Projects\intellix-squad-hub\supabase\migrations\20260520_knowledge_base_schema.sql`
- New migration: `C:\Projects\intellix-squad-hub\supabase\migrations\20260521_knowledge_search_fn.sql`
- Shared CORS: `C:\Projects\intellix-squad-hub\supabase\functions\_shared\cors.ts`
- Shared auth: `C:\Projects\intellix-squad-hub\supabase\functions\_shared\auth.ts`
- Pattern reference (ingest): `C:\Projects\intellix-squad-hub\supabase\functions\knowledge-ingest\index.ts`

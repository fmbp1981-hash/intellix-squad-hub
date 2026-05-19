// supabase/functions/knowledge-ingest/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const IngestRequestSchema = z.object({
  doc_number:    z.number().int().min(1).max(11),
  content:       z.string().min(100),
  title:         z.string().min(1),
  version:       z.string().default("v1.0"),
  layer:         z.enum(["estrategia", "oferta", "operacao"]),
  is_restricted: z.boolean().default(false),
  metadata:      z.record(z.unknown()).default({}),
});

type IngestRequest = z.infer<typeof IngestRequestSchema>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const started = Date.now();

  const parsed = IngestRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ success: false, error: parsed.error.flatten() }, 400);
  const payload = parsed.data;

  try {
    const result = await ingest(payload);
    return jsonResponse({ success: true, ...result, elapsed_ms: Date.now() - started });
  } catch (err) {
    console.error("[knowledge-ingest]", err);
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.startsWith("openai_") ? 503 : 500;
    return jsonResponse({ success: false, error: msg }, status);
  }
});

async function ingest(_p: IngestRequest): Promise<Record<string, unknown>> {
  throw new Error("not_implemented");
}

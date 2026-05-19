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

const MAX_TOKENS = 800;
const TARGET_TOKENS = 600;
const OVERLAP_TOKENS = 100;
const MIN_SECTION_TOKENS = 50;

function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

interface Section { title: string | null; body: string; }

function splitBySections(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const out: Section[] = [];
  let current: Section = { title: null, body: "" };
  for (const line of lines) {
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (m) {
      if (current.body.trim().length > 0 || current.title) out.push(current);
      current = { title: m[2].trim(), body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  if (current.body.trim().length > 0 || current.title) out.push(current);
  return out;
}

function mergeSmallSections(sections: Section[]): Section[] {
  const merged: Section[] = [];
  for (const s of sections) {
    const prev = merged[merged.length - 1];
    if (prev && estimateTokens(prev.body) < MIN_SECTION_TOKENS) {
      prev.body += (s.title ? `\n## ${s.title}\n` : "") + s.body;
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

interface Chunk { section_title: string | null; content: string; }

function splitLargeSection(section: Section): Chunk[] {
  const text = section.body.trim();
  if (estimateTokens(text) <= MAX_TOKENS) {
    return [{ section_title: section.title, content: text }];
  }
  const targetChars = TARGET_TOKENS * 4;
  const overlapChars = OVERLAP_TOKENS * 4;
  const chunks: Chunk[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + targetChars, text.length);
    const slice = text.slice(i, end).trim();
    if (slice.length > 0) chunks.push({ section_title: section.title, content: slice });
    if (end >= text.length) break;
    i = end - overlapChars;
  }
  return chunks;
}

function chunkMarkdown(md: string): Chunk[] {
  const sections = mergeSmallSections(splitBySections(md));
  const chunks: Chunk[] = [];
  for (const s of sections) {
    if (!s.body.trim()) continue;
    chunks.push(...splitLargeSection(s));
  }
  return chunks.filter((c) => c.content.length > 0);
}

async function ingest(_p: IngestRequest): Promise<Record<string, unknown>> {
  throw new Error("not_implemented");
}

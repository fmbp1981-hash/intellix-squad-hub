// marketing-image-gen — generates 1-4 contextual images for a draft using GPT Image 2
// Each image gets a unique variation angle to avoid identical outputs.

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

const STYLE_BY_PILAR: Record<string, string> = {
  resultado_ia:     "clean data visualization, modern dark dashboard, teal and indigo tones, network graph aesthetics",
  educacao_pratica: "minimalist educational illustration, soft purple gradient, clean geometric shapes, step-by-step flow",
  bastidores:       "authentic developer workspace, dark moody lighting, code editor aesthetic, terminal glow",
  posicionamento:   "bold geometric composition, deep purple to midnight blue, strong angular shapes, leadership feel",
  comercial:        "modern SaaS product visual, gradient indigo to violet, dashboard preview, professional confidence",
};

// Each index gets a distinct compositional angle — forces GPT Image 2 to diverge visually
const VARIATION_BY_INDEX: Record<number, string> = {
  0: "Macro concept: abstract wide composition, central focal element, depth of field effect",
  1: "Micro detail: close-up technical illustration, intricate geometric pattern, high contrast",
  2: "Metaphorical: symbolic visual metaphor, organic shapes mixed with digital elements, layered depth",
  3: "Structural: clean grid layout, modular components, architectural schematic feel, blueprint aesthetic",
};

function buildImagePrompt(
  title: string,
  angle: string | null,
  content: string,
  pilar: string,
  platform: string,
  variationIndex: number,
): string {
  const style = STYLE_BY_PILAR[pilar] ?? "modern B2B tech illustration, dark theme, purple accents";
  const variation = VARIATION_BY_INDEX[variationIndex] ?? VARIATION_BY_INDEX[0];

  // Use title + angle as primary concept signal
  const conceptLine = angle ? `"${title}" — angle: ${angle}` : `"${title}"`;

  // Extract meaningful excerpt — strip markdown, use first 300 chars
  const excerpt = content
    .replace(/---SLIDE---/g, " ")
    .replace(/\*\*/g, "")
    .replace(/#+\s/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 300);

  const platformSpec = platform === "instagram"
    ? "Square 1:1 crop (1024×1024), bold impactful composition for Instagram feed, thumb-stopping visual"
    : "Landscape composition, professional tone for LinkedIn feed, clean corporate aesthetic";

  return `Professional branded B2B social media illustration for IntelliX.AI (Brazilian AI consulting).

POST CONCEPT: ${conceptLine}
CONTENT CONTEXT: ${excerpt}

VISUAL STYLE: ${style}
COMPOSITION APPROACH: ${variation}
PLATFORM: ${platformSpec}

BRAND RULES: Dark background (#171723), primary blue (#196FA8) accents, gold (#F2A82A) highlights.
STRICT CONSTRAINTS: Abstract/conceptual only — NO text, NO letters, NO words, NO people, NO faces, NO logos.
Quality: high-end B2B design, premium feel, suitable for a leading AI consulting brand.`;
}

async function generateImage(openaiKey: string, prompt: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: "gpt-image-2", prompt, size: "1024x1024", quality: "medium" }),
  });
  if (!res.ok) {
    console.error(`[image-gen] OpenAI ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json() as { data: Array<{ b64_json: string }> };
  return data.data?.[0]?.b64_json ?? null;
}

async function uploadToStorage(
  db: ReturnType<typeof adminClient>,
  draftId: string,
  index: number,
  b64: string,
): Promise<string | null> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const path = `marketing/${draftId}/gen_${Date.now()}_${index}.png`;
  const { error } = await db.storage.from("assets").upload(path, bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) { console.error("[image-gen] storage upload failed:", error); return null; }

  const { data } = db.storage.from("assets").getPublicUrl(path);
  return data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ey")) return jsonResponse({ error: "unauthorized" }, 401);

  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!openaiKey) return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);

  const body = await req.json().catch(() => ({})) as { draft_id?: string; count?: number };
  const { draft_id, count = 1 } = body;

  if (!draft_id) return jsonResponse({ error: "draft_id required" }, 400);

  const imageCount = Math.min(Math.max(Math.floor(count), 1), 4);

  const db = adminClient();
  const { data: draft, error: fetchErr } = await db
    .from("marketing_drafts")
    .select("id, title, angle, content, pilar, platform")
    .eq("id", draft_id)
    .single();

  if (fetchErr || !draft) return jsonResponse({ error: "draft_not_found" }, 404);

  const { title, angle, content, pilar, platform } = draft as {
    id: string; title: string; angle: string | null;
    content: string; pilar: string; platform: string;
  };

  console.log(`[image-gen] generating ${imageCount} varied image(s) for draft ${draft_id} — pilar=${pilar} platform=${platform}`);

  // Each image gets a unique variation prompt — sequential to ensure distinct variation indices
  const b64Results = await Promise.all(
    Array.from({ length: imageCount }, (_, i) => {
      const prompt = buildImagePrompt(title, angle, content, pilar, platform, i);
      console.log(`[image-gen] variation ${i}: ${VARIATION_BY_INDEX[i]?.split(":")[0]}`);
      return generateImage(openaiKey, prompt).then(b => ({ b, i }));
    })
  );

  const urls: string[] = [];
  for (const { b, i } of b64Results) {
    if (!b) { console.warn(`[image-gen] variation ${i} failed`); continue; }
    const url = await uploadToStorage(db, draft_id, i, b);
    if (url) urls.push(url);
  }

  if (urls.length === 0) return jsonResponse({ error: "all_images_failed" }, 500);

  // Merge with existing generated_images
  const { data: current } = await db
    .from("marketing_drafts")
    .select("generated_images")
    .eq("id", draft_id)
    .single();

  const existing = (current as { generated_images: string[] | null } | null)?.generated_images ?? [];
  const merged = [...existing, ...urls];

  await db
    .from("marketing_drafts")
    .update({ generated_images: merged })
    .eq("id", draft_id);

  console.log(`[image-gen] ✅ ${urls.length}/${imageCount} varied images for ${draft_id}`);
  return jsonResponse({ success: true, urls, total: merged.length });
});

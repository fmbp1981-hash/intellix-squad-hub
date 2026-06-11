// supabase/functions/marketing-publisher/index.ts
// Publishes approved Instagram drafts on their scheduled_for date.
// Phase 1: single-image posts (image_url set, no carousel)
// Phase 2: carousel posts — generates per-slide images via GPT Image 2

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const STYLE_BY_PILAR: Record<string, string> = {
  resultado_ia:     "clean data visualization, modern dark dashboard, teal and indigo tones, infographic layout",
  educacao_pratica: "minimalist educational illustration, soft purple gradient, clean geometric shapes",
  bastidores:       "authentic developer workspace, dark moody lighting, code editor aesthetic",
  posicionamento:   "bold geometric composition, deep purple to midnight blue, strong typographic feel",
  comercial:        "modern SaaS product visual, gradient indigo to violet, professional and confident",
};

// ─── Instagram Graph API helpers ─────────────────────────────────────────────

async function igPost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(`Instagram API error: ${JSON.stringify((data as { error?: unknown }).error)}`);
  return data;
}

async function createSingleContainer(igUserId: string, token: string, imageUrl: string, caption: string): Promise<string> {
  const data = await igPost(`/${igUserId}/media`, { image_url: imageUrl, caption, access_token: token });
  return data.id as string;
}

async function createCarouselItemContainer(igUserId: string, token: string, imageUrl: string): Promise<string> {
  const data = await igPost(`/${igUserId}/media`, { image_url: imageUrl, is_carousel_item: "true", access_token: token });
  return data.id as string;
}

async function createCarouselContainer(igUserId: string, token: string, childIds: string[], caption: string): Promise<string> {
  const data = await igPost(`/${igUserId}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
    access_token: token,
  });
  return data.id as string;
}

async function publishContainer(igUserId: string, token: string, creationId: string): Promise<string> {
  const data = await igPost(`/${igUserId}/media_publish`, { creation_id: creationId, access_token: token });
  return data.id as string;
}

// ─── Slide image generation (GPT Image 2) ────────────────────────────────────

function buildSlideImagePrompt(slideText: string, pilar: string): string {
  const style = STYLE_BY_PILAR[pilar] ?? "modern B2B tech illustration, dark theme, purple accents";
  const headline = slideText.replace(/\*\*/g, "").split("\n")[0]?.slice(0, 120) ?? slideText.slice(0, 120);
  return `Professional branded Instagram carousel slide for IntelliX.AI (AI consulting). Theme: "${headline}". Style: ${style}. Dark background #171723, accents blue #196FA8 and gold #F2A82A. Abstract/conceptual visual — no text, no people. Clean, minimal, high-quality B2B design.`;
}

async function generateAndStoreSlideImage(
  openaiKey: string,
  db: ReturnType<typeof adminClient>,
  draftId: string,
  slideIndex: number,
  slideText: string,
  pilar: string,
): Promise<string | null> {
  try {
    const prompt = buildSlideImagePrompt(slideText, pilar);
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "gpt-image-2", prompt, size: "1024x1024", quality: "low" }),
    });
    if (!res.ok) { console.error(`[publisher] gpt-image-2 ${res.status}`); return null; }

    const data = await res.json() as { data: Array<{ b64_json: string }> };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return null;

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const path = `marketing/${draftId}/slide_${slideIndex}.png`;
    const { error } = await db.storage.from("assets").upload(path, bytes, { contentType: "image/png", upsert: true });
    if (error) { console.error(`[publisher] storage upload failed:`, error); return null; }

    const { data: urlData } = db.storage.from("assets").getPublicUrl(path);
    return urlData.publicUrl;
  } catch (e) {
    console.error(`[publisher] slide ${slideIndex} image generation failed:`, e);
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  // Auth: MARKETING_API_KEY (cron/server) OR Supabase JWT (frontend user)
  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isApiKeyAuth = apiKey && auth === `Bearer ${apiKey}`;
  const isJwtAuth = auth.startsWith("Bearer ey");
  if (!isApiKeyAuth && !isJwtAuth) return jsonResponse({ error: "unauthorized" }, 401);

  const igUserId = Deno.env.get("INSTAGRAM_USER_ID") ?? "";
  const igToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  if (!igUserId || !igToken) return jsonResponse({ error: "INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN not configured" }, 500);

  const body = await req.json().catch(() => ({})) as { draft_id?: string };
  const db = adminClient();
  const today = new Date().toISOString().split("T")[0];

  let query = db
    .from("marketing_drafts")
    .select("id, title, content, platform, image_url, slide_images, content_type, scheduled_for, pilar")
    .eq("status", "approved")
    .eq("platform", "instagram");

  if (body.draft_id) {
    // Single draft publish — ignore scheduled_for check
    query = query.eq("id", body.draft_id);
  } else {
    // Cron mode — publish all approved scheduled for today or past
    query = query.lte("scheduled_for", today).order("scheduled_for", { ascending: true });
  }

  const { data: drafts, error: fetchErr } = await query;

  if (fetchErr) return jsonResponse({ error: "db_error", detail: fetchErr.message }, 500);
  if (!drafts?.length) return jsonResponse({ success: true, published: 0, message: body.draft_id ? "draft not found or not approved" : "no posts scheduled for today" });

  console.log(`[publisher] ${drafts.length} draft(s) to publish for ${today}`);

  const results: Array<{ id: string; status: string; ig_post_id?: string; reason?: string }> = [];

  for (const draft of drafts as Array<{
    id: string; title: string; content: string; platform: string;
    image_url: string | null; slide_images: unknown; content_type: string | null;
    scheduled_for: string; pilar: string;
  }>) {
    try {
      const isCarousel = draft.content.includes("---SLIDE---");
      // Caption: clean markdown + join slides for full-text caption
      const caption = draft.content
        .replace(/---SLIDE---/g, "\n\n")
        .replace(/\*\*/g, "")
        .trim()
        .slice(0, 2200); // Instagram caption limit

      let igPostId: string;

      if (draft.image_url && !isCarousel) {
        // ── Phase 1: Single image post ─────────────────────────────────────
        console.log(`[publisher] Phase 1 — single image: ${draft.title}`);
        const containerId = await createSingleContainer(igUserId, igToken, draft.image_url, caption);
        igPostId = await publishContainer(igUserId, igToken, containerId);

      } else if (isCarousel) {
        // ── Phase 2: Carousel — generate slide images then publish ─────────
        console.log(`[publisher] Phase 2 — carousel: ${draft.title}`);
        const slides = draft.content.split("---SLIDE---").map((s: string) => s.trim()).filter(Boolean);

        // Generate images for all slides in parallel
        const imageUrls = await Promise.all(
          slides.map((text: string, i: number) =>
            generateAndStoreSlideImage(openaiKey, db, draft.id, i, text, draft.pilar)
          )
        );

        const validUrls = imageUrls.filter((u): u is string => u !== null);

        if (validUrls.length < 2) {
          console.error(`[publisher] only ${validUrls.length} images generated for carousel ${draft.id} — need ≥2`);
          results.push({ id: draft.id, status: "skipped", reason: "insufficient_slide_images" });
          continue;
        }

        // Instagram carousel: max 10 slides
        const carouselUrls = validUrls.slice(0, 10);

        const childIds = await Promise.all(
          carouselUrls.map((url: string) => createCarouselItemContainer(igUserId, igToken, url))
        );

        const carouselId = await createCarouselContainer(igUserId, igToken, childIds, caption);
        igPostId = await publishContainer(igUserId, igToken, carouselId);

      } else {
        console.warn(`[publisher] draft ${draft.id} has no image_url and is not a carousel — skipping`);
        results.push({ id: draft.id, status: "skipped", reason: "no_image_no_carousel" });
        continue;
      }

      await db.from("marketing_drafts").update({
        status: "published",
        published_at: new Date().toISOString(),
      }).eq("id", draft.id);

      console.log(`[publisher] ✅ published draft ${draft.id} → IG post ${igPostId}`);
      results.push({ id: draft.id, status: "published", ig_post_id: igPostId });

    } catch (e) {
      console.error(`[publisher] ❌ failed draft ${draft.id}:`, e);
      results.push({ id: draft.id, status: "error", reason: String(e) });
    }
  }

  const published = results.filter(r => r.status === "published").length;
  return jsonResponse({ success: true, published, results });
});

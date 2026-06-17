// supabase/functions/marketing-carousel-render/index.ts
// Calls Playwright service to render carousel slides, uploads to Storage, returns public URLs.
// Note: shared code is inlined — Management API single-file deploy does not resolve relative imports.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

interface SlideInput {
  content: string;
  slideIndex: number;
  totalSlides: number;
  pilar: string;
  title: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  // Auth: MARKETING_API_KEY (internal server-to-server) OR Supabase JWT (frontend)
  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${apiKey}` && !auth.startsWith("Bearer ey")) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const playwrightUrl = Deno.env.get("PLAYWRIGHT_SERVICE_URL") ?? "";
  const playwrightKey = Deno.env.get("PLAYWRIGHT_API_KEY") ?? "";
  if (!playwrightUrl || !playwrightKey) {
    return jsonResponse({ error: "PLAYWRIGHT_SERVICE_URL or PLAYWRIGHT_API_KEY not configured" }, 500);
  }

  const body = await req.json().catch(() => ({})) as {
    draft_id?: string;
    slides?: SlideInput[];
  };

  if (!body.draft_id || !Array.isArray(body.slides) || body.slides.length === 0) {
    return jsonResponse({ error: "draft_id and slides[] required" }, 400);
  }

  const { draft_id, slides } = body;

  console.log(`[carousel-render] rendering ${slides.length} slides for draft=${draft_id}`);

  // Call Playwright service
  let renderRes: Response;
  try {
    renderRes = await fetch(`${playwrightUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": playwrightKey,
      },
      body: JSON.stringify({ slides }),
    });
  } catch (e) {
    console.error("[carousel-render] playwright service unreachable:", e);
    return jsonResponse({ error: "playwright_service_unreachable", detail: String(e) }, 503);
  }

  if (!renderRes.ok) {
    const err = await renderRes.text();
    console.error(`[carousel-render] playwright error ${renderRes.status}:`, err);
    return jsonResponse({ error: "playwright_render_failed", detail: err }, 500);
  }

  const { images } = await renderRes.json() as { success: boolean; images: string[] };

  if (!Array.isArray(images) || images.length === 0) {
    return jsonResponse({ error: "no_images_returned" }, 500);
  }

  // Upload each PNG to Supabase Storage
  const db = adminClient();
  const urls: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const b64 = images[i];
    if (!b64) continue;

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);

    const path = `marketing/${draft_id}/carousel_${i}.png`;
    const { error } = await db.storage.from("assets").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });

    if (error) {
      console.error(`[carousel-render] upload slide ${i} failed:`, error.message);
      continue;
    }

    const { data } = db.storage.from("assets").getPublicUrl(path);
    urls.push(data.publicUrl);
    console.log(`[carousel-render] slide ${i} → ${data.publicUrl}`);
  }

  if (urls.length === 0) {
    return jsonResponse({ error: "all_uploads_failed" }, 500);
  }

  console.log(`[carousel-render] ✅ ${urls.length}/${images.length} slides ready for draft ${draft_id}`);
  return jsonResponse({ success: true, urls });
});

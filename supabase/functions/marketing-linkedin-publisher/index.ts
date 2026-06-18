// marketing-linkedin-publisher v4
// Uses LinkedIn REST API /rest/posts (version 202506) + /rest/images for uploads.
// Author URN must be urn:li:person:{sub} from OpenID Connect userinfo.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LI_VERSION = "202506";
const LI_REST = "https://api.linkedin.com/rest";

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

function liHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": LI_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

async function liPost(
  path: string,
  token: string,
  body: unknown,
): Promise<{ data: Record<string, unknown>; headers: Headers }> {
  const res = await fetch(`${LI_REST}${path}`, {
    method: "POST",
    headers: liHeaders(token),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) as Record<string, unknown> : {};
  if (!res.ok) {
    throw new Error(
      `LinkedIn API ${res.status} on ${path}: ${JSON.stringify(data)}`,
    );
  }
  return { data, headers: res.headers };
}

// ─── Image upload (REST images API) ─────────────────────────────────────────

async function registerImageUpload(
  token: string,
  personUrn: string,
): Promise<{ uploadUrl: string; imageUrn: string }> {
  const { data } = await liPost("/images?action=initializeUpload", token, {
    initializeUploadRequest: { owner: personUrn },
  });
  const value = data.value as Record<string, unknown>;
  return {
    uploadUrl: value.uploadUrl as string,
    imageUrn: value.image as string,
  };
}

async function uploadImageToLinkedIn(
  uploadUrl: string,
  token: string,
  imageUrl: string,
): Promise<void> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status} ${imageUrl}`);
  const buf = await imgRes.arrayBuffer();
  const upRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/png",
    },
    body: buf,
  });
  if (!upRes.ok) {
    const txt = await upRes.text();
    throw new Error(`LinkedIn image PUT failed: ${upRes.status} ${txt}`);
  }
}

// ─── Build post payload ──────────────────────────────────────────────────────

function buildPost(
  personUrn: string,
  text: string,
  imageUrn?: string,
): unknown {
  const payload: Record<string, unknown> = {
    author: personUrn,
    commentary: text.slice(0, 3000),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (imageUrn) {
    payload.content = {
      media: {
        title: "",
        id: imageUrn,
      },
    };
  }

  return payload;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isApiKey = apiKey && auth === `Bearer ${apiKey}`;
  const isJwt = auth.startsWith("Bearer ey");
  if (!isApiKey && !isJwt) return jsonResponse({ error: "unauthorized" }, 401);

  const token = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
  const rawUrn = Deno.env.get("LINKEDIN_PERSON_URN") ?? "";
  // Normalize legacy urn:li:member: → urn:li:person: (REST API uses person)
  const personUrn = rawUrn.replace("urn:li:member:", "urn:li:person:");
  if (!token || !personUrn) {
    return jsonResponse(
      { error: "LINKEDIN_ACCESS_TOKEN / LINKEDIN_PERSON_URN not configured" },
      500,
    );
  }

  const body = await req.json().catch(() => ({})) as { draft_id?: string };
  const db = adminClient();
  const today = new Date().toISOString().split("T")[0];

  let query = db
    .from("marketing_drafts")
    .select("id, title, content, platform, image_url, pilar, scheduled_for")
    .eq("status", "approved")
    .eq("platform", "linkedin");

  if (body.draft_id) {
    query = query.eq("id", body.draft_id);
  } else {
    query = query
      .lte("scheduled_for", today)
      .order("scheduled_for", { ascending: true });
  }

  const { data: drafts, error: fetchErr } = await query;
  if (fetchErr) return jsonResponse({ error: "db_error", detail: fetchErr.message }, 500);
  if (!drafts?.length) {
    return jsonResponse({
      success: true,
      published: 0,
      message: body.draft_id
        ? "draft not found or not approved"
        : "no linkedin posts scheduled for today",
    });
  }

  console.log(`[linkedin-publisher] ${drafts.length} draft(s) for ${today}`);

  const results: Array<{
    id: string;
    status: string;
    linkedin_post_id?: string;
    reason?: string;
  }> = [];

  for (const draft of drafts as Array<{
    id: string;
    title: string;
    content: string;
    platform: string;
    image_url: string | null;
    pilar: string;
    scheduled_for: string;
  }>) {
    try {
      // Extract LEGENDA LINKEDIN section if present (generated content format)
      // Falls back to stripping slide markers for legacy drafts
      const legendaMatch = draft.content.match(
        /##\s*LEGENDA LINKEDIN\s*\n+([\s\S]+?)(?:\n---+\s*$|\n##\s|$)/i
      );
      const text = legendaMatch
        ? legendaMatch[1].trim()
        : draft.content
            .replace(/---SLIDE---/g, "\n\n")
            .replace(/\*\*/g, "")
            .trim();

      let imageUrn: string | undefined;
      if (draft.image_url) {
        console.log(`[linkedin-publisher] Uploading image for ${draft.id}`);
        const { uploadUrl, imageUrn: urn } = await registerImageUpload(token, personUrn);
        await uploadImageToLinkedIn(uploadUrl, token, draft.image_url);
        imageUrn = urn;
        console.log(`[linkedin-publisher] Image → ${imageUrn}`);
      }

      const postPayload = buildPost(personUrn, text, imageUrn);
      const { data: postData, headers: postHeaders } = await liPost("/posts", token, postPayload);

      // REST /posts returns post URN in X-RestLi-Id header (201 response)
      const linkedinPostId =
        (postHeaders.get("x-restli-id") ?? postHeaders.get("X-RestLi-Id") ?? postData.id ?? "") as string;

      await db
        .from("marketing_drafts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          linkedin_post_id: linkedinPostId,
        })
        .eq("id", draft.id);

      // Fire-and-forget Drive backup
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      fetch(`${supabaseUrl}/functions/v1/marketing-drive-backup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          draft_id: draft.id,
          single_image_url: draft.image_url ?? undefined,
        }),
      }).catch((e) =>
        console.error("[linkedin-publisher] drive-backup fire error:", e)
      );

      console.log(`[linkedin-publisher] ✅ ${draft.id} → ${linkedinPostId}`);
      results.push({ id: draft.id, status: "published", linkedin_post_id: linkedinPostId });
    } catch (e) {
      console.error(`[linkedin-publisher] ❌ ${draft.id}:`, e);
      results.push({ id: draft.id, status: "error", reason: String(e) });
    }
  }

  const published = results.filter((r) => r.status === "published").length;
  return jsonResponse({ success: true, published, results });
});

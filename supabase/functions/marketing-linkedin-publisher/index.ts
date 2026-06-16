// marketing-linkedin-publisher
// Publishes approved LinkedIn drafts via ugcPosts API v2.
// Supports single-image posts with asset upload via LinkedIn Assets API.

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

const LINKEDIN_API = "https://api.linkedin.com/v2";

// ─── LinkedIn API helpers ────────────────────────────────────────────────────

async function liPost(
  path: string,
  token: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${LINKEDIN_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `LinkedIn API ${res.status} on ${path}: ${JSON.stringify(data)}`,
    );
  }
  return data;
}

async function registerImageUpload(
  token: string,
  personUrn: string,
): Promise<{ uploadUrl: string; asset: string }> {
  const data = await liPost("/assets?action=registerUpload", token, {
    registerUploadRequest: {
      owner: personUrn,
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      serviceRelationships: [
        {
          identifier: "urn:li:userGeneratedContent",
          relationshipType: "OWNER",
        },
      ],
    },
  });
  const value = data.value as Record<string, unknown>;
  const mechanism = (
    value.uploadMechanism as Record<string, unknown>
  )["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"] as Record<string, unknown>;
  return { uploadUrl: mechanism.uploadUrl as string, asset: value.asset as string };
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
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
    body: buf,
  });
  if (!upRes.ok) {
    const txt = await upRes.text();
    throw new Error(`LinkedIn image PUT failed: ${upRes.status} ${txt}`);
  }
}

function buildUgcPost(
  personUrn: string,
  text: string,
  imageAsset?: string,
): unknown {
  return {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: text.slice(0, 3000) },
        shareMediaCategory: imageAsset ? "IMAGE" : "NONE",
        ...(imageAsset
          ? {
              media: [
                {
                  status: "READY",
                  description: { text: "" },
                  media: imageAsset,
                  title: { text: "" },
                },
              ],
            }
          : {}),
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };
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
  const personUrn = Deno.env.get("LINKEDIN_PERSON_URN");
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
      const text = draft.content
        .replace(/---SLIDE---/g, "\n\n")
        .replace(/\*\*/g, "")
        .trim();

      let imageAsset: string | undefined;
      if (draft.image_url) {
        console.log(`[linkedin-publisher] Uploading image for ${draft.id}`);
        const { uploadUrl, asset } = await registerImageUpload(token, personUrn);
        await uploadImageToLinkedIn(uploadUrl, token, draft.image_url);
        imageAsset = asset;
        console.log(`[linkedin-publisher] Image → ${asset}`);
      }

      const ugcPost = buildUgcPost(personUrn, text, imageAsset);
      const postData = await liPost("/ugcPosts", token, ugcPost);
      const linkedinPostId = postData.id as string;

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

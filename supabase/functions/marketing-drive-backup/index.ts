// marketing-drive-backup
// Backs up a published post to Google Drive via the Lovable Gateway.
// Creates a subfolder per post under ROOT_FOLDER with formal naming,
// then uploads: _metadata.json, _post.txt, and slide PNGs or _imagem.png.

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

const DRIVE_META   = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const DRIVE_UPLOAD = "https://connector-gateway.lovable.dev/google_drive/upload/drive/v3";
const ROOT_FOLDER  = "175K1IwARKVWL6dyW4EQEpLzp7i_z2bQy";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function buildPrefix(draft: {
  published_at: string | null;
  pilar: string;
  platform: string;
  title: string;
}): string {
  const date = new Date(draft.published_at ?? new Date().toISOString());
  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toISOString().slice(11, 16).replace(":", "-");
  return `${datePart}_${timePart}_${slugify(draft.pilar)}_${draft.platform.toLowerCase()}_${slugify(draft.title)}`;
}

async function driveRequest(
  baseUrl: string,
  path: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

async function createDriveFolder(name: string, parentId: string, apiKey: string): Promise<string> {
  const res = await driveRequest(DRIVE_META, "/files?fields=id", apiKey, {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive createFolder failed: ${res.status} ${err}`);
  }
  const data = await res.json() as { id: string };
  return data.id;
}

async function uploadFileToDrive(
  filename: string,
  folderId: string,
  content: string | Uint8Array,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const boundary = `bkp_${crypto.randomUUID().replace(/-/g, "")}`;
  const meta = JSON.stringify({ name: filename, parents: [folderId] });
  const enc = new TextEncoder();

  let bodyBytes: Uint8Array;

  if (typeof content === "string") {
    bodyBytes = enc.encode(
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n${content}\r\n` +
      `--${boundary}--`,
    );
  } else {
    const header = enc.encode(
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`,
    );
    const footer = enc.encode(`\r\n--${boundary}--`);
    bodyBytes = new Uint8Array(header.length + content.length + footer.length);
    bodyBytes.set(header, 0);
    bodyBytes.set(content, header.length);
    bodyBytes.set(footer, header.length + content.length);
  }

  const uploadHeaders = new Headers({
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": `multipart/related; boundary=${boundary}`,
  });
  const res = await fetch(
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`,
    { method: "POST", headers: uploadHeaders, body: bodyBytes },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload '${filename}' failed: ${res.status} ${err}`);
  }
  const data = await res.json() as { id: string };
  return data.id;
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

  const driveKey = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("GOOGLE_DRIVE_API_KEY") ?? "";
  if (!driveKey) return jsonResponse({ error: "LOVABLE_API_KEY not configured" }, 500);

  const body = await req.json().catch(() => ({})) as {
    draft_id?: string;
    rendered_slide_urls?: string[];
    single_image_url?: string;
  };
  if (!body.draft_id) return jsonResponse({ error: "draft_id required" }, 400);

  const db = adminClient();
  const { data: draft, error: fetchErr } = await db
    .from("marketing_drafts")
    .select(
      "id, title, content, platform, image_url, pilar, published_at, content_type, angle, research_snippets, linkedin_post_id, instagram_post_id",
    )
    .eq("id", body.draft_id)
    .single();

  if (fetchErr || !draft) {
    return jsonResponse({ error: "draft not found", detail: fetchErr?.message }, 404);
  }

  const d = draft as Record<string, unknown>;
  const prefix = buildPrefix({
    published_at: d.published_at as string | null,
    pilar: d.pilar as string,
    platform: d.platform as string,
    title: d.title as string,
  });

  console.log(`[drive-backup] Starting backup ${d.id} → "${prefix}"`);

  try {
    // 1. Criar subpasta
    const folderId = await createDriveFolder(prefix, ROOT_FOLDER, driveKey);
    console.log(`[drive-backup] Folder created: ${folderId}`);

    // 2. Metadata JSON
    const metadata = {
      id: d.id,
      title: d.title,
      pilar: d.pilar,
      platform: d.platform,
      content_type: d.content_type ?? null,
      angle: d.angle ?? null,
      published_at: d.published_at ?? null,
      instagram_post_id: d.instagram_post_id ?? null,
      linkedin_post_id: d.linkedin_post_id ?? null,
      research_snippets: d.research_snippets ?? null,
      backup_at: new Date().toISOString(),
    };
    await uploadFileToDrive(
      `${prefix}_metadata.json`,
      folderId,
      JSON.stringify(metadata, null, 2),
      "application/json",
      driveKey,
    );
    console.log(`[drive-backup] Uploaded metadata.json`);

    // 3. Post text
    const cleanText = (d.content as string)
      .replace(/---SLIDE---/g, "\n\n---[ PRÓXIMO SLIDE ]---\n\n")
      .trim();
    await uploadFileToDrive(
      `${prefix}_post.txt`,
      folderId,
      cleanText,
      "text/plain",
      driveKey,
    );
    console.log(`[drive-backup] Uploaded post.txt`);

    // 4. Slides ou imagem única
    const slideUrls = body.rendered_slide_urls ?? [];
    if (slideUrls.length > 0) {
      for (let i = 0; i < slideUrls.length; i++) {
        try {
          const imgRes = await fetch(slideUrls[i]);
          if (!imgRes.ok) {
            console.warn(`[drive-backup] Slide ${i + 1} fetch failed: ${imgRes.status}`);
            continue;
          }
          const buf = new Uint8Array(await imgRes.arrayBuffer());
          const slideNum = String(i + 1).padStart(2, "0");
          await uploadFileToDrive(
            `${prefix}_slide-${slideNum}.png`,
            folderId,
            buf,
            "image/png",
            driveKey,
          );
          console.log(`[drive-backup] Uploaded slide-${slideNum}.png`);
        } catch (e) {
          console.error(`[drive-backup] Slide ${i + 1} upload error:`, e);
        }
      }
    } else {
      const imgUrl = body.single_image_url ?? (d.image_url as string | null);
      if (imgUrl) {
        try {
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const buf = new Uint8Array(await imgRes.arrayBuffer());
            await uploadFileToDrive(
              `${prefix}_imagem.png`,
              folderId,
              buf,
              "image/png",
              driveKey,
            );
            console.log(`[drive-backup] Uploaded imagem.png`);
          }
        } catch (e) {
          console.error(`[drive-backup] Image upload error:`, e);
        }
      }
    }

    // 5. Salvar referência no DB
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
    await db
      .from("marketing_drafts")
      .update({ drive_backup_url: folderUrl, drive_backup_id: folderId })
      .eq("id", d.id as string);

    console.log(`[drive-backup] ✅ Complete: ${folderUrl}`);
    return jsonResponse({ success: true, folder_id: folderId, folder_url: folderUrl, prefix });
  } catch (e) {
    console.error(`[drive-backup] ❌ Failed ${d.id}:`, e);
    return jsonResponse({ error: "backup_failed", detail: String(e) }, 500);
  }
});

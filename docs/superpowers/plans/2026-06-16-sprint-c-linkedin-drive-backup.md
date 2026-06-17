# Sprint C — LinkedIn Publisher + Google Drive Backup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar posts aprovados no LinkedIn via `ugcPosts` API e fazer backup automático de todo post publicado (texto + imagens) no Google Drive com nomes de arquivo descritivos e formais.

**Architecture:** Duas novas edge functions (`marketing-linkedin-publisher` e `marketing-drive-backup`) isoladas por responsabilidade. O `marketing-publisher` existente (Instagram) ganha salvamento de `instagram_post_id` e disparo fire-and-forget do Drive backup — passando os slide URLs já renderizados pelo Playwright para evitar re-render. O `marketing-linkedin-publisher` faz o mesmo após publicar no LinkedIn. O `marketing-drive-backup` cria uma subpasta por post dentro da pasta raiz `175K1IwARKVWL6dyW4EQEpLzp7i_z2bQy`, com nomenclatura `YYYY-MM-DD_HH-MM_[pilar]_[plataforma]_[titulo-slug]`, e faz upload de `_metadata.json`, `_post.txt` e `_slide-NN.png` / `_imagem.png`.

**Tech Stack:** Deno + TypeScript strict, LinkedIn REST API v2 (`ugcPosts` + `assets`), Google Drive API v3 via Lovable Gateway (`connector-gateway.lovable.dev/google_drive`), Supabase Edge Functions, Supabase Management API (deploy via curl — CLI com problema de Docker neste ambiente).

**Credenciais LinkedIn:**
- `LINKEDIN_ACCESS_TOKEN` — token OAuth2, escopos `w_member_social`
- `LINKEDIN_PERSON_URN` — `urn:li:person:140900396`
- Expira: ~agosto/2026

**Folder Drive raiz:** `175K1IwARKVWL6dyW4EQEpLzp7i_z2bQy`

**Supabase project ref:** `hynadwlwrscvjubryqlg`
**PAT:** `[SUPABASE_PAT_REDACTED]`

---

## Mapa de Arquivos

### Criados
| Arquivo | Responsabilidade |
|---------|-----------------|
| `supabase/migrations/20260616_marketing_linkedin_drive_columns.sql` | Adiciona `instagram_post_id`, `linkedin_post_id`, `drive_backup_url`, `drive_backup_id` a `marketing_drafts` |
| `supabase/functions/marketing-linkedin-publisher/index.ts` | Publica posts `platform=linkedin` via LinkedIn ugcPosts API, com upload de imagem via Assets API |
| `supabase/functions/marketing-drive-backup/index.ts` | Backup de post publicado no Google Drive — pasta por post, metadata.json + post.txt + slides/imagem |

### Modificados
| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/marketing-publisher/index.ts` | Salva `instagram_post_id` no DB + dispara `marketing-drive-backup` com `rendered_slide_urls` |

---

## Task 1: DB Migration — Novas colunas em `marketing_drafts`

**Files:**
- Create: `supabase/migrations/20260616_marketing_linkedin_drive_columns.sql`

- [ ] **Step 1.1: Criar arquivo de migration**

```sql
-- supabase/migrations/20260616_marketing_linkedin_drive_columns.sql
-- Sprint C: rastreamento de publicação LinkedIn + backup Google Drive

ALTER TABLE marketing_drafts
  ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_post_id  TEXT,
  ADD COLUMN IF NOT EXISTS drive_backup_url  TEXT,
  ADD COLUMN IF NOT EXISTS drive_backup_id   TEXT;

COMMENT ON COLUMN marketing_drafts.instagram_post_id IS 'ID do media publicado no Instagram Graph API';
COMMENT ON COLUMN marketing_drafts.linkedin_post_id  IS 'URN do ugcPost publicado no LinkedIn (ex: urn:li:ugcPost:123)';
COMMENT ON COLUMN marketing_drafts.drive_backup_url  IS 'URL da pasta do Google Drive com o backup deste post';
COMMENT ON COLUMN marketing_drafts.drive_backup_id   IS 'ID da pasta do Google Drive com o backup deste post';
```

- [ ] **Step 1.2: Aplicar migration via Management API**

```powershell
$PAT = "[SUPABASE_PAT_REDACTED]"
$REF = "hynadwlwrscvjubryqlg"
$SQL = Get-Content "supabase/migrations/20260616_marketing_linkedin_drive_columns.sql" -Raw

$body = @{ query = $SQL } | ConvertTo-Json
Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/$REF/database/query" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $body
```

Resultado esperado: sem erro, array vazio `[]` ou confirmação de sucesso.

- [ ] **Step 1.3: Verificar colunas no banco**

```powershell
$body = @{ query = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'marketing_drafts' AND column_name IN ('instagram_post_id','linkedin_post_id','drive_backup_url','drive_backup_id') ORDER BY column_name;" } | ConvertTo-Json
Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $body
```

Resultado esperado: 4 linhas com `data_type = text`.

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260616_marketing_linkedin_drive_columns.sql
git commit -m "feat(marketing): add linkedin_post_id, instagram_post_id and drive_backup columns"
```

---

## Task 2: Edge Function `marketing-linkedin-publisher`

**Files:**
- Create: `supabase/functions/marketing-linkedin-publisher/index.ts`

**Fluxo:**
1. Auth via `MARKETING_API_KEY` (cron) ou JWT (frontend)
2. Query `marketing_drafts` onde `platform = 'linkedin' AND status = 'approved'`
3. Se `draft_id` passado: publicar só esse; senão: todos com `scheduled_for ≤ hoje`
4. Para cada draft: texto limpo → upload de imagem (se `image_url`) via Assets API → ugcPost → salvar `linkedin_post_id` + `status=published` → fire-and-forget Drive backup

**LinkedIn API — detalhes:**
- Base: `https://api.linkedin.com/v2`
- Header obrigatório: `X-Restli-Protocol-Version: 2.0.0`
- **NÃO** usar `LinkedIn-Version` header em endpoints v2 (ugcPosts/assets são API clássica)
- Upload de imagem: POST `/assets?action=registerUpload` → PUT uploadUrl → usar asset URN no ugcPosts
- Publicar: POST `/ugcPosts`
- Limite de texto: 3000 caracteres

- [ ] **Step 2.1: Criar `supabase/functions/marketing-linkedin-publisher/index.ts`**

```typescript
// supabase/functions/marketing-linkedin-publisher/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

const LINKEDIN_API = "https://api.linkedin.com/v2";

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
  )["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"] as Record<
    string,
    unknown
  >;
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
    return jsonResponse({ error: "LINKEDIN_ACCESS_TOKEN / LINKEDIN_PERSON_URN not configured" }, 500);
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
```

- [ ] **Step 2.2: Commit**

```bash
git add supabase/functions/marketing-linkedin-publisher/index.ts
git commit -m "feat(marketing): add marketing-linkedin-publisher edge function"
```

---

## Task 3: Edge Function `marketing-drive-backup`

**Files:**
- Create: `supabase/functions/marketing-drive-backup/index.ts`

**Fluxo:**
1. Recebe `{ draft_id, rendered_slide_urls?: string[], single_image_url?: string }`
2. Busca draft no DB
3. Gera `prefix` = `YYYY-MM-DD_HH-MM_[pilar]_[platform]_[titulo-slug]`
4. Cria subpasta no Drive (dentro de `175K1IwARKVWL6dyW4EQEpLzp7i_z2bQy`)
5. Faz upload de `{prefix}_metadata.json` + `{prefix}_post.txt`
6. Se `rendered_slide_urls`: faz download de cada PNG do Supabase Storage e upload como `{prefix}_slide-01.png`, etc.
7. Se `single_image_url`: idem para `{prefix}_imagem.png`
8. Salva `drive_backup_url` e `drive_backup_id` no draft

**Naming de arquivos no Drive:**
- Pasta: `2026-06-16_14-30_resultado-ia_instagram_como-ia-aumenta-conversao`
- Dentro: `2026-06-16_14-30_..._metadata.json` | `..._post.txt` | `..._slide-01.png` | `..._slide-02.png`
- LinkedIn single: `..._imagem.png`

**Google Drive via Lovable Gateway:**
- Base metadados: `https://connector-gateway.lovable.dev/google_drive/drive/v3`
- Base upload: `https://connector-gateway.lovable.dev/google_drive/upload/drive/v3`
- Auth: `Authorization: Bearer ${GOOGLE_DRIVE_API_KEY}`

- [ ] **Step 3.1: Criar `supabase/functions/marketing-drive-backup/index.ts`**

```typescript
// supabase/functions/marketing-drive-backup/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

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

async function driveGet(
  path: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${DRIVE_META}${path}`, { ...init, headers });
}

async function createDriveFolder(name: string, parentId: string, apiKey: string): Promise<string> {
  const res = await driveGet("/files?fields=id", apiKey, {
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
  const boundary = `iq_bkp_${crypto.randomUUID().replace(/-/g, "")}`;
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

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isApiKey = apiKey && auth === `Bearer ${apiKey}`;
  const isJwt = auth.startsWith("Bearer ey");
  if (!isApiKey && !isJwt) return jsonResponse({ error: "unauthorized" }, 401);

  const driveKey = Deno.env.get("GOOGLE_DRIVE_API_KEY") ?? "";
  if (!driveKey) return jsonResponse({ error: "GOOGLE_DRIVE_API_KEY not configured" }, 500);

  const body = await req.json().catch(() => ({})) as {
    draft_id?: string;
    rendered_slide_urls?: string[];
    single_image_url?: string;
  };
  if (!body.draft_id) return jsonResponse({ error: "draft_id required" }, 400);

  const db = adminClient();
  const { data: draft, error: fetchErr } = await db
    .from("marketing_drafts")
    .select("id, title, content, platform, image_url, pilar, published_at, content_type, angle, research_snippets, linkedin_post_id, instagram_post_id")
    .eq("id", body.draft_id)
    .single();

  if (fetchErr || !draft) return jsonResponse({ error: "draft not found", detail: fetchErr?.message }, 404);

  const prefix = buildPrefix(draft as {
    published_at: string | null;
    pilar: string;
    platform: string;
    title: string;
  });

  console.log(`[drive-backup] Starting backup ${draft.id} → "${prefix}"`);

  try {
    // 1. Criar subpasta
    const folderId = await createDriveFolder(prefix, ROOT_FOLDER, driveKey);
    console.log(`[drive-backup] Folder created: ${folderId}`);

    // 2. Metadata JSON
    const metadata = {
      id: draft.id,
      title: (draft as Record<string, unknown>).title,
      pilar: (draft as Record<string, unknown>).pilar,
      platform: (draft as Record<string, unknown>).platform,
      content_type: (draft as Record<string, unknown>).content_type,
      angle: (draft as Record<string, unknown>).angle,
      published_at: (draft as Record<string, unknown>).published_at,
      instagram_post_id: (draft as Record<string, unknown>).instagram_post_id ?? null,
      linkedin_post_id: (draft as Record<string, unknown>).linkedin_post_id ?? null,
      research_snippets: (draft as Record<string, unknown>).research_snippets ?? null,
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
    const cleanText = ((draft as Record<string, unknown>).content as string)
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
      const imgUrl = body.single_image_url ?? ((draft as Record<string, unknown>).image_url as string | null);
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

    // 5. Salvar no DB
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
    await db
      .from("marketing_drafts")
      .update({ drive_backup_url: folderUrl, drive_backup_id: folderId })
      .eq("id", draft.id);

    console.log(`[drive-backup] ✅ Complete: ${folderUrl}`);
    return jsonResponse({ success: true, folder_id: folderId, folder_url: folderUrl, prefix });

  } catch (e) {
    console.error(`[drive-backup] ❌ Failed ${draft.id}:`, e);
    return jsonResponse({ error: "backup_failed", detail: String(e) }, 500);
  }
});
```

- [ ] **Step 3.2: Commit**

```bash
git add supabase/functions/marketing-drive-backup/index.ts
git commit -m "feat(marketing): add marketing-drive-backup edge function with Drive multipart upload"
```

---

## Task 4: Atualizar `marketing-publisher` (Instagram)

**Files:**
- Modify: `supabase/functions/marketing-publisher/index.ts`

**Mudanças:**
1. Na linha do `.update({ status: "published", published_at: ... })` → adicionar `instagram_post_id: igPostId`
2. Após o update bem-sucedido (Phase 1 e Phase 2) → disparar `marketing-drive-backup` fire-and-forget com `draft_id` + URLs corretas

- [ ] **Step 4.1: Editar `marketing-publisher` — salvar `instagram_post_id` + fire Drive backup**

Substituir o bloco final do loop `try` (após o último `await publishContainer`) até o `console.log("✅ published")`:

**Localizar** a linha atual:
```typescript
      await db.from("marketing_drafts").update({
        status: "published",
        published_at: new Date().toISOString(),
      }).eq("id", draft.id);

      console.log(`[publisher] ✅ published draft ${draft.id} → IG post ${igPostId}`);
      results.push({ id: draft.id, status: "published", ig_post_id: igPostId });
```

**Substituir por:**
```typescript
      await db.from("marketing_drafts").update({
        status: "published",
        published_at: new Date().toISOString(),
        instagram_post_id: igPostId,
      }).eq("id", draft.id);

      // Fire-and-forget Drive backup
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const backupBody: { draft_id: string; rendered_slide_urls?: string[]; single_image_url?: string } = {
        draft_id: draft.id,
      };
      if (isCarousel && carouselUrls) {
        backupBody.rendered_slide_urls = carouselUrls as string[];
      } else if (draft.image_url) {
        backupBody.single_image_url = draft.image_url;
      }
      fetch(`${supabaseUrl}/functions/v1/marketing-drive-backup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(backupBody),
      }).catch((e) =>
        console.error("[publisher] drive-backup fire error:", e)
      );

      console.log(`[publisher] ✅ published draft ${draft.id} → IG post ${igPostId}`);
      results.push({ id: draft.id, status: "published", ig_post_id: igPostId });
```

**ATENÇÃO:** Para que `carouselUrls` seja acessível no bloco de fire-backup, a variável precisa estar declarada fora do `if (isCarousel)`. Ajuste o início do bloco do carousel:

**Localizar:**
```typescript
      let igPostId: string;

      if (draft.image_url && !isCarousel) {
```

**Substituir por:**
```typescript
      let igPostId: string;
      let carouselUrls: string[] | undefined;

      if (draft.image_url && !isCarousel) {
```

E dentro do bloco `else if (isCarousel)`, localizar:
```typescript
        const carouselUrls = validUrls.slice(0, 10);
```

**Substituir por:**
```typescript
        carouselUrls = validUrls.slice(0, 10);
```

- [ ] **Step 4.2: Verificar o arquivo completo modificado**

Abrir `supabase/functions/marketing-publisher/index.ts` e confirmar:
- `let carouselUrls: string[] | undefined;` declarado antes do `if (draft.image_url && !isCarousel)`
- `carouselUrls = validUrls.slice(0, 10);` (sem `const`)
- `instagram_post_id: igPostId` dentro do `.update({...})`
- `fetch(...marketing-drive-backup...)` presente antes do `console.log("✅")`

- [ ] **Step 4.3: Commit**

```bash
git add supabase/functions/marketing-publisher/index.ts
git commit -m "feat(marketing): save instagram_post_id and trigger drive-backup after publish"
```

---

## Task 5: Configurar Secrets no Supabase + Deploy + Smoke Test

**Files:** Nenhum arquivo de código — operações via Supabase Management API.

- [ ] **Step 5.1: Adicionar secrets LinkedIn via Management API**

```powershell
$PAT = "[SUPABASE_PAT_REDACTED]"
$REF = "hynadwlwrscvjubryqlg"

# LINKEDIN_ACCESS_TOKEN
$body = '[{"name":"LINKEDIN_ACCESS_TOKEN","value":"AQXoChR7rdT_dCZv0kwBJvA_izSL6CrzVpKtqXFATKR7oBx6Ew5zK6XFBzZD9HX425b9ApfbJgerNRZt0OIuub4QTweBRlMZc90NOKQxOhFMPdBmvpD25u-yXGm6nqT6rPtrhZLTnYGXhFGd53JLDBHuqje7Bs9q0W0hygKEMylBWJiG8FaVfBHtgAQ-X92rV1H_QPmvWQ1YUPq7Cf7B28pNiwyxy2cr6LH-WdYyOGpGnC3EqPO3S4wo3sEvp7ORgMDml440dyPWmETGfMzZRBV3V9R8lAbeeLBKcwX3Bae13MRO8FJG8rgiWtharAlfhrxflk5CO7a-Cymu1tMUXEpJ0YVdMA"}]'
Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/$REF/secrets" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $body

# LINKEDIN_PERSON_URN
$body2 = '[{"name":"LINKEDIN_PERSON_URN","value":"urn:li:person:140900396"}]'
Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/$REF/secrets" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $body2
```

Resultado esperado: `204 No Content` ou `200` em ambas as chamadas.

- [ ] **Step 5.2: Verificar se GOOGLE_DRIVE_API_KEY já está configurado**

```powershell
Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/secrets" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $PAT" }
```

Resultado esperado: lista contendo `GOOGLE_DRIVE_API_KEY`. Se não estiver, o usuário precisa inserir o valor via Supabase Dashboard → Project Settings → Edge Functions → Secrets.

- [ ] **Step 5.3: Deploy `marketing-linkedin-publisher` via Management API**

```powershell
$code = Get-Content "supabase/functions/marketing-linkedin-publisher/index.ts" -Raw

$deployBody = @{
  slug        = "marketing-linkedin-publisher"
  name        = "marketing-linkedin-publisher"
  body        = $code
  verify_jwt  = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $deployBody
```

Se função já existir → usar PATCH:
```powershell
Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions/marketing-linkedin-publisher" `
  -Method PATCH `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $deployBody
```

- [ ] **Step 5.4: Deploy `marketing-drive-backup` via Management API**

```powershell
$code2 = Get-Content "supabase/functions/marketing-drive-backup/index.ts" -Raw

$deployBody2 = @{
  slug        = "marketing-drive-backup"
  name        = "marketing-drive-backup"
  body        = $code2
  verify_jwt  = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $deployBody2
```

- [ ] **Step 5.5: Re-deploy `marketing-publisher` (atualizado)**

```powershell
# Incluir shared utils inline pois o deploy via API não resolve imports relativos
$shared_cors = Get-Content "supabase/functions/_shared/cors.ts" -Raw
$shared_auth = Get-Content "supabase/functions/_shared/auth.ts" -Raw
$publisher   = Get-Content "supabase/functions/marketing-publisher/index.ts" -Raw

# Substituir imports relativos por código inline
$inline = $publisher `
  -replace 'import \{ corsHeaders, jsonResponse \} from "\.\./\_shared/cors\.ts";', $shared_cors `
  -replace 'import \{ adminClient \} from "\.\./\_shared/auth\.ts";', $shared_auth

$deployBody3 = @{
  slug        = "marketing-publisher"
  name        = "marketing-publisher"
  body        = $inline
  verify_jwt  = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions/marketing-publisher" `
  -Method PATCH `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $deployBody3
```

- [ ] **Step 5.6: Smoke test `marketing-linkedin-publisher` — dry run (sem draft real)**

```powershell
$SUPABASE_URL = "https://hynadwlwrscvjubryqlg.supabase.co"
$MARKETING_KEY = (Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/secrets" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $PAT" }) | Where-Object { $_.name -eq "MARKETING_API_KEY" } | Select-Object -ExpandProperty value

Invoke-RestMethod `
  -Uri "$SUPABASE_URL/functions/v1/marketing-linkedin-publisher" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $MARKETING_KEY"; "Content-Type" = "application/json" } `
  -Body '{}' 
```

Resultado esperado: `{ "success": true, "published": 0, "message": "no linkedin posts scheduled for today" }`

Se retornar `401` → secret `MARKETING_API_KEY` não encontrado (verificar Step 5.2).
Se retornar `500 LINKEDIN_ACCESS_TOKEN not configured` → aguardar propagação dos secrets (~30s) e tentar novamente.

- [ ] **Step 5.7: Smoke test `marketing-drive-backup` com draft publicado real**

Buscar um draft que já tenha `status = 'published'`:
```powershell
$body = @{ query = "SELECT id, title, platform, pilar, published_at FROM marketing_drafts WHERE status = 'published' ORDER BY published_at DESC LIMIT 1;" } | ConvertTo-Json
$result = Invoke-RestMethod `
  -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $PAT"; "Content-Type" = "application/json" } `
  -Body $body
$result
```

Copiar o `id` retornado e usar:
```powershell
$draftId = "COLE_O_ID_AQUI"
Invoke-RestMethod `
  -Uri "$SUPABASE_URL/functions/v1/marketing-drive-backup" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $MARKETING_KEY"; "Content-Type" = "application/json" } `
  -Body (@{ draft_id = $draftId } | ConvertTo-Json)
```

Resultado esperado:
```json
{
  "success": true,
  "folder_id": "1xxxxxxxx...",
  "folder_url": "https://drive.google.com/drive/folders/1xxxxxxxx",
  "prefix": "2026-06-16_HH-MM_pilar_platform_titulo-slug"
}
```

Verificar no Drive que a pasta foi criada dentro de `175K1IwARKVWL6dyW4EQEpLzp7i_z2bQy`.

- [ ] **Step 5.8: Push e commit final**

```bash
git push origin master
git push origin master:main
```

---

## Self-Review

**Spec coverage:**
- ✅ LinkedIn publisher via `ugcPosts` API — Task 2
- ✅ Upload de imagem LinkedIn via Assets API — Task 2 (`registerImageUpload` + `uploadImageToLinkedIn`)
- ✅ Drive backup automático após Instagram — Task 4 (fire-and-forget em `marketing-publisher`)
- ✅ Drive backup automático após LinkedIn — Task 2 (fire-and-forget em `marketing-linkedin-publisher`)
- ✅ Nomes formais e descritivos de arquivo — Task 3 (`buildPrefix` → `YYYY-MM-DD_HH-MM_pilar_platform_titulo`)
- ✅ Subpasta por post — Task 3 (`createDriveFolder` com `prefix` como nome)
- ✅ metadata.json + post.txt + slides — Task 3
- ✅ Salvar `linkedin_post_id` / `instagram_post_id` no DB — Tasks 1, 2, 4
- ✅ Secrets configurados — Task 5

**Gaps identificados e resolvidos:**
- `carouselUrls` precisa ser `let` fora do `if (isCarousel)` no publisher — documentado em Task 4
- Deploy via API requer inlining dos `_shared` imports para `marketing-publisher` — documentado em Step 5.5
- `GOOGLE_DRIVE_API_KEY` pode já estar configurado (drive-setup existente) — verificação em Step 5.2

**Placeholder scan:** Nenhum TBD/TODO encontrado. Todos os steps têm código completo.

**Type consistency:** `buildPrefix` recebe `{ published_at, pilar, platform, title }` e é chamado com cast explícito em ambas as funções. `carouselUrls: string[] | undefined` declarado como `let` antes do `if/else`.

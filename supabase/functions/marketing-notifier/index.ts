// marketing-notifier — sends WhatsApp approval request for a generated draft
// Called automatically after content + image are ready

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { sendWhatsApp } from "../_shared/whatsapp-provider.ts";

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: "📸",
  linkedin: "💼",
  whatsapp: "💬",
};

const PILAR_LABEL: Record<string, string> = {
  resultado_ia: "Resultado IA",
  educacao_pratica: "Educação",
  bastidores: "Bastidores",
  posicionamento: "Posicionamento",
  comercial: "Comercial",
};

function buildApprovalToken(draftId: string, action: string, secret: string): string {
  // Simple token: base64(draftId|action|secret_hash)
  const raw = `${draftId}|${action}|${secret}`;
  return btoa(raw).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function buildApprovalUrl(baseUrl: string, draftId: string, action: string, token: string): string {
  return `${baseUrl}/functions/v1/marketing-approval?id=${draftId}&action=${action}&token=${encodeURIComponent(token)}`;
}

function excerpt(content: string, maxChars = 280): string {
  const clean = content
    .replace(/^---SLIDE---\s*/m, "")   // remove leading ---SLIDE--- if LLM added it
    .replace(/---SLIDE---/g, "\n\n")   // replace slide breaks with paragraph breaks
    .replace(/\*\*/g, "")
    .replace(/#+\s/g, "")
    .split("\n\n")[0]                  // take only the first slide/paragraph (the hook)
    .replace(/\n+/g, " ")
    .trim();
  return clean.length > maxChars ? clean.slice(0, maxChars) + "..." : clean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!apiKey || auth !== `Bearer ${apiKey}`) return jsonResponse({ error: "unauthorized" }, 401);

  const notifyPhone = Deno.env.get("MARKETING_NOTIFY_PHONE") ?? "";
  if (!notifyPhone) return jsonResponse({ error: "MARKETING_NOTIFY_PHONE not configured" }, 500);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const body = await req.json().catch(() => ({})) as { draft_id?: string };
  if (!body.draft_id) return jsonResponse({ error: "draft_id required" }, 400);

  const db = adminClient();
  const { data: draft, error } = await db
    .from("marketing_drafts")
    .select("id, title, content, platform, pilar, image_url, generated_images, status")
    .eq("id", body.draft_id)
    .single();

  if (error || !draft) return jsonResponse({ error: "draft_not_found" }, 404);

  const d = draft as {
    id: string; title: string; content: string; platform: string;
    pilar: string; image_url: string | null; generated_images: string[] | null; status: string;
  };

  if (d.status !== "generated") {
    return jsonResponse({ skipped: true, reason: `status is ${d.status}, expected generated` });
  }

  const approveToken = buildApprovalToken(d.id, "approve", apiKey);
  const rejectToken  = buildApprovalToken(d.id, "reject",  apiKey);
  const approveUrl   = buildApprovalUrl(supabaseUrl, d.id, "approve", approveToken);
  const rejectUrl    = buildApprovalUrl(supabaseUrl, d.id, "reject",  rejectToken);

  const platformEmoji = PLATFORM_EMOJI[d.platform] ?? "📄";
  const imageLink = d.image_url ?? (d.generated_images?.[0]) ?? null;

  const message = [
    `🆕 *Post pronto para aprovação*`,
    ``,
    `${platformEmoji} *${d.platform.toUpperCase()}* · ${PILAR_LABEL[d.pilar] ?? d.pilar}`,
    ``,
    `*${d.title}*`,
    ``,
    excerpt(d.content),
    ``,
    imageLink ? `🖼️ Imagem: ${imageLink}` : `_(sem imagem ainda)_`,
    ``,
    `✅ Aprovar: ${approveUrl}`,
    `❌ Rejeitar: ${rejectUrl}`,
  ].join("\n");

  const result = await sendWhatsApp(notifyPhone, message);
  console.log(`[notifier] draft ${d.id} → WhatsApp ${notifyPhone}: ${result.status}`);

  return jsonResponse({ success: result.status === "sent", result });
});

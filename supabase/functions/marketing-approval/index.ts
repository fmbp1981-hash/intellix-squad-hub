// marketing-approval — public endpoint called when user clicks approve/reject link in WhatsApp
// No JWT required. Token validated via HMAC of draft_id|action|MARKETING_API_KEY.
// Returns HTML page suitable for mobile browser.

import { adminClient } from "../_shared/auth.ts";
import { sendWhatsApp } from "../_shared/whatsapp-provider.ts";

const PILAR_LABEL: Record<string, string> = {
  resultado_ia: "Resultado IA",
  educacao_pratica: "Educação",
  bastidores: "Bastidores",
  posicionamento: "Posicionamento",
  comercial: "Comercial",
};

function html(title: string, emoji: string, body: string, color: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:#0f1117; color:#e2e8f0; min-height:100vh;
    display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:#1a1d2e; border:1px solid #2d3148; border-radius:16px;
    padding:32px 24px; max-width:400px; width:100%; text-align:center; }
  .emoji { font-size:56px; margin-bottom:16px; }
  h1 { font-size:22px; font-weight:700; color:${color}; margin-bottom:8px; }
  p { font-size:14px; color:#94a3b8; line-height:1.6; }
  .draft-title { font-size:15px; font-weight:600; color:#e2e8f0; margin:16px 0 8px;
    background:#252840; border-radius:8px; padding:12px; }
  .date-badge { display:inline-block; background:${color}22; color:${color};
    border-radius:20px; padding:6px 16px; font-size:13px; font-weight:600; margin-top:16px; }
</style></head><body>
<div class="card">
  <div class="emoji">${emoji}</div>
  <h1>${title}</h1>
  ${body}
</div>
</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function validateToken(draftId: string, action: string, token: string, secret: string): boolean {
  const expected = btoa(`${draftId}|${action}|${secret}`)
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return token === expected;
}

// Find next available publishing slot for the platform
async function nextScheduledFor(db: ReturnType<typeof adminClient>, platform: string): Promise<string> {
  // Instagram: Tue(2), Thu(4), Sat(6) | LinkedIn: Mon(1), Wed(3), Fri(5)
  const slots = platform === "instagram" ? [2, 4, 6] : [1, 3, 5];

  const { data: booked } = await db
    .from("marketing_drafts")
    .select("scheduled_for")
    .eq("platform", platform)
    .in("status", ["approved", "published"])
    .not("scheduled_for", "is", null);

  const bookedDates = new Set((booked ?? []).map((r: { scheduled_for: string }) => r.scheduled_for));

  const now = new Date();
  for (let i = 1; i <= 21; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay();
    const dateStr = d.toISOString().split("T")[0];
    if (slots.includes(dow) && !bookedDates.has(dateStr)) return dateStr;
  }
  // Fallback
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 1);
  return fallback.toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const draftId = url.searchParams.get("id") ?? "";
  const action  = url.searchParams.get("action") ?? "";
  const token   = url.searchParams.get("token") ?? "";

  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const notifyPhone = Deno.env.get("MARKETING_NOTIFY_PHONE") ?? "";

  if (!draftId || !action || !token) {
    return html("Link inválido", "⚠️", "<p>Parâmetros ausentes.</p>", "#f59e0b");
  }

  if (!validateToken(draftId, action, token, apiKey)) {
    return html("Link expirado", "🔒", "<p>Este link não é mais válido.</p>", "#ef4444");
  }

  const db = adminClient();
  const { data: draft, error } = await db
    .from("marketing_drafts")
    .select("id, title, platform, pilar, status, scheduled_for")
    .eq("id", draftId)
    .single();

  if (error || !draft) {
    return html("Post não encontrado", "❓", "<p>Este rascunho não existe.</p>", "#6b7280");
  }

  const d = draft as {
    id: string; title: string; platform: string;
    pilar: string; status: string; scheduled_for: string | null;
  };

  if (d.status === "published") {
    return html("Já publicado", "✅", `<p class="draft-title">${d.title}</p><p>Este post já foi publicado.</p>`, "#10b981");
  }

  if (d.status === "rejected") {
    return html("Já rejeitado", "🗑️", `<p class="draft-title">${d.title}</p>`, "#6b7280");
  }

  if (action === "approve") {
    const scheduledFor = await nextScheduledFor(db, d.platform);
    await db.from("marketing_drafts").update({
      status: "approved",
      approved_at: new Date().toISOString(),
      scheduled_for: scheduledFor,
    }).eq("id", draftId);

    const pilarLabel = PILAR_LABEL[d.pilar] ?? d.pilar;
    const dateLabel = formatDate(scheduledFor);

    if (notifyPhone) {
      await sendWhatsApp(notifyPhone,
        `✅ *Post aprovado e agendado!*\n\n*${d.title}*\n\n📅 Publicação: *${dateLabel}*\n📱 ${d.platform.toUpperCase()} · ${pilarLabel}`
      );
    }

    console.log(`[approval] ✅ draft ${draftId} approved → scheduled for ${scheduledFor}`);
    return html(
      "Post aprovado!",
      "✅",
      `<p>Agendado para publicação:</p>
       <p class="draft-title">${d.title}</p>
       <span class="date-badge">📅 ${dateLabel} · ${d.platform.toUpperCase()}</span>`,
      "#10b981"
    );
  }

  if (action === "reject") {
    await db.from("marketing_drafts").update({ status: "rejected" }).eq("id", draftId);

    if (notifyPhone) {
      await sendWhatsApp(notifyPhone, `❌ *Post rejeitado*\n\n_${d.title}_`);
    }

    console.log(`[approval] ❌ draft ${draftId} rejected`);
    return html(
      "Post rejeitado",
      "🗑️",
      `<p class="draft-title">${d.title}</p><p>O post foi removido do pipeline.</p>`,
      "#ef4444"
    );
  }

  return html("Ação inválida", "⚠️", "<p>Ação não reconhecida.</p>", "#f59e0b");
});

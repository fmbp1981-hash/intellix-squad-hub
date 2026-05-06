import { adminClient } from "./auth.ts";

export interface WhatsAppSendResult {
  status: "sent" | "skipped" | "failed";
  reason?: string;
  detail?: unknown;
}

export async function sendWhatsApp(to: string, message: string): Promise<WhatsAppSendResult> {
  const supa = adminClient();
  const { data: cfg } = await supa
    .from("whatsapp_configs")
    .select("instance_url, instance_token, instance_name, active")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cfg) return { status: "skipped", reason: "not_configured" };

  const url = `${cfg.instance_url.replace(/\/$/, "")}/message/sendText/${cfg.instance_name ?? "default"}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.instance_token,
      },
      body: JSON.stringify({ number: to, text: message }),
    });
    const detail = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", reason: `http_${res.status}`, detail };
    return { status: "sent", detail };
  } catch (e) {
    return { status: "failed", reason: (e as Error).message };
  }
}

import { adminClient } from "./auth.ts";

export interface WhatsAppSendResult {
  status: "sent" | "skipped" | "failed";
  reason?: string;
  detail?: unknown;
}

interface WhatsAppConfig {
  id: string;
  provider: string;
  instance_url?: string;
  api_key?: string;
  instance_name?: string;
  phone_number_id?: string;
  access_token?: string;
  active: boolean;
}

async function sendViaEvolution(cfg: WhatsAppConfig, to: string, message: string): Promise<WhatsAppSendResult> {
  if (!cfg.instance_url || !cfg.api_key) {
    return { status: "failed", reason: "evolution_missing_config" };
  }
  const url = `${cfg.instance_url.replace(/\/$/, "")}/message/sendText/${cfg.instance_name ?? "default"}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.api_key },
      body: JSON.stringify({ number: to, text: message }),
    });
    const detail = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", reason: `http_${res.status}`, detail };
    return { status: "sent", detail };
  } catch (e) {
    return { status: "failed", reason: (e as Error).message };
  }
}

async function sendViaWhatsAppBusiness(cfg: WhatsAppConfig, to: string, message: string): Promise<WhatsAppSendResult> {
  if (!cfg.phone_number_id || !cfg.access_token) {
    return { status: "failed", reason: "waba_missing_config" };
  }
  const url = `https://graph.facebook.com/v19.0/${cfg.phone_number_id}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
    const detail = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", reason: `http_${res.status}`, detail };
    return { status: "sent", detail };
  } catch (e) {
    return { status: "failed", reason: (e as Error).message };
  }
}

export async function sendWhatsApp(to: string, message: string): Promise<WhatsAppSendResult> {
  const supa = adminClient();
  const { data: cfg } = await supa
    .from("whatsapp_configs")
    .select("id, provider, instance_url, api_key, instance_name, phone_number_id, access_token, active")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cfg) return { status: "skipped", reason: "not_configured" };

  if (cfg.provider === "whatsapp_business") {
    return sendViaWhatsAppBusiness(cfg as WhatsAppConfig, to, message);
  }
  return sendViaEvolution(cfg as WhatsAppConfig, to, message);
}

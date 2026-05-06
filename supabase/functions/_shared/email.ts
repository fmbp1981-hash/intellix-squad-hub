// Shared helper para invocar a edge function send-email a partir de outras functions
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  template?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(input),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.warn("[sendEmail] falhou", resp.status, data);
      return { ok: false, error: typeof data?.error === "string" ? data.error : `HTTP ${resp.status}` };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("[sendEmail] erro", e);
    return { ok: false, error: e instanceof Error ? e.message : "erro desconhecido" };
  }
}

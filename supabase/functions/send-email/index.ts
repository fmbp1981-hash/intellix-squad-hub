// Send Email via Resend (gateway de conectores Lovable)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const DEFAULT_FROM = "Plataforma <onboarding@resend.dev>";

interface Payload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  template?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

function validate(body: any): { ok: true; data: Payload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body inválido" };
  const { to, subject, html, text } = body;
  if (typeof to !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: "to inválido" };
  if (typeof subject !== "string" || !subject.trim()) return { ok: false, error: "subject obrigatório" };
  if (!html && !text) return { ok: false, error: "html ou text obrigatório" };
  return { ok: true, data: body as Payload };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const json = await req.json().catch(() => null);
    const v = validate(json);
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { to, subject, html, text, from, replyTo, tags, template, related_entity_type, related_entity_id } = v.data;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: log } = await supabase
      .from("email_log")
      .insert({
        recipient: to,
        subject,
        body_html: html ?? null,
        template,
        related_entity_type,
        related_entity_id,
        status: "pending",
      })
      .select()
      .single();

    // Sem credenciais ainda → log como skipped, resposta amigável
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      const reason = !LOVABLE_API_KEY
        ? "LOVABLE_API_KEY ausente"
        : "Conector Resend não conectado (RESEND_API_KEY ausente)";
      if (log?.id) {
        await supabase.from("email_log").update({ status: "skipped", error: reason }).eq("id", log.id);
      }
      return new Response(
        JSON.stringify({
          skipped: true,
          reason,
          hint: "Conecte a Resend pelo painel de Conectores da Lovable.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, unknown> = {
      from: from ?? DEFAULT_FROM,
      to: [to],
      subject,
    };
    if (html) payload.html = html;
    if (text) payload.text = text;
    if (replyTo) payload.reply_to = replyTo;
    if (tags?.length) payload.tags = tags;

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const errMsg = `Resend [${resp.status}]: ${JSON.stringify(data)}`;
      if (log?.id) {
        await supabase.from("email_log").update({ status: "failed", error: errMsg }).eq("id", log.id);
      }
      return new Response(JSON.stringify({ error: errMsg }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (log?.id) {
      await supabase
        .from("email_log")
        .update({ status: "sent", provider_id: data.id, sent_at: new Date().toISOString() })
        .eq("id", log.id);
    }

    return new Response(JSON.stringify({ id: data.id, log_id: log?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

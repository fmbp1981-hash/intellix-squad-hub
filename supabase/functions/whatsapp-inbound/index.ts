// whatsapp-inbound — Inbound webhook for Evolution API and WhatsApp Business (Meta)
// Handles: GET (Meta webhook verification), POST (incoming messages from both providers)
// Routes messages to the correct agent (Bia → Carlos → Felipe)
// Handoff via [ACTION:handoff_to_carlos] and [ACTION:notify_felipe reason="..."] markers

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// Internal URL used to call send-whatsapp for outbound
const FUNCTIONS_URL = SUPABASE_URL.replace("https://", "https://") + "/functions/v1";

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Payload extraction ───────────────────────────────────────────────────────

interface ExtractedMessage {
  phone: string;
  text: string;
  provider: "evolution" | "whatsapp_business";
}

function extractEvolution(body: Record<string, unknown>): ExtractedMessage | null {
  // Evolution API v2 payload: { data: { key: { remoteJid }, message: { conversation | extendedTextMessage } } }
  try {
    const data = body.data as Record<string, unknown>;
    const key = data?.key as Record<string, unknown>;
    const msg = data?.message as Record<string, unknown>;
    const phone = (key?.remoteJid as string)?.replace(/@s\.whatsapp\.net$/, "").replace(/@.*$/, "");
    const text = (msg?.conversation as string) ??
      ((msg?.extendedTextMessage as Record<string, unknown>)?.text as string) ?? "";
    if (!phone || !text) return null;
    return { phone, text, provider: "evolution" };
  } catch {
    return null;
  }
}

function extractWhatsAppBusiness(body: Record<string, unknown>): ExtractedMessage | null {
  // Meta WABA payload: { entry[0].changes[0].value.messages[0] }
  try {
    const entry = (body.entry as Record<string, unknown>[])?.[0];
    const change = (entry?.changes as Record<string, unknown>[])?.[0];
    const value = change?.value as Record<string, unknown>;
    const msg = (value?.messages as Record<string, unknown>[])?.[0];
    if (!msg) return null;
    const phone = msg.from as string;
    const text = (msg.type === "text") ? (msg.text as Record<string, unknown>)?.body as string : "";
    if (!phone || !text) return null;
    return { phone, text, provider: "whatsapp_business" };
  } catch {
    return null;
  }
}

function detectProvider(body: Record<string, unknown>): ExtractedMessage | null {
  // Try Meta WABA first (has 'entry' array)
  if (Array.isArray(body.entry)) return extractWhatsAppBusiness(body);
  // Fall back to Evolution
  return extractEvolution(body);
}

// ─── Agent LLM call ───────────────────────────────────────────────────────────

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

async function callAgent(
  agentName: string,
  persona: string,
  history: HistoryEntry[],
  newMessage: string,
): Promise<string> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // Build message list from history + new message
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: newMessage },
  ];

  // Keep last 20 turns to stay within context
  const trimmed = messages.slice(-20);

  const handoffInstruction = agentName === "Bia"
    ? `\n\nINSTRUÇÃO DE SISTEMA: Quando você tiver confirmado TODOS os critérios BANT e coletado os sinais iniciais, encerre sua resposta com exatamente: [ACTION:handoff_to_carlos]`
    : agentName === "Carlos"
    ? `\n\nINSTRUÇÃO DE SISTEMA: Quando a reunião com Felipe estiver confirmada, encerre sua resposta com exatamente: [ACTION:notify_felipe reason="reunião agendada"]`
    : "";

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: persona + handoffInstruction,
    messages: trimmed,
  });

  return res.content
    .filter((b) => b.type === "text")
    .map((b: { type: string; text?: string }) => b.text ?? "")
    .join("");
}

// ─── Handoff parsing ──────────────────────────────────────────────────────────

interface HandoffAction {
  type: "handoff_to_carlos" | "notify_felipe";
  reason?: string;
}

function parseAction(text: string): { clean: string; action: HandoffAction | null } {
  const handoffMatch = text.match(/\[ACTION:handoff_to_carlos\]/);
  if (handoffMatch) {
    return {
      clean: text.replace(/\[ACTION:handoff_to_carlos\]/g, "").trim(),
      action: { type: "handoff_to_carlos" },
    };
  }
  const felipeMatch = text.match(/\[ACTION:notify_felipe(?:\s+reason="([^"]*)")?\]/);
  if (felipeMatch) {
    return {
      clean: text.replace(/\[ACTION:notify_felipe(?:\s+reason="[^"]*")?\]/g, "").trim(),
      action: { type: "notify_felipe", reason: felipeMatch[1] ?? "reunião agendada" },
    };
  }
  return { clean: text, action: null };
}

// ─── Outbound send ────────────────────────────────────────────────────────────

async function sendReply(to: string, message: string): Promise<void> {
  await fetch(`${FUNCTIONS_URL}/send-whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ to, message }),
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Meta webhook verification handshake
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && challenge) {
      // Verify token against any active whatsapp_business config
      const supa = adminClient();
      const { data: cfg } = await supa
        .from("whatsapp_configs")
        .select("verify_token")
        .eq("provider", "whatsapp_business")
        .eq("active", true)
        .maybeSingle();

      if (cfg?.verify_token && cfg.verify_token === token) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }
    return new Response("OK", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }

  // Meta sends a status-only notification — acknowledge without processing
  const entry0 = (body.entry as Record<string, unknown>[])?.[0];
  const change0 = (entry0?.changes as Record<string, unknown>[])?.[0];
  const value0 = change0?.value as Record<string, unknown>;
  if (Array.isArray(body.entry) && !Array.isArray(value0?.messages)) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const extracted = detectProvider(body);
  if (!extracted) {
    return new Response(JSON.stringify({ ok: true, note: "unrecognized_payload" }), { status: 200 });
  }

  const { phone, text } = extracted;
  const supa = adminClient();

  // ── SDR: Verificar se é resposta de prospect outreach ──────────────────────
  const normalizedPhone = phone.replace(/\D/g, '');
  const { data: sdrLead } = await supa
    .from('outreach_leads')
    .select('id, status')
    .or(`contact_value.eq.${phone},contact_value.eq.${normalizedPhone},contact_value.eq.+${normalizedPhone}`)
    .in('status', ['sent', 'replied'])
    .maybeSingle();

  if (sdrLead) {
    await fetch(`${FUNCTIONS_URL}/sdr-responder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ lead_id: sdrLead.id, inbound_message: text }),
    });
    return new Response('OK', { headers: corsHeaders });
  }
  // ── Fluxo normal Bia/Carlos continua abaixo ────────────────────────────────

  // ── 1. Upsert lead ──────────────────────────────────────────────────────────
  const { data: lead } = await supa
    .from("leads")
    .upsert({ phone, source: "whatsapp" }, { onConflict: "phone" })
    .select("id, assigned_agent, status")
    .single();

  if (!lead) {
    console.error("[whatsapp-inbound] failed to upsert lead for phone", phone);
    return new Response(JSON.stringify({ error: "lead_upsert_failed" }), { status: 500 });
  }

  // ── 2. Upsert conversation ──────────────────────────────────────────────────
  const { data: conv } = await supa
    .from("whatsapp_conversations")
    .upsert(
      { phone, lead_id: lead.id },
      { onConflict: "phone" },
    )
    .select("id, current_agent, history, status")
    .single();

  if (!conv) {
    console.error("[whatsapp-inbound] failed to upsert conversation for phone", phone);
    return new Response(JSON.stringify({ error: "conversation_upsert_failed" }), { status: 500 });
  }

  // Felipe takes over manually — do not auto-respond
  if (conv.current_agent === "felipe" || conv.status === "closed") {
    return new Response(JSON.stringify({ ok: true, note: "felipe_handles_manually" }), { status: 200 });
  }

  // ── 3. Load agent persona ───────────────────────────────────────────────────
  const agentName = conv.current_agent === "carlos" ? "Carlos" : "Bia";
  const { data: agentCfg } = await supa
    .from("agent_configs")
    .select("persona")
    .eq("name", agentName)
    .maybeSingle();

  if (!agentCfg?.persona) {
    console.error("[whatsapp-inbound] persona not found for agent", agentName);
    return new Response(JSON.stringify({ error: "agent_not_found" }), { status: 500 });
  }

  // ── 4. Call LLM ─────────────────────────────────────────────────────────────
  const history = (conv.history as HistoryEntry[]) ?? [];
  let responseText: string;
  try {
    responseText = await callAgent(agentName, agentCfg.persona, history, text);
  } catch (e) {
    console.error("[whatsapp-inbound] LLM call failed:", e);
    return new Response(JSON.stringify({ error: "llm_failed" }), { status: 502 });
  }

  // ── 5. Parse handoff actions ────────────────────────────────────────────────
  const { clean: cleanResponse, action } = parseAction(responseText);

  // ── 6. Persist conversation turn ────────────────────────────────────────────
  const now = new Date().toISOString();
  const updatedHistory: HistoryEntry[] = [
    ...history,
    { role: "user", content: text, ts: now },
    { role: "assistant", content: cleanResponse, ts: now },
  ];

  // Keep last 40 turns (20 exchanges)
  const trimmedHistory = updatedHistory.slice(-40);

  const convUpdate: Record<string, unknown> = {
    history: trimmedHistory,
    last_message_at: now,
  };

  if (action?.type === "handoff_to_carlos") {
    convUpdate.current_agent = "carlos";
    // Update lead as well
    await supa.from("leads").update({ assigned_agent: "carlos", status: "qualified" }).eq("id", lead.id);
  } else if (action?.type === "notify_felipe") {
    convUpdate.current_agent = "felipe";
    convUpdate.status = "waiting";
    // Create notification for Felipe
    await supa.from("notifications").insert({
      type: "whatsapp_lead_ready",
      title: "Lead pronto para reunião",
      body: `Carlos concluiu o pré-diagnóstico do lead ${phone}. ${action.reason ?? ""}`.trim(),
      link: `/leads/${lead.id}`,
      channel: "app",
      priority: "high",
    });
    await supa.from("leads").update({ assigned_agent: "felipe", status: "meeting_scheduled" }).eq("id", lead.id);
  }

  await supa
    .from("whatsapp_conversations")
    .update(convUpdate)
    .eq("id", conv.id);

  // ── 7. Send reply ────────────────────────────────────────────────────────────
  if (cleanResponse) {
    await sendReply(phone, cleanResponse);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireAdmin, adminClient } from "../_shared/auth.ts";
import { sendWhatsApp } from "../_shared/whatsapp-provider.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  name: z.string().min(1).max(120),
  lead_ids: z.array(z.string().uuid()).min(1).max(200),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const guard = await requireAdmin(req);
  if ("error" in guard) return guard.error;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { name, lead_ids } = parsed.data;
  const supa = adminClient();

  // Create campaign record
  const { data: campaign, error: campErr } = await supa
    .from("outreach_campaigns")
    .insert({
      name,
      lead_ids,
      status: "sending",
      started_at: new Date().toISOString(),
      created_by: guard.user.id,
    })
    .select("id")
    .single();

  if (campErr || !campaign) {
    return jsonResponse({ error: "campaign_create_failed", detail: campErr?.message }, 500);
  }

  // Insert pending logs for each lead
  const logs = lead_ids.map((lead_id) => ({
    campaign_id: campaign.id,
    lead_id,
    status: "pending",
  }));
  await supa.from("outreach_campaign_logs").insert(logs);

  // Fetch draft messages for these leads (only whatsapp channel supported in batch)
  const { data: messages } = await supa
    .from("outreach_messages")
    .select("lead_id, message_text, channel")
    .in("lead_id", lead_ids)
    .eq("status", "draft");

  const messageMap = new Map(
    (messages ?? []).map((m) => [m.lead_id, m])
  );

  // Fetch lead contact values
  const { data: leads } = await supa
    .from("outreach_leads")
    .select("id, contact_value, contact_channel")
    .in("id", lead_ids);

  const leadMap = new Map((leads ?? []).map((l) => [l.id, l]));

  let sentCount = 0;
  let failedCount = 0;

  for (const lead_id of lead_ids) {
    const msg = messageMap.get(lead_id);
    const lead = leadMap.get(lead_id);

    if (!msg || !lead) {
      await supa
        .from("outreach_campaign_logs")
        .update({ status: "failed", error: "no_draft_message_or_lead" })
        .eq("campaign_id", campaign.id)
        .eq("lead_id", lead_id);
      failedCount++;
      continue;
    }

    if (msg.channel !== "whatsapp") {
      await supa
        .from("outreach_campaign_logs")
        .update({ status: "failed", error: `channel_not_supported:${msg.channel}` })
        .eq("campaign_id", campaign.id)
        .eq("lead_id", lead_id);
      failedCount++;
      continue;
    }

    const result = await sendWhatsApp(lead.contact_value, msg.message_text);

    if (result.status === "sent") {
      sentCount++;
      const now = new Date().toISOString();

      await supa
        .from("outreach_campaign_logs")
        .update({ status: "sent", sent_at: now })
        .eq("campaign_id", campaign.id)
        .eq("lead_id", lead_id);

      await supa
        .from("outreach_messages")
        .update({ status: "sent", sent_at: now })
        .eq("lead_id", lead_id);

      await supa
        .from("outreach_leads")
        .update({ status: "sent" })
        .eq("id", lead_id);
    } else {
      failedCount++;
      const errDetail = result.reason ?? "send_failed";

      await supa
        .from("outreach_campaign_logs")
        .update({ status: "failed", error: errDetail })
        .eq("campaign_id", campaign.id)
        .eq("lead_id", lead_id);

      await supa
        .from("outreach_messages")
        .update({ status: "failed" })
        .eq("lead_id", lead_id);
    }
  }

  const finalStatus = failedCount === lead_ids.length ? "failed" : "completed";

  await supa
    .from("outreach_campaigns")
    .update({
      status: finalStatus,
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  return jsonResponse({
    campaign_id: campaign.id,
    status: finalStatus,
    sent_count: sentCount,
    failed_count: failedCount,
  });
});

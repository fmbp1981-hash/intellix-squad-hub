import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { sendWhatsApp } from "../_shared/whatsapp-provider.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = adminClient();
  const { data: pending } = await supa
    .from("notifications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  let sent = 0, failed = 0, skipped = 0;
  for (const n of pending ?? []) {
    if (n.channel === "app") {
      await supa.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", n.id);
      sent++;
    } else if (n.channel === "whatsapp") {
      // resolve admin number from whatsapp_configs as fallback
      const { data: cfg } = await supa.from("whatsapp_configs").select("admin_number").eq("active", true).limit(1).maybeSingle();
      const to = cfg?.admin_number ?? "";
      if (!to) {
        await supa.from("notifications").update({ status: "skipped", error: "no_target" }).eq("id", n.id);
        skipped++;
        continue;
      }
      const r = await sendWhatsApp(to, `*${n.title}*\n${n.body ?? ""}`);
      if (r.status === "sent") {
        await supa.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", n.id);
        sent++;
      } else if (r.status === "skipped") {
        await supa.from("notifications").update({ status: "skipped", error: r.reason }).eq("id", n.id);
        skipped++;
      } else {
        await supa.from("notifications").update({ status: "failed", error: r.reason }).eq("id", n.id);
        failed++;
      }
    }
  }
  return jsonResponse({ processed: pending?.length ?? 0, sent, failed, skipped });
});

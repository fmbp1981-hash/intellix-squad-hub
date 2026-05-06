import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { sendWhatsApp } from "../_shared/whatsapp-provider.ts";

function nowHHMM(d = new Date()): string {
  return d.toTimeString().slice(0, 5);
}

function isQuietNow(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const now = nowHHMM();
  if (start <= end) return now >= start && now < end;
  // overnight (e.g. 22:00 -> 07:00)
  return now >= start || now < end;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = adminClient();
  const { data: pending } = await supa
    .from("notifications")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("scheduled_for", { ascending: true })
    .limit(50);

  let sent = 0, failed = 0, skipped = 0, deferred = 0, digested = 0;
  const digestBuckets = new Map<string, typeof pending>();

  for (const n of pending ?? []) {
    // Load preferences
    const { data: prefs } = await supa
      .from("notification_preferences")
      .select("*")
      .eq("user_id", n.user_id)
      .maybeSingle();

    const isCritical = n.priority === "critical";
    if (prefs && isQuietNow(prefs.quiet_hours_start, prefs.quiet_hours_end) && !isCritical) {
      // Defer to end of quiet hours today
      const end = prefs.quiet_hours_end as string;
      const next = new Date();
      const [h, m] = end.split(":").map(Number);
      next.setHours(h, m, 0, 0);
      if (next < new Date()) next.setDate(next.getDate() + 1);
      await supa.from("notifications").update({ scheduled_for: next.toISOString() }).eq("id", n.id);
      deferred++;
      continue;
    }

    // Digest mode for low/normal
    if (prefs?.digest_mode && (n.priority === "normal" || n.priority === "low")) {
      const key = `${n.user_id}:${n.category ?? "general"}`;
      const arr = digestBuckets.get(key) ?? [];
      arr.push(n);
      digestBuckets.set(key, arr);
      continue;
    }

    if (n.channel === "app") {
      await supa
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", n.id);
      sent++;
      continue;
    }

    if (n.channel === "whatsapp") {
      const { data: cfg } = await supa
        .from("whatsapp_configs")
        .select("admin_number")
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      const to = cfg?.admin_number ?? "";
      if (!to) {
        await supa.from("notifications").update({ status: "skipped", error: "no_target" }).eq("id", n.id);
        skipped++;
        continue;
      }
      const r = await sendWhatsApp(to, `*${n.title}*\n${n.body ?? ""}`);
      if (r.status === "sent") {
        await supa
          .from("notifications")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", n.id);
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

  // Flush digests with >= 3 items
  for (const [key, items] of digestBuckets.entries()) {
    if (!items || items.length < 3) {
      // leave as pending for next run
      continue;
    }
    const [userId, category] = key.split(":");
    const { data: cfg } = await supa
      .from("whatsapp_configs")
      .select("admin_number")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    const to = cfg?.admin_number ?? "";
    if (!to) continue;
    const body =
      `*Resumo (${category}) — ${items.length} itens*\n\n` +
      items.map((i, idx) => `${idx + 1}. ${i.title}${i.body ? " — " + i.body : ""}`).join("\n");
    const r = await sendWhatsApp(to, body);
    if (r.status === "sent") {
      const ids = items.map((i) => i.id);
      await supa
        .from("notifications")
        .update({ status: "digested", sent_at: new Date().toISOString() })
        .in("id", ids);
      digested += items.length;
    }
  }

  return jsonResponse({ processed: pending?.length ?? 0, sent, failed, skipped, deferred, digested });
});

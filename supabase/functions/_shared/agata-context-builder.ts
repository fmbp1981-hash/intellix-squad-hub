import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export type AgataType = "daily_standup" | "on_demand" | "incident_response" | "weekly_review";

export async function buildAgataContext(
  supabase: SupabaseClient,
  type: AgataType,
  question?: string,
  contextHints?: Record<string, unknown>,
): Promise<string> {
  const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Recife" });

  const [okrs, leads, deals, invoices, engagements, runningJobs, failedJobs, tokenUsage, recentBriefings] =
    await Promise.all([
      supabase.from("okrs").select("*").eq("active", true),
      supabase.from("leads").select("*").in("status", ["new", "contacted", "qualifying", "qualified"]).limit(20),
      supabase.from("deals").select("*").not("status", "in", "(won,lost)"),
      supabase.from("invoices").select("*").in("status", ["pending", "sent", "overdue"]),
      supabase.from("engagements").select("*, contracts(client_name)").in("status", ["active", "blocked"]),
      supabase.from("internal_jobs").select("*").eq("status", "running"),
      supabase.from("internal_jobs").select("*").eq("status", "failed").gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      supabase.from("token_usage").select("*").eq("period_month", new Date().toISOString().slice(0, 7)),
      supabase.from("gestao_briefings").select("type,created_at").order("created_at", { ascending: false }).limit(3),
    ]);

  let p = `# CONTEXTO INTELLIX — ${today}\n## TIPO: ${type.toUpperCase()}\n\n`;
  if (type === "on_demand" && question) p += `## PERGUNTA DE FELIPE\n"${question}"\n\n`;
  if (contextHints) p += `## HINTS\n${JSON.stringify(contextHints, null, 2)}\n\n`;

  p += `## OKRs\n`;
  (okrs.data ?? []).forEach((o: any) => {
    const pct = o.target_value ? ((Number(o.current_value) / Number(o.target_value)) * 100).toFixed(0) : "—";
    p += `- ${o.objective} → ${o.key_result}: ${o.current_value}/${o.target_value} ${o.metric_unit ?? ""} (${pct}%)\n`;
  });

  p += `\n## PIPELINE\n- Leads ativos: ${leads.data?.length ?? 0}\n- Deals em negociação: ${deals.data?.length ?? 0}\n`;
  if (deals.data?.length) {
    const sum = deals.data.reduce((s: number, d: any) => s + Number(d.value), 0);
    p += `- Pipeline total: R$ ${sum.toLocaleString("pt-BR")}\n`;
  }

  const overdue = (invoices.data ?? []).filter((i: any) => i.status === "overdue");
  const pending = (invoices.data ?? []).filter((i: any) => i.status === "pending");
  p += `\n## FINANCEIRO\n- Vencidas: ${overdue.length} (R$ ${overdue.reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString("pt-BR")})\n- Pendentes: ${pending.length}\n`;

  const blocked = (engagements.data ?? []).filter((e: any) => e.status === "blocked");
  p += `\n## ENGAGEMENTS\n- Ativos: ${(engagements.data ?? []).length - blocked.length}\n- Bloqueados: ${blocked.length}\n`;
  blocked.forEach((e: any) => (p += `  - ${e.name}: ${e.blocker_note ?? "sem motivo"}\n`));

  p += `\n## OPS\n- Jobs rodando: ${runningJobs.data?.length ?? 0}\n- Falhas 24h: ${failedJobs.data?.length ?? 0}\n`;
  const global = (tokenUsage.data ?? []).find((t: any) => t.scope === "global");
  if (global) p += `- Tokens mês: $${Number(global.total_cost_usd).toFixed(2)} / $${global.budget_usd ?? "?"}\n`;

  if (recentBriefings.data?.length) {
    p += `\n## BRIEFINGS RECENTES (não repetir)\n`;
    recentBriefings.data.forEach((b: any) => (p += `- [${b.type}] ${new Date(b.created_at).toLocaleString("pt-BR")}\n`));
  }

  p += `\n---\nProduza o briefing seguindo o seu system prompt para "${type}". Inclua bloco JSON final com "directives" e "decisions_for_felipe".`;
  return p;
}

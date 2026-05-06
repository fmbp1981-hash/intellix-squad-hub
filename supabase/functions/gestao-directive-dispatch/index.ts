import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const guard = await requireAdmin(req);
  if ("error" in guard) return guard.error;

  const { directiveId, approved } = await req.json().catch(() => ({}));
  if (!directiveId) return jsonResponse({ error: "missing_directiveId" }, 400);

  const supa = adminClient();
  const { data: directive, error } = await supa.from("gestao_directives").select("*").eq("id", directiveId).single();
  if (error || !directive) return jsonResponse({ error: "directive_not_found" }, 404);
  if (directive.status !== "pending") return jsonResponse({ error: "directive_not_pending" }, 400);
  if (directive.priority === "critical" && approved !== true) return jsonResponse({ error: "critical_requires_approval" }, 403);

  await supa
    .from("gestao_directives")
    .update({ status: "dispatched", approved_at: new Date().toISOString(), dispatched_at: new Date().toISOString(), approved_by: guard.userId })
    .eq("id", directiveId);

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/internal-job-dispatch`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      department: directive.target_department,
      jobId: directive.job_id,
      jobInput: directive.job_input,
      parentDirectiveId: directiveId,
    }),
  });

  if (!res.ok) {
    await supa.from("gestao_directives").update({ status: "rejected", cancelled_reason: "dispatch_failed" }).eq("id", directiveId);
    return jsonResponse({ error: "dispatch_failed" }, 500);
  }
  const data = await res.json();
  await supa.from("gestao_directives").update({ dispatched_job_id: data.jobId }).eq("id", directiveId);
  return jsonResponse({ ok: true, jobId: data.jobId });
});

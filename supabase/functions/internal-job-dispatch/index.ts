import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/auth.ts";
import { JOB_CATALOG } from "../_shared/job-catalog.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  // Allow either admin user or internal service-role call
  const auth = req.headers.get("Authorization") ?? "";
  const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const isService = srv && auth === `Bearer ${srv}`;
  if (!isService) {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;
  }

  const { department, jobId, jobInput, parentDirectiveId } = await req.json().catch(() => ({}));
  const deptJobs = JOB_CATALOG[department];
  if (!deptJobs) return jsonResponse({ error: "invalid_department" }, 400);
  const jobDef = deptJobs.find((j) => j.id === jobId);
  if (!jobDef) return jsonResponse({ error: "invalid_job" }, 400);

  const supa = adminClient();

  const { count: globalActive } = await supa.from("internal_jobs").select("id", { count: "exact", head: true }).eq("status", "running");
  if ((globalActive ?? 0) >= 3) return jsonResponse({ error: "concurrency_limit" }, 429);

  const { count: deptActive } = await supa.from("internal_jobs").select("id", { count: "exact", head: true }).eq("department", department).eq("status", "running");
  if ((deptActive ?? 0) >= 1) return jsonResponse({ error: "department_busy" }, 429);

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: dup } = await supa.from("internal_jobs").select("id").eq("job_id", jobId).gte("created_at", fiveMinAgo).limit(1);
  if (dup?.length) return jsonResponse({ error: "duplicate_job" }, 429);

  if (jobDef.cooldownMin) {
    const cutoff = new Date(Date.now() - jobDef.cooldownMin * 60 * 1000).toISOString();
    const { data: cooled } = await supa.from("internal_jobs").select("id").eq("job_id", jobId).eq("status", "completed").gte("completed_at", cutoff).limit(1);
    if (cooled?.length) return jsonResponse({ error: "cooldown_active" }, 429);
  }

  const { data: job, error } = await supa
    .from("internal_jobs")
    .insert({
      kind: department,
      department,
      job_id: jobId,
      job_input: jobInput ?? {},
      payload: jobInput ?? {},
      trigger_source: parentDirectiveId ? "gestao_directive" : "manual",
      parent_directive_id: parentDirectiveId ?? null,
      estimated_tokens: jobDef.estimatedTokens,
      sla_deadline: new Date(Date.now() + jobDef.slaMin * 60 * 1000).toISOString(),
      status: "pending",
    })
    .select()
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ ok: true, jobId: job.id });
});

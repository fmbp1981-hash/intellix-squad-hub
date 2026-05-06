import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_STATUSES = ["backlog", "ready", "sprint", "in_progress", "in_review", "done", "accepted", "cancelled"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { storyId, toStatus, sprintId } = await req.json();
    if (!storyId || !VALID_STATUSES.includes(toStatus)) {
      return json({ ok: false, reason: "invalid_input" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: story, error: storyErr } = await supabase
      .from("user_stories")
      .select("*")
      .eq("id", storyId)
      .single();
    if (storyErr || !story) return json({ ok: false, reason: "not_found" }, 404);

    const { data: project } = await supabase
      .from("agile_projects")
      .select("wip_limit_in_progress, wip_limit_review")
      .eq("id", story.project_id)
      .single();

    const targetSprintId = sprintId ?? story.sprint_id;

    if ((toStatus === "in_progress" || toStatus === "in_review") && targetSprintId) {
      const limit =
        toStatus === "in_progress"
          ? project?.wip_limit_in_progress ?? 5
          : project?.wip_limit_review ?? 3;
      const { count } = await supabase
        .from("user_stories")
        .select("*", { count: "exact", head: true })
        .eq("sprint_id", targetSprintId)
        .eq("status", toStatus)
        .neq("id", storyId);
      if ((count ?? 0) >= limit) {
        return json({ ok: false, reason: "wip_limit", limit });
      }
    }

    const patch: Record<string, unknown> = { status: toStatus };
    if (sprintId !== undefined) patch.sprint_id = sprintId;
    if (toStatus === "in_progress" && !story.started_at) patch.started_at = new Date().toISOString();
    if (toStatus === "done") patch.completed_at = new Date().toISOString();
    if (toStatus === "accepted") patch.accepted_at = new Date().toISOString();

    const { error: updErr } = await supabase.from("user_stories").update(patch).eq("id", storyId);
    if (updErr) return json({ ok: false, reason: updErr.message }, 500);

    if (targetSprintId) {
      const { data: sStories } = await supabase
        .from("user_stories")
        .select("story_points, status")
        .eq("sprint_id", targetSprintId);
      const committed = (sStories ?? []).reduce((s, x: any) => s + (x.story_points ?? 0), 0);
      const completed = (sStories ?? [])
        .filter((x: any) => x.status === "done" || x.status === "accepted")
        .reduce((s, x: any) => s + (x.story_points ?? 0), 0);
      await supabase
        .from("sprints")
        .update({ committed_points: committed, completed_points: completed })
        .eq("id", targetSprintId);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

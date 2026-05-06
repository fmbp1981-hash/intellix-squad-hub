import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ENTITY_QUERIES: Record<string, { table: string; select: string }> = {
  engagements: { table: "engagements", select: "id,name,status,health,start_date,end_date,workspace_id,created_at" },
  projects: { table: "agile_projects", select: "id,name,client_name,status,total_story_points,completed_points,current_velocity,created_at" },
  leads: { table: "leads", select: "id,company_name,contact_name,contact_email,source,status,score,ticket_estimate,created_at" },
  deals: { table: "deals", select: "id,company_name,status,value,probability,expected_close,pricing_model,created_at" },
  invoices: { table: "invoices", select: "id,number,amount,status,issue_date,due_date,paid_at,milestone,contract_id" },
};

function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const entity_type = String(body.entity_type ?? "");
    const format = body.format === "json" ? "json" : "csv";
    const filters = body.filters ?? {};

    if (!ENTITY_QUERIES[entity_type]) {
      return new Response(JSON.stringify({ error: "invalid entity_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: runRow, error: insErr } = await admin
      .from("export_run")
      .insert({
        requested_by: userId,
        entity_type,
        format,
        filters,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insErr || !runRow) throw insErr ?? new Error("insert failed");

    try {
      const { table, select } = ENTITY_QUERIES[entity_type];
      let q = admin.from(table).select(select).limit(10000);
      if (filters.status) q = q.eq("status", filters.status);
      const { data: rows, error: qErr } = await q;
      if (qErr) throw qErr;

      const list = rows ?? [];
      const content = format === "json" ? JSON.stringify(list, null, 2) : toCSV(list);
      const ext = format === "json" ? "json" : "csv";
      const filename = `${userId}/${entity_type}-${Date.now()}.${ext}`;
      const mime = format === "json" ? "application/json" : "text/csv";

      const { error: upErr } = await admin.storage
        .from("exports")
        .upload(filename, new Blob([content], { type: mime }), {
          contentType: mime,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: signed } = await admin.storage
        .from("exports")
        .createSignedUrl(filename, 60 * 60 * 24 * 7);

      await admin
        .from("export_run")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          row_count: list.length,
          file_url: signed?.signedUrl ?? null,
        })
        .eq("id", runRow.id);

      return new Response(
        JSON.stringify({ id: runRow.id, row_count: list.length, file_url: signed?.signedUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      await admin
        .from("export_run")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : String(err),
        })
        .eq("id", runRow.id);
      throw err;
    }
  } catch (e) {
    console.error("export-run error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

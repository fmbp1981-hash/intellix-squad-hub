import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

async function gatewayFetch(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get("GOOGLE_DRIVE_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  return fetch(`${GATEWAY}${path}`, { ...init, headers });
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

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const folderName: string = String(body.name ?? "OpenSquad");
    const scope: string = String(body.scope ?? "root");
    const scopeId: string | null = body.scope_id ?? null;
    const parentId: string | null = body.parent_id ?? null;

    const createBody: Record<string, unknown> = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (parentId) createBody.parents = [parentId];

    const res = await gatewayFetch("/files?fields=id,name,webViewLink", {
      method: "POST",
      body: JSON.stringify(createBody),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(
        JSON.stringify({ error: "drive_create_failed", detail: txt }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const folder = await res.json();

    const { data: inserted, error: insErr } = await admin
      .from("drive_settings")
      .insert({
        scope,
        scope_id: scopeId,
        folder_id: folder.id,
        folder_url: folder.webViewLink,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        id: inserted.id,
        folder_id: folder.id,
        folder_url: folder.webViewLink,
        name: folder.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("drive-setup error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

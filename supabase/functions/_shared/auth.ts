import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    },
  );
}

export async function requireAdmin(req: Request): Promise<{ userId: string } | { error: Response }> {
  const u = userClient(req);
  const { data: userData, error: userErr } = await u.auth.getUser();
  if (userErr || !userData.user) {
    const { jsonResponse } = await import("./cors.ts");
    return { error: jsonResponse({ error: "unauthorized" }, 401) };
  }
  const a = adminClient();
  const { data, error } = await a
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) {
    const { jsonResponse } = await import("./cors.ts");
    return { error: jsonResponse({ error: "forbidden" }, 403) };
  }
  return { userId: userData.user.id };
}

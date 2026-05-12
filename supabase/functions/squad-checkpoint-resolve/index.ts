import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Valida JWT do usuário (verify_jwt: true no deploy)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userToken = authHeader.replace("Bearer ", "");

  // Cliente com JWT do usuário para validar role
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  });

  // Verifica se usuário tem role admin
  const { data: roleData, error: roleError } = await userClient
    .from("user_roles")
    .select("role")
    .eq("role", "admin")
    .single();

  if (roleError || !roleData) {
    return new Response(JSON.stringify({ error: "Forbidden — admin role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Obtém userId do token
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { checkpointId: string; decision: "approved" | "rejected"; notes?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { checkpointId, decision, notes } = body;

  if (!checkpointId || !decision) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: checkpointId, decision" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!["approved", "rejected"].includes(decision)) {
    return new Response(
      JSON.stringify({ error: "decision must be 'approved' or 'rejected'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Service role para escrever a resolução
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verifica que o checkpoint existe e está pending
  const { data: checkpoint, error: fetchError } = await adminClient
    .from("squad_checkpoints")
    .select("id, status, run_id")
    .eq("id", checkpointId)
    .single();

  if (fetchError || !checkpoint) {
    return new Response(JSON.stringify({ error: "Checkpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (checkpoint.status !== "pending") {
    return new Response(
      JSON.stringify({ error: `Checkpoint already resolved: ${checkpoint.status}` }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Resolve o checkpoint — Realtime propaga automaticamente ao VPS (polling) e ao browser
  const { error: updateError } = await adminClient
    .from("squad_checkpoints")
    .update({
      status: decision,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq("id", checkpointId);

  if (updateError) {
    return new Response(
      JSON.stringify({ error: "Failed to resolve checkpoint", detail: updateError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Se rejeitado, marca o run como failed imediatamente
  if (decision === "rejected") {
    await adminClient
      .from("squad_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", checkpoint.run_id);
  }

  return new Response(
    JSON.stringify({ ok: true, checkpointId, decision }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

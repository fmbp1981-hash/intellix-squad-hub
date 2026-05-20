// admin-invite — convida usuário por email e atribui role inicial.
// Requer caller com role 'admin' (validado em requireAdmin).
import { adminClient, requireAdmin } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const ALLOWED_ROLES = new Set(["admin", "agent", "validator", "client", "viewer"]);

interface InvitePayload {
  email: string;
  role: string;
  full_name?: string;
  redirect_to?: string;
}

function validate(body: unknown): { ok: true; data: InvitePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body inválido" };
  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const role = typeof b.role === "string" ? b.role : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "email inválido" };
  if (!ALLOWED_ROLES.has(role)) return { ok: false, error: `role inválido. permitidos: ${[...ALLOWED_ROLES].join(", ")}` };
  return {
    ok: true,
    data: {
      email,
      role,
      full_name: typeof b.full_name === "string" ? b.full_name : undefined,
      redirect_to: typeof b.redirect_to === "string" ? b.redirect_to : undefined,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "json inválido" }, 400);
  }

  const v = validate(body);
  if (!v.ok) return jsonResponse({ error: v.error }, 400);

  const { email, role, full_name, redirect_to } = v.data;
  const admin = adminClient();

  const inviteOpts: Record<string, unknown> = {};
  if (redirect_to) inviteOpts.redirectTo = redirect_to;
  if (full_name) inviteOpts.data = { full_name };

  const { data: inviteRes, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    inviteOpts,
  );

  // Se já existir, recupera o id pelo lookup
  let userId: string | null = inviteRes?.user?.id ?? null;
  if (!userId && inviteErr) {
    const isAlreadyExists = (inviteErr.message ?? "").toLowerCase().includes("already");
    if (!isAlreadyExists) {
      return jsonResponse({ error: inviteErr.message }, 400);
    }
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1, perPage: 200,
    });
    if (listErr) return jsonResponse({ error: listErr.message }, 500);
    const found = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!found) return jsonResponse({ error: "usuário existe mas não foi localizado" }, 500);
    userId = found.id;
  }

  if (!userId) return jsonResponse({ error: "falha ao obter id do usuário" }, 500);

  const { error: roleErr } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (roleErr) return jsonResponse({ error: roleErr.message }, 500);

  return jsonResponse({
    ok: true,
    user_id: userId,
    email,
    role,
    invited: !inviteErr,
    already_existed: !!inviteErr,
  });
});

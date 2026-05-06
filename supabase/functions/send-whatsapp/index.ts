import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { sendWhatsApp } from "../_shared/whatsapp-provider.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  to: z.string().min(8),
  message: z.string().min(1).max(4096),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const guard = await requireAdmin(req);
  if ("error" in guard) return guard.error;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const result = await sendWhatsApp(parsed.data.to, parsed.data.message);
  return jsonResponse(result, result.status === "failed" ? 502 : 200);
});

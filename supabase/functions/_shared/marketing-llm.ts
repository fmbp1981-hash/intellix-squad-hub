// Helper LLM para as edge functions do Marketing Squad
// Usa o mesmo gateway do llm-provider.ts com os modelos dos 7 agentes

import { LlmMessage, LlmResult } from "./llm-provider.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Mapeamento chave → modelo no gateway
const AGENT_GATEWAY_MODEL: Record<string, { model: string; temperature: number; maxTokens: number }> = {
  lucio: { model: "google/gemini-2.0-flash",              temperature: 0.7, maxTokens: 4096 },
  iris:  { model: "anthropic/claude-haiku-4-5-20251001",  temperature: 0.7, maxTokens: 2048 },
  maya:  { model: "anthropic/claude-sonnet-4-6",          temperature: 0.7, maxTokens: 4096 },
  teo:   { model: "anthropic/claude-sonnet-4-6",          temperature: 0.8, maxTokens: 4096 },
  vera:  { model: "anthropic/claude-sonnet-4-6",          temperature: 0.6, maxTokens: 4096 },
  sofia: { model: "anthropic/claude-opus-4-6",            temperature: 0.5, maxTokens: 4096 },
  otto:  { model: "anthropic/claude-sonnet-4-6",          temperature: 0.7, maxTokens: 4096 },
};

async function getSecret(key: string): Promise<string | null> {
  // Prefer env var (Supabase Secrets vault)
  const envVal = Deno.env.get(key);
  if (envVal) return envVal;

  // Fall back to app_secrets table (configured by user in-app)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/app_secrets?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" } },
  );
  if (!res.ok) return null;
  const rows: { value: string }[] = await res.json();
  return rows?.[0]?.value || null;
}

export async function callMarketingAgent(
  agent: keyof typeof AGENT_GATEWAY_MODEL,
  messages: LlmMessage[],
): Promise<LlmResult> {
  const cfg = AGENT_GATEWAY_MODEL[agent];
  const apiKey = await getSecret("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not set — configure em Configurações → Marketing Squad → Chaves de API");

  const t0 = Date.now();
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: cfg.model, messages, temperature: cfg.temperature, max_tokens: cfg.maxTokens }),
  });
  const latency_ms = Date.now() - t0;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gateway ${res.status}: ${text}`);
  }
  const json = await res.json();
  return {
    content:    json.choices?.[0]?.message?.content ?? "",
    tokens_in:  json.usage?.prompt_tokens ?? 0,
    tokens_out: json.usage?.completion_tokens ?? 0,
    model_used: cfg.model,
    latency_ms,
  };
}

export function dispatchNext(fnName: string, body: unknown): void {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fnName}`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  }).catch((e) => console.error(`dispatch ${fnName}`, e));
}

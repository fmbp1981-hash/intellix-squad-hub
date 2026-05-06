import { adminClient } from "./auth.ts";

export interface LlmConfig {
  config_key: string;
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  temperature: number;
  max_tokens: number;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmResult {
  content: string;
  tokens_in: number;
  tokens_out: number;
  model_used: string;
  latency_ms: number;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function loadLlmConfig(key: string): Promise<LlmConfig> {
  const supa = adminClient();
  const { data, error } = await supa
    .from("llm_configs")
    .select("*")
    .eq("config_key", key)
    .maybeSingle();
  if (error || !data) {
    const { data: def } = await supa
      .from("llm_configs")
      .select("*")
      .eq("config_key", "default")
      .single();
    return def as LlmConfig;
  }
  return data as LlmConfig;
}

async function callGateway(model: string, messages: LlmMessage[], temperature: number, maxTokens: number) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not set");
  const t0 = Date.now();
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });
  const latency_ms = Date.now() - t0;
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`gateway ${res.status}: ${text}`);
    (err as any).status = res.status;
    throw err;
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return {
    content,
    tokens_in: json.usage?.prompt_tokens ?? 0,
    tokens_out: json.usage?.completion_tokens ?? 0,
    model_used: model,
    latency_ms,
  };
}

export async function runLlm(cfg: LlmConfig, messages: LlmMessage[]): Promise<LlmResult> {
  try {
    return await callGateway(cfg.model, messages, cfg.temperature, cfg.max_tokens);
  } catch (e) {
    const status = (e as any).status;
    if ((status === 429 || status === 402) && cfg.fallback_model) {
      console.warn(`[llm] fallback ${cfg.model} -> ${cfg.fallback_model} (status ${status})`);
      return await callGateway(cfg.fallback_model, messages, cfg.temperature, cfg.max_tokens);
    }
    throw e;
  }
}

// ----- Ágata output parsing helpers -----
export function extractDirectivesJson(output: string): unknown[] {
  const re = /```json\s*([\s\S]*?)\s*```/g;
  for (const m of output.matchAll(re)) {
    try {
      const p = JSON.parse(m[1]);
      if (Array.isArray(p?.directives)) return p.directives;
    } catch { /* try next */ }
  }
  return [];
}

export function extractDecisionsForFelipe(output: string): string[] {
  const re = /```json\s*([\s\S]*?)\s*```/g;
  for (const m of output.matchAll(re)) {
    try {
      const p = JSON.parse(m[1]);
      if (Array.isArray(p?.decisions_for_felipe)) return p.decisions_for_felipe;
    } catch { /* try next */ }
  }
  return [];
}

// Cliente da LLM Factory (edge function `llm-invoke`).
// Strangler-fig: as funções legadas `loadLlmConfig`/`runLlm` continuam exportadas
// como wrappers depreciados. Novos callers devem usar `invokeAgent` direto.
//
// Substituiu Lovable Gateway → SDKs nativos (Anthropic, OpenAI, Google) atrás
// de `llm-invoke`, com idempotency e logging em `agent_runs`.

import { adminClient } from "./auth.ts";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface InvokeAgentInput {
  agent_name: string;
  messages: LlmMessage[];
  idempotency_key: string;
  engagement_id?: string;
  job_name?: string;
}

export interface InvokeAgentResult {
  content: string;
  tokens_in: number;
  tokens_out: number;
  provider: string;
  model: string;
  cost_usd: number;
  duration_ms: number;
  agent_run_id: string;
  cached: boolean;
}

export async function invokeAgent(input: InvokeAgentInput): Promise<InvokeAgentResult> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/llm-invoke`;
  const auth = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`llm-invoke ${res.status}: ${text}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  return await res.json() as InvokeAgentResult;
}

// ----- Ágata output parsing helpers -----
export function extractDirectivesJson(output: string): unknown[] {
  const re = /```json\s*([\s\S]*?)\s*```/g;
  for (const m of output.matchAll(re)) {
    try {
      const p = JSON.parse(m[1]);
      if (Array.isArray((p as { directives?: unknown[] })?.directives)) {
        return (p as { directives: unknown[] }).directives;
      }
    } catch { /* try next */ }
  }
  return [];
}

export function extractDecisionsForFelipe(output: string): string[] {
  const re = /```json\s*([\s\S]*?)\s*```/g;
  for (const m of output.matchAll(re)) {
    try {
      const p = JSON.parse(m[1]);
      if (Array.isArray((p as { decisions_for_felipe?: string[] })?.decisions_for_felipe)) {
        return (p as { decisions_for_felipe: string[] }).decisions_for_felipe;
      }
    } catch { /* try next */ }
  }
  return [];
}

// =============================================================================
// DEPRECATED — wrappers para callers ainda em llm_configs.config_key.
// Resolve config_key → agent_name e delega a invokeAgent.
// Remover na Fase 3 quando todos os callers migrarem.
// =============================================================================

export interface LlmConfig {
  config_key: string;
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  temperature: number;
  max_tokens: number;
}

export interface LlmResult {
  content: string;
  tokens_in: number;
  tokens_out: number;
  model_used: string;
  latency_ms: number;
}

/** @deprecated Use invokeAgent({ agent_name, ... }) directamente. */
export async function loadLlmConfig(key: string): Promise<LlmConfig> {
  const supa = adminClient();
  const { data } = await supa.from("llm_configs").select("*").eq("config_key", key).maybeSingle();
  if (data) return data as LlmConfig;
  const { data: def } = await supa.from("llm_configs").select("*").eq("config_key", "default").single();
  return def as LlmConfig;
}

/** @deprecated Use invokeAgent. Mantido só durante strangler-fig (1 sprint). */
export async function runLlm(cfg: LlmConfig, messages: LlmMessage[]): Promise<LlmResult> {
  // Mapeia config_key → agent_name (best-effort): assume 1:1 nas config_keys
  // padronizadas. Para "default" / "internal:gestao:*", roteia para Ágata.
  const supa = adminClient();
  const { data: agent } = await supa
    .from("agent_configs")
    .select("name")
    .eq("llm_config_key", cfg.config_key)
    .limit(1)
    .maybeSingle();

  const agent_name = agent?.name ?? "Ágata";
  const idempotency_key = `legacy-${cfg.config_key}-${crypto.randomUUID()}`;
  const out = await invokeAgent({ agent_name, messages, idempotency_key });
  return {
    content: out.content,
    tokens_in: out.tokens_in,
    tokens_out: out.tokens_out,
    model_used: out.model,
    latency_ms: out.duration_ms,
  };
}

import { adminClient } from "./auth.ts";

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface LlmConfig {
  config_key: string;
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  temperature: number;
  max_tokens: number;
  recommended_model: string | null;
  cost_tier: "low" | "medium" | "high" | null;
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

// ── Catálogo de modelos disponíveis (usado pela UI para seleção + custo-benefício) ──

export interface ModelOption {
  provider: "anthropic" | "google" | "openai";
  model: string;           // prefixo/nome completo para o gateway
  display_name: string;
  cost_tier: "low" | "medium" | "high";
  context_window_k: number;
  recommended_for: string[];
}

export const MODEL_CATALOG: ModelOption[] = [
  // ── Anthropic ────────────────────────────────────────────────
  {
    provider: "anthropic",
    model: "anthropic/claude-opus-4-7",
    display_name: "Claude Opus 4.7",
    cost_tier: "high",
    context_window_k: 200,
    recommended_for: ["reviewer", "strategist", "editor", "análise crítica", "long-context"],
  },
  {
    provider: "anthropic",
    model: "anthropic/claude-sonnet-4-6",
    display_name: "Claude Sonnet 4.6",
    cost_tier: "medium",
    context_window_k: 200,
    recommended_for: ["copywriter", "specialist", "redação criativa", "custo-benefício"],
  },
  {
    provider: "anthropic",
    model: "anthropic/claude-haiku-4-5-20251001",
    display_name: "Claude Haiku 4.5",
    cost_tier: "low",
    context_window_k: 200,
    recommended_for: ["lead-analyst", "researcher", "tarefas rápidas", "volume alto"],
  },
  // ── Google Gemini ─────────────────────────────────────────────
  {
    provider: "google",
    model: "google/gemini-3.1-pro-preview",
    display_name: "Gemini 3.1 Pro",
    cost_tier: "high",
    context_window_k: 1000,
    recommended_for: ["strategist", "manager", "art-director", "raciocínio complexo"],
  },
  {
    provider: "google",
    model: "google/gemini-3-flash-preview",
    display_name: "Gemini 3 Flash",
    cost_tier: "medium",
    context_window_k: 128,
    recommended_for: ["copywriter", "specialist", "geração rápida", "custo-benefício"],
  },
  {
    provider: "google",
    model: "google/gemini-3.1-flash-lite-preview",
    display_name: "Gemini 3.1 Flash Lite",
    cost_tier: "low",
    context_window_k: 128,
    recommended_for: ["researcher", "lead-analyst", "triagem", "volume alto"],
  },
  // ── OpenAI ────────────────────────────────────────────────────
  {
    provider: "openai",
    model: "openai/gpt-5",
    display_name: "GPT-5",
    cost_tier: "high",
    context_window_k: 128,
    recommended_for: ["strategist", "reviewer", "raciocínio avançado"],
  },
  {
    provider: "openai",
    model: "openai/gpt-5-mini",
    display_name: "GPT-5 Mini",
    cost_tier: "medium",
    context_window_k: 128,
    recommended_for: ["copywriter", "specialist", "custo-benefício"],
  },
  {
    provider: "openai",
    model: "openai/gpt-5-nano",
    display_name: "GPT-5 Nano",
    cost_tier: "low",
    context_window_k: 128,
    recommended_for: ["researcher", "lead-analyst", "volume alto"],
  },
];

/** Retorna modelos recomendados para um dado role de agente, ordenados por custo crescente. */
export function getRecommendedModels(agentRole: string): ModelOption[] {
  return MODEL_CATALOG
    .filter((m) => m.recommended_for.some((r) => r.toLowerCase().includes(agentRole.toLowerCase())))
    .sort((a, b) => {
      const tier = { low: 0, medium: 1, high: 2 };
      return tier[a.cost_tier] - tier[b.cost_tier];
    });
}

// ── Gateway ───────────────────────────────────────────────────────────────────

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Carregamento de config ────────────────────────────────────────────────────

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

// ── Execução ──────────────────────────────────────────────────────────────────

async function callGateway(
  model: string,
  messages: LlmMessage[],
  temperature: number,
  maxTokens: number,
): Promise<LlmResult> {
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

// ── Helpers de parsing de output dos agentes ─────────────────────────────────

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

/** Extrai um bloco JSON de qualquer chave do output do agente. */
export function extractJsonBlock<T = unknown>(output: string, key: string): T | null {
  const re = /```json\s*([\s\S]*?)\s*```/g;
  for (const m of output.matchAll(re)) {
    try {
      const p = JSON.parse(m[1]);
      if (key in p) return p[key] as T;
    } catch { /* try next */ }
  }
  return null;
}

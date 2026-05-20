// llm-invoke — LLM Factory unificada (Anthropic | OpenAI | Google)
// Contrato: { agent_name, messages, idempotency_key, engagement_id?, job_name? }
//        -> { content, tokens_in, tokens_out, provider, model, agent_run_id, cost_usd, duration_ms, cached? }
// Idempotência: agent_runs.idempotency_key UNIQUE — chamadas repetidas retornam o run anterior.
// Observabilidade: cada invocação cria uma linha em agent_runs com tokens, custo e duração.

import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";
import OpenAI from "npm:openai@4.73.0";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { adminClient } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Provider = "anthropic" | "openai" | "google";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface InvokeBody {
  agent_name: string;
  messages: Message[];
  idempotency_key: string;
  engagement_id?: string;
  job_name?: string;
}

interface AgentConfig {
  id: string;
  name: string;
  llm_provider: Provider;
  llm_model: string;
  llm_temperature: number;
  llm_max_tokens: number;
  system_prompt?: string | null;
}

// Pricing aproximado por 1k tokens (USD) — atualizar conforme preços oficiais.
const PRICING: Record<string, { in: number; out: number }> = {
  // Anthropic
  "claude-sonnet-4-5":   { in: 0.003,  out: 0.015 },
  "claude-sonnet-4-6":   { in: 0.003,  out: 0.015 },
  "claude-opus-4-7":     { in: 0.015,  out: 0.075 },
  "claude-haiku-4-5":    { in: 0.001,  out: 0.005 },
  // OpenAI
  "gpt-4o":              { in: 0.0025, out: 0.010 },
  "gpt-4o-mini":         { in: 0.00015,out: 0.0006 },
  // Google
  "gemini-2.0-pro":      { in: 0.00125,out: 0.005 },
  "gemini-2.0-flash":    { in: 0.000075,out: 0.0003 },
  "gemini-1.5-flash":    { in: 0.000075,out: 0.0003 },
};

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (tokensIn / 1000) * p.in + (tokensOut / 1000) * p.out;
}

function splitSystem(messages: Message[]): { system: string; rest: Message[] } {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  return { system: sys, rest };
}

async function callAnthropic(cfg: AgentConfig, messages: Message[]) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey });
  const { system, rest } = splitSystem(messages);
  const res = await client.messages.create({
    model: cfg.llm_model,
    max_tokens: cfg.llm_max_tokens,
    temperature: cfg.llm_temperature,
    system: system || undefined,
    messages: rest.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  });
  const content = res.content
    .filter((b) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
  return {
    content,
    tokens_in: res.usage.input_tokens,
    tokens_out: res.usage.output_tokens,
  };
}

async function callOpenAI(cfg: AgentConfig, messages: Message[]) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: cfg.llm_model,
    temperature: cfg.llm_temperature,
    max_tokens: cfg.llm_max_tokens,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const content = res.choices[0]?.message?.content ?? "";
  return {
    content,
    tokens_in: res.usage?.prompt_tokens ?? 0,
    tokens_out: res.usage?.completion_tokens ?? 0,
  };
}

async function callGoogle(cfg: AgentConfig, messages: Message[]) {
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  const { system, rest } = splitSystem(messages);
  const model = genAI.getGenerativeModel({
    model: cfg.llm_model,
    systemInstruction: system || undefined,
    generationConfig: {
      temperature: cfg.llm_temperature,
      maxOutputTokens: cfg.llm_max_tokens,
    },
  });
  // Gemini espera histórico via startChat; usamos last user msg como prompt.
  const history = rest.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const last = rest[rest.length - 1];
  if (!last) throw new Error("messages cannot be empty");
  const chat = model.startChat({ history });
  const res = await chat.sendMessage(last.content);
  const content = res.response.text();
  const usage = res.response.usageMetadata;
  return {
    content,
    tokens_in: usage?.promptTokenCount ?? 0,
    tokens_out: usage?.candidatesTokenCount ?? 0,
  };
}

async function dispatch(cfg: AgentConfig, messages: Message[]) {
  switch (cfg.llm_provider) {
    case "anthropic": return await callAnthropic(cfg, messages);
    case "openai":    return await callOpenAI(cfg, messages);
    case "google":    return await callGoogle(cfg, messages);
    default: throw new Error(`unknown provider: ${cfg.llm_provider}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  let body: InvokeBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const { agent_name, messages, idempotency_key, engagement_id, job_name } = body;
  if (!agent_name || !idempotency_key || !Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: "missing_fields", required: ["agent_name", "messages", "idempotency_key"] }, 400);
  }

  const supa = adminClient();

  // 1) Idempotency: existe um run com essa chave já completo? Devolve cached.
  const { data: existing } = await supa
    .from("agent_runs")
    .select("id, output, tokens_in, tokens_out, llm_provider, llm_model, cost_usd, duration_ms, status, error")
    .eq("idempotency_key", idempotency_key)
    .maybeSingle();

  if (existing && existing.status === "completed") {
    return jsonResponse({
      content: existing.output ?? "",
      tokens_in: existing.tokens_in,
      tokens_out: existing.tokens_out,
      provider: existing.llm_provider,
      model: existing.llm_model,
      cost_usd: Number(existing.cost_usd),
      duration_ms: existing.duration_ms,
      agent_run_id: existing.id,
      cached: true,
    });
  }

  // 2) Carrega agent_config por nome
  const { data: cfgRow, error: cfgErr } = await supa
    .from("agent_configs")
    .select("id, name, llm_provider, llm_model, llm_temperature, llm_max_tokens, system_prompt")
    .eq("name", agent_name)
    .maybeSingle();

  if (cfgErr || !cfgRow) {
    return jsonResponse({ error: "agent_not_found", agent_name }, 404);
  }
  const cfg = cfgRow as AgentConfig;

  // 3) Cria/atualiza linha agent_runs como running
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const runRow = {
    agent_name: cfg.name,
    agent_id: cfg.id,
    job_name: job_name ?? null,
    engagement_id: engagement_id ?? null,
    llm_provider: cfg.llm_provider,
    llm_model: cfg.llm_model,
    input: { messages },
    status: "running" as const,
    idempotency_key,
    started_at: startedAt,
  };

  let runId: string | null = existing?.id ?? null;
  if (runId) {
    await supa.from("agent_runs").update(runRow).eq("id", runId);
  } else {
    const { data: ins, error: insErr } = await supa
      .from("agent_runs")
      .insert(runRow)
      .select("id")
      .single();
    if (insErr || !ins) {
      // Concorrência: outra invocação criou a linha — re-busca
      const { data: again } = await supa
        .from("agent_runs")
        .select("id, status, output, tokens_in, tokens_out, llm_provider, llm_model, cost_usd, duration_ms")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();
      if (again?.status === "completed") {
        return jsonResponse({
          content: again.output ?? "",
          tokens_in: again.tokens_in,
          tokens_out: again.tokens_out,
          provider: again.llm_provider,
          model: again.llm_model,
          cost_usd: Number(again.cost_usd),
          duration_ms: again.duration_ms,
          agent_run_id: again.id,
          cached: true,
        });
      }
      runId = again?.id ?? null;
      if (!runId) {
        return jsonResponse({ error: "agent_run_insert_failed", detail: insErr?.message }, 500);
      }
    } else {
      runId = ins.id;
    }
  }

  // 4) Injeta system_prompt do agent_config se não houver system na entrada
  const finalMessages: Message[] = (() => {
    const hasSys = messages.some((m) => m.role === "system");
    if (hasSys || !cfg.system_prompt) return messages;
    return [{ role: "system", content: cfg.system_prompt }, ...messages];
  })();

  // 5) Dispatch
  try {
    const out = await dispatch(cfg, finalMessages);
    const duration_ms = Date.now() - t0;
    const cost_usd = estimateCost(cfg.llm_model, out.tokens_in, out.tokens_out);

    await supa.from("agent_runs").update({
      output: out.content,
      tokens_in: out.tokens_in,
      tokens_out: out.tokens_out,
      cost_usd,
      duration_ms,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", runId);

    return jsonResponse({
      content: out.content,
      tokens_in: out.tokens_in,
      tokens_out: out.tokens_out,
      provider: cfg.llm_provider,
      model: cfg.llm_model,
      cost_usd,
      duration_ms,
      agent_run_id: runId,
      cached: false,
    });
  } catch (e) {
    const duration_ms = Date.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    await supa.from("agent_runs").update({
      status: "failed",
      error: msg,
      duration_ms,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    console.error(`[llm-invoke] ${cfg.llm_provider}/${cfg.llm_model} failed:`, msg);
    return jsonResponse({ error: "llm_call_failed", detail: msg, agent_run_id: runId }, 502);
  }
});

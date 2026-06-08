// Unified LLM client — OpenAI, Anthropic, Google
// Used by marketing edge functions to switch provider/model without redeploy

export interface LLMConfig {
  provider: "openai" | "anthropic" | "google";
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface AgentLLMConfig {
  llm_provider: "openai" | "anthropic" | "google";
  llm_model: string;
  llm_temperature: number;
  llm_max_tokens: number;
}

export async function loadAgentLLMConfig(
  db: ReturnType<typeof import("./auth.ts").adminClient>,
  agentName: string,
  fallback: LLMConfig,
): Promise<LLMConfig> {
  const { data, error } = await db
    .from("agent_configs")
    .select("llm_provider, llm_model, llm_temperature, llm_max_tokens")
    .eq("name", agentName)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    console.warn(`[llm-client] agent '${agentName}' not found in agent_configs — using fallback`);
    return fallback;
  }

  const cfg = data as AgentLLMConfig;
  return {
    provider: cfg.llm_provider,
    model: cfg.llm_model,
    temperature: cfg.llm_temperature,
    maxTokens: cfg.llm_max_tokens,
  };
}

export async function callLLM(
  config: LLMConfig,
  system: string,
  user: string,
): Promise<string> {
  switch (config.provider) {
    case "anthropic":
      return callAnthropic(config, system, user);
    case "openai":
      return callOpenAI(config, system, user);
    case "google":
      return callGemini(config, system, user);
    default:
      throw new Error(`[llm-client] unsupported provider: ${config.provider}`);
  }
}

async function callAnthropic(config: LLMConfig, system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("[llm-client] ANTHROPIC_API_KEY missing");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[llm-client] Anthropic error ${res.status}: ${body}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === "text")?.text ?? "";
}

async function callOpenAI(config: LLMConfig, system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("[llm-client] OPENAI_API_KEY missing");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: config.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[llm-client] OpenAI error ${res.status}: ${body}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(config: LLMConfig, system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("[llm-client] GOOGLE_API_KEY missing");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens ?? 4096,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[llm-client] Gemini error ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

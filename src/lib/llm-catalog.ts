// ============================================================
// LLM Catalog — multi-provider
// Exporta tanto o formato tipado (LLM_CONFIGS) quanto o legado
// Record<string,string[]> (LLM_CATALOG) usado por ModelSettings.tsx
// ============================================================

export type LLMProvider = 'anthropic' | 'openai' | 'google'

export interface LLMConfig {
  key: string
  provider: LLMProvider
  model: string
  displayName: string
  temperature: number
  maxTokens: number
  apiKeyEnv: string
  supportsVision?: boolean
  costTier: 'low' | 'medium' | 'high'
}

export const LLM_CONFIGS: LLMConfig[] = [
  // ── ANTHROPIC ──────────────────────────────────────────────
  {
    key: 'anthropic:claude-sonnet-4-6',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4.6',
    temperature: 0.7, maxTokens: 4096,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    supportsVision: true,
    costTier: 'medium',
  },
  {
    key: 'anthropic:claude-opus-4-6',
    provider: 'anthropic',
    model: 'claude-opus-4-6',
    displayName: 'Claude Opus 4.6',
    temperature: 0.5, maxTokens: 4096,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    supportsVision: true,
    costTier: 'high',
  },
  {
    key: 'anthropic:claude-haiku-4-5',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    temperature: 0.7, maxTokens: 2048,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    costTier: 'low',
  },
  // ── OPENAI ─────────────────────────────────────────────────
  {
    key: 'openai:gpt-4o',
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    temperature: 0.7, maxTokens: 4096,
    apiKeyEnv: 'OPENAI_API_KEY',
    supportsVision: true,
    costTier: 'medium',
  },
  {
    key: 'openai:gpt-4o-mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    temperature: 0.7, maxTokens: 2048,
    apiKeyEnv: 'OPENAI_API_KEY',
    costTier: 'low',
  },
  {
    key: 'openai:o3-mini',
    provider: 'openai',
    model: 'o3-mini',
    displayName: 'o3-mini',
    temperature: 0.3, maxTokens: 4096,
    apiKeyEnv: 'OPENAI_API_KEY',
    costTier: 'medium',
  },
  // ── GOOGLE GEMINI ──────────────────────────────────────────
  {
    key: 'google:gemini-2-0-flash',
    provider: 'google',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    temperature: 0.7, maxTokens: 4096,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    costTier: 'low',
  },
  {
    key: 'google:gemini-2-5-pro',
    provider: 'google',
    model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    temperature: 0.5, maxTokens: 8192,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    supportsVision: true,
    costTier: 'high',
  },
  {
    key: 'google:gemini-2-5-flash',
    provider: 'google',
    model: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    temperature: 0.7, maxTokens: 4096,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    costTier: 'low',
  },
]

// Configurações LLM padrão por agente do Marketing Squad
export const MARKETING_SQUAD_LLM_DEFAULTS: Record<string, string> = {
  lucio: 'google:gemini-2-0-flash',
  iris:  'anthropic:claude-haiku-4-5',
  maya:  'anthropic:claude-sonnet-4-6',
  teo:   'anthropic:claude-sonnet-4-6',
  vera:  'anthropic:claude-sonnet-4-6',
  sofia: 'anthropic:claude-opus-4-6',
  otto:  'anthropic:claude-sonnet-4-6',
}

export function getLLMConfig(key: string): LLMConfig | undefined {
  return LLM_CONFIGS.find(c => c.key === key)
}

export function getLLMsByProvider(provider: LLMProvider): LLMConfig[] {
  return LLM_CONFIGS.filter(c => c.provider === provider)
}

// ── Backward-compat para ModelSettings.tsx ─────────────────
// Mantém LLM_CATALOG como Record<string, string[]> com gateway format "provider/model"
export const LLM_CATALOG: Record<string, string[]> = LLM_CONFIGS.reduce<Record<string, string[]>>(
  (acc, cfg) => {
    const gatewayModel = `${cfg.provider}/${cfg.model}`
    ;(acc[cfg.provider] = acc[cfg.provider] ?? []).push(gatewayModel)
    return acc
  },
  {},
)

export const PROVIDERS = Object.keys(LLM_CATALOG)

export function providerFromModel(model: string | null | undefined): string {
  if (!model) return ''
  return model.split('/')[0] ?? ''
}

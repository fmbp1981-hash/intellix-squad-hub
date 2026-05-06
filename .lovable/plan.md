
# Prompt A — OpenSquad Platform (reset arquitetural)

Esta revisão substitui a arquitetura atual baseada em VPS+Claude por execução **100% nativa Lovable + Supabase**, com **Gemini 3 como LLM padrão** e OpenAI como fallback. Escritório virtual em **Phaser** (stack imutável: nada de Three.js/R3F).

## Ajuste de modelo padrão (Gemini 3)

A família Gemini 3 disponível no Lovable AI Gateway é:
- `google/gemini-3-flash-preview` — **padrão** para todos os agentes (rápido, multimodal, ótimo custo/latência)
- `google/gemini-3.1-pro-preview` — usado para Lead Analyst, Strategist e Ágata (raciocínio profundo)
- `google/gemini-3.1-flash-lite-preview` — usado para Reviewer e jobs leves
- `google/gemini-3-pro-image-preview` / `google/gemini-3.1-flash-image-preview` — geração/edição de imagem (Nano Banana 2)

Como Gemini 3 está em preview e ainda não tem SDK estável `@google/generative-ai`, vou **rotear todas as chamadas LLM através do Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`, compatível com OpenAI API). Isso elimina:
- necessidade do secret `GEMINI_API_KEY` (substituído por `LOVABLE_API_KEY`, já provisionado)
- necessidade do secret `OPENAI_API_KEY` (mesmo gateway serve OpenAI como fallback via `openai/gpt-5.5` ou `openai/gpt-5-mini`)
- dependências `@google/generative-ai` e `openai` nas Edge Functions (substituídas por `fetch` direto)

### Seeds atualizados de `llm_configs`
| config_key | provider | model | fallback_provider | fallback_model |
|---|---|---|---|---|
| `default` | gemini | `google/gemini-3-flash-preview` | openai | `openai/gpt-5-mini` |
| `squad:*:lead-analyst` | gemini | `google/gemini-3.1-pro-preview` | openai | `openai/gpt-5` |
| `squad:*:specialist` | gemini | `google/gemini-3-flash-preview` | openai | `openai/gpt-5-mini` |
| `squad:*:strategist` | gemini | `google/gemini-3.1-pro-preview` | openai | `openai/gpt-5` |
| `squad:*:reviewer` | gemini | `google/gemini-3.1-flash-lite-preview` | openai | `openai/gpt-5-nano` |
| `internal:gestao:daily-standup` | gemini | `google/gemini-3.1-pro-preview` | openai | `openai/gpt-5` |
| `internal:gestao:weekly-review` | gemini | `google/gemini-3.1-pro-preview` | openai | `openai/gpt-5` |
| `internal:gestao:on-demand-brief` | gemini | `google/gemini-3-flash-preview` | openai | `openai/gpt-5-mini` |
| `internal:gestao:incident-response` | gemini | `google/gemini-3-flash-preview` | openai | `openai/gpt-5-mini` |
| `job-weight:heavy` | gemini | `google/gemini-3.1-pro-preview` | openai | `openai/gpt-5` |
| `job-weight:light` | gemini | `google/gemini-3.1-flash-lite-preview` | openai | `openai/gpt-5-nano` |

### `GEMINI_MODELS` no `src/types/index.ts`
```ts
export const GEMINI_MODELS = [
  { id: 'google/gemini-3.1-pro-preview',        label: 'Gemini 3.1 Pro (preview)' },
  { id: 'google/gemini-3-flash-preview',        label: 'Gemini 3 Flash (preview) — padrão' },
  { id: 'google/gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (preview)' },
  { id: 'google/gemini-3-pro-image-preview',    label: 'Gemini 3 Pro Image (preview)' },
  { id: 'google/gemini-3.1-flash-image-preview',label: 'Gemini 3.1 Flash Image (Nano Banana 2)' },
  { id: 'google/gemini-2.5-pro',                label: 'Gemini 2.5 Pro (legado)' },
  { id: 'google/gemini-2.5-flash',              label: 'Gemini 2.5 Flash (legado)' },
] as const;

export const OPENAI_MODELS = [
  { id: 'openai/gpt-5',      label: 'GPT-5' },
  { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { id: 'openai/gpt-5-nano', label: 'GPT-5 Nano' },
  { id: 'openai/gpt-5.5',    label: 'GPT-5.5' },
] as const;
```

### `_shared/llm-provider.ts` (simplificado)
Em vez de dois SDKs, faz `fetch` ao Lovable AI Gateway, tratando 429 (rate limit) e 402 (créditos). Fallback acontece trocando o `model` para o `fallback_model` no mesmo gateway. Pricing local apenas para auditoria interna; cobrança real é debitada da workspace Lovable.

### Secrets revisados
Remover `GEMINI_API_KEY` e `OPENAI_API_KEY` da lista (não são mais necessários — `LOVABLE_API_KEY` é auto-provisionado). Mantidos: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `ADMIN_WHATSAPP_NUMBER`, `INTERNAL_SECRET`, placeholders META.

---

## Restante do plano (sem alterações)

Tudo o que foi descrito no plano anterior continua valendo:

1. **Migrations** 0003 (user_roles + has_role) → 0004 (squad_configs/agent_configs/run_queue/etc) → 0005 (internal_jobs/briefings/directives/okrs) → 0007 (audit + notifications + pg_cron) → 0009 (llm_configs com seeds acima) → 0010 (whatsapp_configs) → 0011 (seed dos 12 squads e agentes Ana/Carlos/Beatriz/Roberto + Ágata/Maya/Flora/Márcio/Heitor)
2. **Edge Functions**: `_shared/llm-provider.ts`, `_shared/whatsapp-provider.ts`, `run-start`, `run-step` (núcleo), `run-abort`, `send-whatsapp`, `notification-dispatcher` (cron). Remover `squad-run-start` e `squad-state-update` (VPS).
3. **Frontend**: instalar `phaser`, `zustand`, `marked`, `react-hook-form`, `zod`, `@hookform/resolvers`. Criar `IntelliXOfficeViewer` (Phaser dynamic import), `IntelliXOfficeScene`, `DepartmentCard`, `JobLauncher`, `KillSwitchButton`, `AgentStatusBadge`, `MarkdownOutput`. Hooks `useInternalOffice`, `useUnifiedFeed`. Páginas `/dashboard`, `/office`, `/office/department/:dept`, `/jobs`, `/jobs/:id`, `/settings/models`, `/settings/whatsapp`. Refatorar `RunDashboard` para invocar `run-start`. Remover `OfficeViewer3D` (R3F).
4. **Critério de validação**: dispatch TI health-check → Phaser anima Heitor → output em `/jobs/:id` → WhatsApp via Evolution → kill switch funcional → `/settings/models` editável.

## Ordem de implementação ao aprovar
1. Migration 0003 (user_roles)
2. Migrations 0004→0011 com seeds Gemini 3
3. Solicitar secrets Evolution + admin WhatsApp number
4. `_shared/llm-provider.ts` (Lovable AI Gateway) + `_shared/whatsapp-provider.ts`
5. Edge Functions `run-start`, `run-step`, `run-abort`, `send-whatsapp`, `notification-dispatcher`
6. Tipos + Zustand stores
7. `IntelliXOfficeViewer` (Phaser) + componentes shared
8. Páginas novas + `/settings/*`
9. Refator `RunDashboard` + remoção do código VPS/R3F
10. Smoke test

Confirma para começar pela migração 0003?

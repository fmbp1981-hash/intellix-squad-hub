
# OpenSquad — Reset arquitetural (execução)

Supabase conectado (`hynadwlwrscvjubryqlg`). Confirmações do usuário:
1. WhatsApp/Evolution: configuração via **painel do sistema** (`/settings/whatsapp`), não como secrets. Edge functions terão guard "not configured".
2. Fluxo 100% fora da VPS — remover código legado.

## 1. Migrations (na ordem)

**0004 — Núcleo de execução**
- `squad_configs` (id, key, name, department, description, default_llm_config, active, created_at)
- `agent_configs` (id, squad_id FK, role enum lead-analyst|specialist|strategist|reviewer, name, persona, llm_config_key, position_x, position_y, active)
- `run_queue` (id, run_id, priority, locked_at, locked_by, attempts)
- `run_steps` (id, run_id FK squad_runs, agent_id FK, step_index, input_jsonb, output_markdown, tokens_in, tokens_out, cost_cents, latency_ms, status, error, started_at, completed_at)
- RLS via `has_role(auth.uid(),'admin')` (criar `app_role` enum + `has_role` SECURITY DEFINER, conforme padrão de roles)

**0005 — Gestão interna**
- `internal_jobs` (id, kind enum daily-standup|weekly-review|on-demand-brief|incident-response, dept, status, payload, output_markdown, created_by, scheduled_for, started_at, completed_at)
- `briefings`, `directives`, `okrs` (estrutura conforme plano original)

**0007 — Auditoria + notificações + cron**
- `audit_log` (id, actor_id, action, entity, entity_id, diff jsonb, at)
- `notifications` (id, user_id, channel enum app|whatsapp, title, body, status, sent_at)
- `pg_cron` jobs: `notification-dispatcher` a cada 1min, `daily-standup` 09:00 BRT, `weekly-review` segunda 08:00 BRT

**0009 — LLM configs (Lovable AI Gateway)**
- `llm_configs` (config_key PK, provider, model, fallback_provider, fallback_model, temperature, max_tokens, updated_at)
- Seeds com Gemini 3 (default `google/gemini-3-flash-preview`, lead/strategist `google/gemini-3.1-pro-preview`, reviewer `google/gemini-3.1-flash-lite-preview`, fallback OpenAI via gateway)

**0010 — WhatsApp configs**
- `whatsapp_configs` (id, instance_url, instance_token_encrypted, admin_number, active, created_by, updated_at) — single-row, editável via UI

**0011 — Seed dos squads**
- 12 squads + agentes Ana, Carlos, Beatriz, Roberto (entrega) + Ágata, Maya, Flora, Márcio, Heitor (gestão interna)

`squad-runs.workspace_id` será migrado para FK em `workspaces` (já compatível). Migração de `created_by` para FK em auth.users.

## 2. Edge Functions

Roteadas via **Lovable AI Gateway** (`LOVABLE_API_KEY` já presente). Removo dependências de SDK Gemini/OpenAI.

- `_shared/llm-provider.ts` — fetch ao `https://ai.gateway.lovable.dev/v1/chat/completions`, trata 429/402, fallback automático
- `_shared/whatsapp-provider.ts` — lê `whatsapp_configs`; se não configurado, retorna `{skipped:'not_configured'}` sem erro
- `_shared/auth.ts` — valida JWT + `has_role`
- `run-start` — cria `squad_runs`, enfileira em `run_queue`, dispara `run-step`
- `run-step` — pega próximo agente, chama LLM, persiste `run_steps`, encadeia ou conclui
- `run-abort` — kill switch (status=aborted)
- `send-whatsapp` — usa whatsapp-provider; entrada validada com Zod
- `notification-dispatcher` — cron, processa `notifications` pendentes
- `internal-job-trigger` — usado pelos cron jobs (standup/weekly)

Todos com CORS, validação Zod, JWT em código (`verify_jwt = false` no config), nenhum SQL cru.

**Remover**: `supabase/functions/squad-run-start`, `supabase/functions/squad-state-update` (via `delete_edge_functions`), entradas correspondentes em `config.toml`.

## 3. Frontend

**Dependências**: `phaser`, `zustand`, `marked`, `react-hook-form`, `zod`, `@hookform/resolvers`.

**Componentes novos**:
- `IntelliXOfficeViewer` (lazy + dynamic import Phaser)
- `IntelliXOfficeScene` (cena Phaser com sprites dos agentes)
- `DepartmentCard`, `JobLauncher`, `KillSwitchButton`, `AgentStatusBadge`, `MarkdownOutput`

**Hooks**: `useInternalOffice`, `useUnifiedFeed` (Realtime em `squad_runs` + `internal_jobs` + `notifications`).

**Páginas**:
- `/dashboard` — feed unificado + KPIs
- `/office` — visão geral Phaser
- `/office/department/:dept` — departamento isolado
- `/jobs`, `/jobs/:id` — lista + detalhe com markdown
- `/settings/models` — CRUD `llm_configs`
- `/settings/whatsapp` — CRUD `whatsapp_configs` (resolve confirmação #1)

**Refator**: `RunDashboard` invoca `run-start` em vez de `squad-run-start`.

**Remover**: `OfficeViewer3D.tsx`, `useOfficeChoreography.ts` (R3F), dependências `@react-three/*` se houver, secrets VPS (`VPS_RUNNER_URL`, `VPS_RUNNER_SECRET`, `CALLBACK_SECRET` — via `delete_secret`).

## 4. Smoke test

1. Login como admin (criar role manualmente em `user_roles` para o usuário atual)
2. `/settings/models` carrega seeds Gemini 3
3. `/office` → click departamento TI → "Health-check"
4. Phaser anima Heitor; `run_steps` populando em realtime
5. Output markdown renderiza em `/jobs/:id`
6. WhatsApp pulado com aviso "configure em /settings/whatsapp"
7. Configurar Evolution na UI → re-testar → mensagem chega
8. Kill switch interrompe run em andamento

## Ordem de execução ao aprovar

1. Migration 0004 (com `app_role` + `has_role`)
2. Migrations 0005, 0007, 0009, 0010, 0011 (em sequência, cada uma após aprovação)
3. `_shared/*` + edge functions novas
4. Remoção edge functions VPS + secrets VPS + `OfficeViewer3D`
5. Install deps + tipos + Zustand stores
6. Páginas novas + refator `RunDashboard`
7. Smoke test guiado

Aprovar para iniciar pela **Migration 0004**.

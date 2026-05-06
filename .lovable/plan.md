## Escopo

Implementar o **Prompt B** completo: Ágata (COO digital) + CRM nativo + crons + triggers + UI. Como é um bloco grande, vou executar em **3 ondas** dentro do mesmo loop, sem pedir aprovação a cada passo.

> Algumas tabelas referenciadas pelo prompt (`gestao_briefings`, `gestao_directives`, `token_usage`, `agent_configs.system_prompt`, `okrs.key_result/target_value/current_value/active`) **não existem ainda no banco** — aparentemente são premissas do "Prompt A". Vou criá-las nesta migração para o sistema funcionar de ponta a ponta. Se você já as tem com nomes diferentes, me avise antes de eu rodar a migration.

---

## Onda 1 — Banco

**Migration única** (`20260506_prompt_b.sql`):
- Tabelas CRM: `leads`, `deals`, `contracts`, `invoices`, `engagements` (com RLS admin, índices, triggers `updated_at`, realtime)
- Tabelas Ágata: `gestao_briefings`, `gestao_directives`, `token_usage` (com RLS admin)
- Ajustes: adicionar colunas em `okrs` (`key_result`, `target_value`, `current_value`, `metric_unit`, `status`, `active`) e em `agent_configs` (`system_prompt`, `agent_key`, `squad_name`) e em `internal_jobs` (`job_id`, `job_input`, `trigger_source`, `parent_directive_id`, `estimated_tokens`, `sla_deadline`)
- Triggers `pg_net` para `crm-event-handler` em lead qualified / deal won / contract signed / engagement blocked
- 4 cron jobs `pg_cron`: daily_standup (11h UTC), weekly_review (dom 21h UTC), notification dispatcher (5min), overdue check (12h UTC)
- Seed inicial dos OKRs Q2 2026

> ⚠️ Você precisará rodar manualmente após a migration:
> ```sql
> ALTER DATABASE postgres SET app.supabase_url = 'https://hynadwlwrscvjubryqlg.supabase.co';
> ALTER DATABASE postgres SET app.internal_secret = '<valor do INTERNAL_SECRET>';
> ```
> e habilitar `pg_cron` + `pg_net` no painel se ainda não estiverem.

## Onda 2 — Edge Functions e secrets

- Pedir secret `INTERNAL_SECRET` se não existir
- Criar `_shared/agata-context-builder.ts` e `_shared/job-catalog.ts`
- Atualizar `_shared/llm-provider.ts` com `extractDirectivesJson` / `extractDecisionsForFelipe`
- Novas functions: `gestao-trigger`, `internal-job-dispatch`, `gestao-directive-dispatch`, `crm-event-handler`
- Patch em `run-step` para parsear output da Ágata (squad `intellix-gestao`) e gravar briefing + directives

## Onda 3 — Frontend

- Tipos em `src/types/index.ts` (Lead, Deal, Contract, Invoice, Engagement, OKR, GestaoBriefing, GestaoDirective)
- Hooks: `useGestao`, `useCrm`, `useOKRs`
- Componentes Gestão: `BriefingViewer`, `DirectiveCard`, `DirectiveKanban`, `OKRPanel`, `OKREditor`, `AskAgataChat`, `GestaoStatusCard`
- Componentes CRM: `LeadCard/Form/StatusBadge`, `DealCard/KanbanBoard/Form`, `ContractCard/Form`, `InvoiceTable`, `EngagementCard/HealthBadge`, `FunnelChart`
- Páginas: `/office/gestao`, `/crm` (dashboard), `/crm/leads`, `/crm/leads/:id`, `/crm/deals`, `/crm/deals/:id`, `/crm/contracts`, `/crm/contracts/:id`, `/crm/invoices`, `/crm/engagements`
- Atualizar `AppSidebar` com itens **CRM** e **Ágata** e o `App.tsx` com as rotas

## Notas

- O system prompt da Ágata precisa ser colado por você em `agent_configs` após o deploy (não tenho o conteúdo do `IntelliX_Skills_Specification_v2.md`).
- "Empty states" estarão em todas as listas.
- Vou usar `react-hook-form + zod` (já no projeto) para forms e `recharts` para o `FunnelChart`.

Posso seguir?

# Fechamento do Lote D — Integrações & Production-Ready

Quatro frentes pendentes para deixar CRM + Projetos Ágeis prontos para produção.

## 1. Templates de E-mail (`email_templates`)

**Migration:**
- Tabela `email_templates`: `id`, `key` (unique, ex: `deal_won_welcome`), `name`, `subject`, `html`, `text`, `description`, `variables jsonb` (lista de placeholders esperados), `enabled`, timestamps.
- RLS: leitura para qualquer authenticated; escrita apenas `admin` (via `has_role`).
- Seed inicial com 4 templates: `deal_won_welcome`, `lead_qualified_followup`, `contract_signed_kickoff`, `invoice_overdue_reminder` — usando placeholders `{{nome}}`, `{{empresa}}`, `{{valor}}` etc.

**Edge Function `send-email` (refatorar):**
- Aceitar `template_key` + `variables` no payload. Quando presente, busca template, faz substituição simples `{{var}}` → valor, popula `subject`/`html`. Mantém compatibilidade com `subject`/`html` diretos.
- Helper `_shared/email.ts` ganha o mesmo suporte.

**UI — nova página `src/pages/settings/EmailTemplatesPage.tsx`:**
- Lista de templates com badge de status.
- Editor (modal) com campos `subject`, `html` (textarea), `text`, `variables` (chips) e botão **Pré-visualizar** (renderiza substituindo com valores fictícios).
- Botão **Enviar teste** que invoca `send-email` com o template selecionado.
- Adicionar nova aba "Templates de E-mail" no `IntegrationsPage` ou em `SettingsPage` (preferência: aba dentro de Settings).

## 2. Notificações in-app no `crm-event-handler`

**Edge Function:**
- Após cada evento relevante (`lead_qualified`, `deal_won`, `contract_signed`, `engagement_blocked`, `invoice_overdue`), chamar `notification-dispatcher` (já existente) com payload padronizado.
- Resolver destinatários: `owner_id`/`assigned_to` da entidade; fallback para todos os admins (via `user_roles`).
- Categoria `crm`, prioridade conforme evento (`deal_won` = high, `engagement_blocked` = high, demais = normal).
- Inserir registro em `notifications` (já consumida pelo `NotificationBell`) com link contextual (`/crm/deals/:id` etc.).

## 3. Refinar RLS via `user_roles`

**Migration de revisão:**
- Auditar policies das tabelas CRM/Ágil (`deals`, `leads`, `contracts`, `invoices`, `engagements`, `agile_projects`, `crm_automations`, `outbound_webhooks`, `email_log`, novas `email_templates`).
- Padrão:
  - SELECT: authenticated (todos os usuários internos visualizam).
  - INSERT/UPDATE/DELETE em entidades operacionais: authenticated (mantém produtividade do time).
  - INSERT/UPDATE/DELETE em config sensível (`crm_automations`, `outbound_webhooks`, `email_templates`, `crm_pipelines/stages`): apenas `has_role(auth.uid(),'admin')`.
- Drop policies legadas conflitantes antes de recriar.

## 4. Seed de Pipeline padrão para novos workspaces

**Decisão sobre escopo:**
- Hoje não há tabela `crm_pipelines`/`pipeline_stages` — `deals.stage` é string livre.
- Criar tabela `crm_pipeline_stages`: `id`, `key`, `name`, `order`, `probability`, `color`, `is_won`, `is_lost`, `enabled`.
- Seed com stages padrão: `prospeccao` (10%), `qualificacao` (25%), `proposta` (50%), `negociacao` (75%), `fechado_ganho` (100%, is_won), `fechado_perdido` (0%, is_lost).
- Atualizar `DealKanban` para ler colunas dinamicamente da tabela em vez de hardcoded.
- RLS: leitura authenticated, escrita admin.

## Arquivos

**Migrations (1 nova):**
- `supabase/migrations/<timestamp>_lote_d_close.sql` — cria `email_templates`, `crm_pipeline_stages`, seeds, ajusta RLS.

**Edge Functions:**
- ✏️ `supabase/functions/send-email/index.ts` — suporte a `template_key`.
- ✏️ `supabase/functions/_shared/email.ts` — idem.
- ✏️ `supabase/functions/crm-event-handler/index.ts` — disparo de notificações.

**Frontend:**
- 🆕 `src/pages/settings/EmailTemplatesPage.tsx`
- 🆕 `src/hooks/useEmailTemplates.ts`
- ✏️ `src/pages/settings/SettingsPage.tsx` — nova aba "Templates".
- ✏️ `src/pages/crm/DealKanban.tsx` — colunas dinâmicas.

## Detalhes Técnicos

- Substituição de placeholders: regex simples `/\{\{\s*(\w+)\s*\}\}/g` no servidor (sem libs).
- `notification-dispatcher` já é internal — chamada via service role, sem CORS.
- Migrations idempotentes (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
- Sem mudanças em `auth.users` ou schemas reservados.

## Ordem de execução

1. Migration (templates, stages, RLS, seeds).
2. Refatorar `send-email` + helper.
3. Atualizar `crm-event-handler` com notificações.
4. Página de templates + hook + nova aba.
5. `DealKanban` dinâmico.

Confirma para executar?

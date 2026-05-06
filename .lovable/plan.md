
# Lote D2 — Settings expandido

Reorganiza `/settings` em layout com sidebar interna + sub-rotas dedicadas. Cada página é independente e usa as tabelas/secrets já existentes.

## Novos arquivos

- `src/pages/settings/SettingsLayout.tsx` — sidebar secundária (Comunicação / IA & Agentes / Financeiro / Conta) com `<Outlet />`.
- `src/pages/settings/AgentsSettings.tsx` — lista `agent_configs` agrupados por `squad_id`, modal para editar `persona`, `system_prompt`, `llm_config_key`. Usa `admin_all` RLS já existente.
- `src/pages/settings/SquadsSettings.tsx` — CRUD em `squad_configs` (toggle ativo, nome, departamento, default_llm_config).
- `src/pages/settings/BudgetsSettings.tsx` — edita `token_usage.budget_usd` por scope (global + por departamento) com gráfico de uso histórico (Recharts AreaChart, dados de `token_usage` agrupados por mês).
- `src/pages/settings/ProfileSettings.tsx` — atualiza `auth.users` user_metadata (full_name, timezone, locale) via `supabase.auth.updateUser`. Sem nova tabela.

## Arquivos editados

- `src/pages/settings/SettingsPage.tsx` — vira redirect simples para `/settings/notifications` (default).
- `src/App.tsx` — substitui rota única `/settings` por rota com children:
  - `/settings` → redirect `/settings/notifications`
  - `/settings/notifications` → `<NotificationPreferences />`
  - `/settings/whatsapp` → `<WhatsAppSettings />`
  - `/settings/models` → `<ModelSettings />` (com bloco "Testar modelo" + gráfico de custo)
  - `/settings/email-templates` → `<EmailTemplatesPage />`
  - `/settings/agents` → `<AgentsSettings />`
  - `/settings/squads` → `<SquadsSettings />`
  - `/settings/budgets` → `<BudgetsSettings />`
  - `/settings/profile` → `<ProfileSettings />`
  - `/settings/integrations` → `<IntegrationsPage />` (mantém)
- `src/pages/settings/ModelSettings.tsx` — adiciona seção "Testar modelo" (chama edge function existente que use Lovable AI Gateway, com fallback simples) + Recharts BarChart de custo dos últimos 7 dias agrupado por scope (lê `token_usage`).
- `src/components/layout/AppSidebar.tsx` — remove entrada duplicada "Integrações" (vira sub-item de Settings).

## Migrations

Nenhuma migration necessária — todas as tabelas (`agent_configs`, `squad_configs`, `token_usage`, `notification_preferences`) já existem com RLS adequado.

## Notas

- ProfileSettings: timezone e locale persistidos em `auth.users.user_metadata` (já suportado pelo Supabase Auth, não precisa nova tabela).
- "Testar modelo": invoca uma edge function leve (vou reusar `ai-assistant` se existir; senão criar `model-test` minimal usando `LOVABLE_API_KEY` + Lovable AI Gateway). Confirmo no momento da implementação.
- Sem novas dependências.

Aprovar para implementar?

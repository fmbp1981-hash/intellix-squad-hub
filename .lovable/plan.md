# Lote D — IA, CRM Avançado e Integrações

Fechamento da plataforma com camada de inteligência transversal, evolução do CRM (forecast, automações, comunicação) e integrações externas para produtividade do time.

## 1. Camada de IA transversal (Operations + Commercial Agents)

**Edge Function `ai-assistant` (novo)** — gateway único de IA conversacional contextual:
- Recebe `{ context: 'project'|'deal'|'sprint'|'global', entityId, prompt, history }`
- Carrega contexto da entidade no servidor (RLS-aware via service role + user check)
- Streaming SSE usando Lovable AI Gateway (`google/gemini-3-flash-preview` default)
- Modos: `ask` (Q&A), `summarize`, `next_actions`, `risk_analysis`

**Edge Function `ai-deal-coach` (novo)** — Commercial Agent:
- Analisa deal (histórico, atividades, lead score, estágio, valor)
- Retorna: probabilidade de fechamento, próximas ações sugeridas, riscos, e-mail de follow-up draft
- Persistência em nova tabela `deal_ai_insights` (deal_id, generated_at, score, recommendations jsonb, draft_email)

**Edge Function `ai-sprint-coach` (novo)** — Operations Agent contínuo:
- Analisa sprint ativa: burndown, throughput, impedimentos, capacidade
- Detecta riscos (atraso, scope creep, blocker antigo) e gera alertas em `sprint_ai_alerts`
- Sugere replanejamento ou redistribuição de tarefas

**UI:**
- Componente `<AIAssistantPanel />` reusável (drawer lateral) plugado em ProjectOverview, DealKanban e SprintBoardPage
- Card "Insights da IA" em DealKanban (detail drawer) e SprintsPage

## 2. CRM Avançado

**Forecast & Pipeline Analytics (`/crm/forecast`)**
- Nova página com: pipeline weighted forecast (valor × probabilidade × stage), velocity de fechamento, win rate por origem/owner, ciclo médio
- Charts (recharts): forecast por mês (3 meses), funil de conversão, performance por vendedor

**Automações de CRM (tabela nova `crm_automations`)**
- Triggers: `lead_created`, `deal_stage_changed`, `deal_idle_X_days`, `contract_expiring`
- Actions: `assign_owner`, `create_task`, `send_notification`, `trigger_ai_coach`, `send_whatsapp`
- UI: `/crm/automations` com builder simples (lista de regras condição → ação)
- Edge function `crm-automation-runner` consome eventos do `crm-event-handler` e executa regras

**Atividades & Timeline unificada**
- Tabela `crm_activities` (call, email, meeting, note, whatsapp_sent) ligada a lead/deal/contact
- Componente `<ActivityTimeline />` renderizado em detalhe de Deal e Lead
- Auto-log de eventos do sistema (stage change, AI insights gerados, mensagens WhatsApp enviadas)

**Lead Scoring automático**
- Edge function `lead-score-calculator` (cron diário + on-update)
- Considera: origem, engajamento, completude de dados, tempo no estágio
- Atualiza `leads.score` e dispara `lead_qualified` quando ≥ 80

## 3. Integrações externas

**E-mail (Resend)**
- Edge function `send-email` (template + tracking)
- Usado para: follow-ups gerados pela IA, notificações de impedimento crítico, contratos assinados, faturas
- Conector: solicitar `RESEND_API_KEY` quando confirmado

**Calendar (Google Calendar via connector)**
- Sincroniza meetings de `crm_activities` (type=meeting) com o calendário do owner
- Edge function `calendar-sync` usando gateway de connectors

**Slack/Teams (notificações em tempo real)**
- Connector standard (Slack ou Microsoft Teams)
- Edge function `notification-dispatcher` (já existe) ganha provider Slack/Teams além de WhatsApp/in-app
- Eventos: deal won, impedimento crítico, sprint completada, alerta da IA

**Webhooks de saída (`outbound_webhooks`)**
- Tabela com URL + eventos assinados + secret HMAC
- UI em `/settings/integrations` para clientes plugarem ERPs/Zapier/n8n

## 4. Banco de dados — novas tabelas

- `deal_ai_insights` (id, deal_id, generated_at, win_probability, recommendations jsonb, draft_email text, model)
- `sprint_ai_alerts` (id, sprint_id, project_id, severity, type, message, suggested_action, acknowledged_at)
- `crm_automations` (id, name, trigger_type, conditions jsonb, actions jsonb, enabled, created_by)
- `crm_activities` (id, type, subject, body, lead_id, deal_id, contact_id, owner_id, occurred_at, metadata jsonb)
- `outbound_webhooks` (id, url, events text[], secret, enabled, created_by)
- `email_log` (id, to, subject, template, status, provider_id, related_entity_type, related_entity_id)

Todas com RLS baseada em `has_role` + ownership.

## 5. UI / Rotas novas

- `/crm/forecast` — Forecast & analytics
- `/crm/automations` — Builder de automações
- `/crm/activities` — Timeline global (filtrável)
- `/settings/integrations` — Conectores (e-mail, calendar, Slack/Teams, webhooks)
- Drawer `<AIAssistantPanel />` em Projects, Deals, Sprints
- Sidebar atualizada (Lote D adiciona itens ao menu CRM e Settings)

## 6. Detalhes técnicos

- Streaming SSE conforme padrão Lovable AI (line-by-line, [DONE], CRLF, 429/402 toasts)
- Tool calling para outputs estruturados (deal coach, sprint coach)
- Realtime: novas tabelas com `replica identity full` + publication para insights/alerts em tempo real
- Edge functions seguem padrão atual (CORS, validação Zod, JWT-in-code)
- Connectors usam fluxo `standard_connectors--connect` antes do código que os consome
- Secrets necessários (solicitados sob demanda): `RESEND_API_KEY` (e-mail). Slack/Teams/Calendar via connector gateway (sem secret manual)

## Ordem de execução proposta

1. Schema (migration única) + RLS
2. Camada IA: `ai-assistant`, `ai-deal-coach`, `ai-sprint-coach` + painel UI
3. CRM avançado: forecast, activities timeline, lead scoring
4. Automações CRM (engine + UI)
5. Integrações: Resend (e-mail), connectors (Calendar, Slack/Teams), webhooks de saída
6. Polimento: realtime, sidebar, settings

Posso seguir com a execução nessa ordem.

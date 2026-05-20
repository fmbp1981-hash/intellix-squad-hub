# ESTADO ATUAL · intellix-squad-hub

> Mapa fiel do código real (não da intenção)
> Data da análise: Maio 2026
> Fonte: repositório `fmbp1981-hash/intellix-squad-hub` (296 commits, branch main)

---

## 1. Identidade do sistema

- **Nome no código:** `IntelliX OpenSquad Platform`
- **Projeto Supabase:** `hynadwlwrscvjubryqlg`
- **Plataforma de desenvolvimento:** Lovable (com `lovable-tagger` em devDeps)
- **Stack:** Vite 5 + React 18 + TypeScript + Shadcn/UI + Tailwind + Supabase + Phaser 4
- **Modelo de IA:** via `LOVABLE_API_KEY` (gateway Lovable AI), catálogo limitado a Google Gemini + OpenAI GPT-5 — **sem Anthropic Claude**

---

## 2. Arquitetura em alto nível

```
┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Vite + React)                    │
│                                                                  │
│  AppLayout (sidebar fixo) → rotas protegidas                     │
│                                                                  │
│  Sidebar oficial:                                                │
│    Painel · Escritório (Phaser+Ágata) · Pipeline · Jobs ·        │
│    Squads · Projetos · Config                                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Postgres + RLS)                    │
│                                                                  │
│  39 tabelas · 32 migrations · RLS habilitada em tudo             │
│  24 edge functions Deno                                          │
│  Orquestração de agentes: run_queue + run_steps + squad_runs     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     EDGE FUNCTIONS (Deno)                        │
│                                                                  │
│  Execução de squad: run-start → run-step → run-abort             │
│  IA contextual: ai-assistant, ai-deal-coach, ai-sprint-coach     │
│  Automação CRM: crm-event-handler, crm-automation-runner         │
│  Jobs internos: internal-job-trigger, internal-job-dispatch      │
│  Comunicação: send-email, send-whatsapp, notification-dispatcher │
│  Integrações: drive-setup, outbound-webhook-dispatcher           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Navegação real (do AppSidebar)

| Grupo | Item | Rota | Status |
|---|---|---|---|
| Visão Geral | Painel | `/painel` | ✅ Implementado (PainelPage com MetricsBar + UnifiedFeed + alertas da Ágata) |
| IntelliX | Escritório | `/escritorio` | ✅ Implementado (tabs: Office Phaser + Ágata Gestão) |
| IntelliX | Pipeline | `/pipeline` | ✅ Existe (badge: leads) |
| IntelliX | Jobs | `/jobs` | ✅ Existe (badge: jobs) |
| Squad Hub | Squads | `/squads` | ✅ Existe (badge: engagements) |
| Projetos Ágeis | Projetos | `/projetos` | ✅ Existe (ProjetoDetailPage) |
| Sistema | Config | `/config` | ✅ Implementado (tabs: Agentes + Canais + Perfil) |

**Rotas legadas funcionais (não no sidebar, mantidas para retrocompatibilidade):**
- `/dashboard`, `/office`, `/workspaces`, `/projects`, `/settings/*`, `/exports`, `/crm/*`

Detalhe importante: `/escritorio` e `/config` são **wrappers com tabs** que reutilizam as páginas legadas (`OfficePage`, `OfficeGestao`, `AgentsSettings`, `WhatsAppSettings`, `ModelSettings`, `ProfileSettings`). Não é duplicação — é reorganização de UX.

---

## 4. Schema Supabase — 39 tabelas agrupadas

### 4.1 Core / Identidade do Squad
- `squad_configs` — configuração dos squads (internal-marketing, internal-sdr, internal-operacoes, etc.)
- `agent_configs` — agentes individuais com `persona` (prompt longo hardcoded), `squad_id`, `role`, `sprite_key`
- `sprite_assets` — PNGs base64 dos pixel-arts dos agentes (96×144 por frame × 10 frames)
- `llm_configs` — configurações de modelos LLM
- `whatsapp_configs` — config de WhatsApp por squad
- `drive_setup` — config Google Drive
- `outbound_webhooks` — webhooks de saída

### 4.2 Execução de squads
- `squad_runs` — execuções de squad (com `state_snapshot` JSONB)
- `run_queue` — fila de jobs com prioridade
- `run_steps` — passos de execução de cada run
- `internal_jobs` — jobs internos

### 4.3 Projetos Ágeis (Scrum/Kanban)
- `agile_projects` — projetos com `is_portfolio` flag e `ai_scrum_master` boolean
- `briefings`, `gestao_briefings` — briefings
- `directives`, `gestao_directives` — diretrizes da Ágata
- `epics`, `user_stories`, `tasks`, `impediments` — entidades Scrum
- `sprints`, `sprint_metrics`, `sprint_ai_alerts` — sprints
- `velocity_history`, `release_plans`, `okrs` — métricas e planejamento

### 4.4 CRM
- `leads`, `deals`, `deal_ai_insights`
- `contracts`, `invoices`, `engagements`
- `crm_activities`, `crm_automations`, `crm_automation_runs`

### 4.5 Comunicação
- `notifications`, `email_log`

### 4.6 Auditoria
- `audit_log`, `token_usage`, `export_run`

---

## 5. Os 10 agentes (estado atual)

| Nome | Squad atual | Papel atual | Sprite | Persona |
|---|---|---|---|---|
| **Ana** | (a confirmar) | — | ✅ OK | — |
| **Bia** (ex-Beatriz) | internal-sdr | SDR Comercial | ⚠️ corrompido como "beatriz"? | ✅ Atualizada na Fase 1 (BANT, ICP, etc.) |
| **Bruno** | (a confirmar) | — | ✅ OK | — |
| **Carlos** | (comercial?) | Closer Comercial (era 'specialist' genérico) | ✅ OK | ✅ Atualizada na Fase 1 |
| **Roberto** | (a confirmar) | — | ✅ OK | — |
| **Ágata** | (orquestração?) | Gestão Operacional | ❌ PNG corrompido | — |
| **Márcio** | internal-operacoes (corrigido de marketing) | — | ❌ PNG corrompido | — |
| **Flora** | (a confirmar) | — | ❌ PNG truncado | — |
| **Maya** | internal-marketing (corrigido de RH) | Marketing | ❌ PNG truncado | — |
| **Heitor** | (a confirmar) | — | ❌ PNG truncado | — |

**Bloqueio operacional ativo (do `.lovable/plan.md`):** 5 dos 10 sprites têm PNG corrompido no banco e renderizam como fallback genérico em vez de pixel-art (Ágata, Márcio, Flora, Maya, Heitor).

---

## 6. Portfolio de projetos no sistema

A tabela `agile_projects` foi populada com **15 projetos** marcados como portfolio ou em desenvolvimento:

**LIVE (7) — `is_portfolio = true`, `status = completed`:**
1. LeadFinder Pro (XPAG Brasil)
2. SmartZap (IntelliX.AI)
3. Cavendish CCE Site (Cavendish)
4. AutoGram Creator (IntelliX.AI)
5. IntelliX.AI Site (IntelliX.AI)
6. BYH Site (Cavendish)
7. XPAG Brasil One Page (XPAG Brasil)

**DEV (7) — `is_portfolio = false`, `status = active`, com `ai_scrum_master = true`:**
1. Yolo SDR (IntelliX.AI) — agente SDR multi-tenant
2. Sistema GIG (Cavendish) — gestão integrada
3. Allo Oral Gestão (Allo Oral Clinic) — gestão odontológica
4. IntelliX CRM (IntelliX.AI) — CRM interno
5. Clear Decision (Clear Decision) — apoio à decisão
6. VO.AI (VO.AI) — geração de vídeo com IA
7. VibeGuard Monitor (IntelliX.AI) — monitor de saúde de repos

**ARCHIVED (1):**
- Cavendish Group Website (substituído por versões especializadas)

**Observação importante:** o Doc 05 da Base de Conhecimento que produzimos lista apenas 3 cases (Cavendish, XPAG, Yolo) como "portfolio ativo". O sistema real tem 15 projetos catalogados. **O Doc 05 está desatualizado.**

---

## 7. Edge functions — capacidades implementadas

| Função | O que faz | Status |
|---|---|---|
| `run-start` | Inicia uma execução de squad (insere em `squad_runs` + `run_queue`, dispara `run-step` async) | ✅ |
| `run-step` | Executa próximo passo de uma run | ✅ |
| `run-abort` | Aborta execução | ✅ |
| `ai-assistant` | Chat contextual sobre project / deal / sprint (usa `LOVABLE_API_KEY`) | ✅ |
| `ai-deal-coach` | IA contextual para deals comerciais | ✅ |
| `ai-sprint-coach` | IA contextual para sprints | ✅ |
| `agile-story-move` | Mover histórias entre estados | ✅ |
| `crm-event-handler` | Handler de eventos do CRM | ✅ |
| `crm-automation-runner` | Executor de automações CRM | ✅ |
| `lead-score-calculator` | Cálculo de lead score | ✅ |
| `engagement-next-squad` | Passagem entre squads (fluxo de engagement) | ✅ |
| `gestao-trigger` + `gestao-directive-dispatch` | Sistema de diretrizes da Ágata | ✅ |
| `internal-job-trigger` + `internal-job-dispatch` | Jobs internos | ✅ |
| `send-email` + `send-whatsapp` | Envio de comunicação | ✅ |
| `notification-dispatcher` | Despachante de notificações | ✅ |
| `drive-setup` | Setup Google Drive | ✅ |
| `outbound-webhook-dispatcher` | Webhooks de saída | ✅ |
| `operations-detail-project` | Detalhamento de projeto | ✅ |
| `checkpoint-resolve` | Resolução de checkpoint | ✅ |
| `export-run` | Exportação de runs | ✅ |

---

## 8. Hooks frontend implementados (17)

useAuth · useCrm · useDashboard · useEmailTemplates · useEngagementPlan · useGestao · useIsAdmin · useOKRs · useOnboarding · useProductBacklog · useSendEmail · useSidebarBadges · useSprintBoard · useSquadRun · useTheme · use-mobile · use-toast

Cobertura: autenticação, CRM, dashboards, e-mail, gestão (Ágata), OKRs, onboarding, backlog, sprints, execução de squad, tema. **Tudo conectado a hooks reais com queries Supabase.**

---

## 9. Pastas de componentes

`agile/` · `ai/` · `auth/` · `brand/` · `dashboard/` · `gestao/` · `layout/` · `notifications/` · `office/` · `onboarding/` · `run/` · `ui/` · `workspace/`

`ui/` é Shadcn (botões, cards, tabs, dialogs, etc). As outras são domínio do produto.

---

## 10. O Phaser (`src/game/office/`)

Dois arquivos:
- `OfficeScene.ts` — cena Phaser do escritório virtual
- `officeFloorplan.ts` — layout do escritório (provavelmente grid + posições dos agentes)

**Propósito:** representar visualmente a operação dos agentes em um "escritório" pixel-art onde cada agente é um sprite que executa ações. Implementação ativa, mas com bug nos sprites (ver item 5).

---

## 11. O que está vivo vs o que existe sem propósito visível

### ✅ Vivo e funcionando
- Autenticação Supabase
- Dashboards (PainelPage com MetricsBar e UnifiedFeed)
- Sistema completo de Projetos Ágeis (sprints, backlog, métricas, impediments)
- CRM completo (leads, deals kanban, contracts, invoices, automations, forecast)
- Sistema de execução de squad (run-start → run-step)
- 3 agentes IA contextuais (assistant, deal-coach, sprint-coach)
- Sistema de diretrizes da Ágata (`directives`, `gestao_directives`)
- Office Phaser (com bug de sprites)
- Notificações, e-mail, WhatsApp
- 15 projetos no portfolio catalogados

### ⚠️ Existe mas pode estar incompleto
- Os 10 agentes têm `agent_configs` mas só **Bia** e **Carlos** têm persona detalhada (Fase 1)
- Os outros 8 (Ana, Bruno, Roberto, Ágata, Márcio, Flora, Maya, Heitor) provavelmente têm persona genérica ou vazia
- Rotas legadas mantidas (`/dashboard`, `/office`, etc.) — não é problema, mas é dívida técnica

### ❌ Faltando completamente
- **Sistema de Base de Conhecimento (RAG)** — não há tabela `knowledge_chunks`, não há ingestion pipeline, não há tool de consulta nos prompts dos agentes
- **Integração da Base de Conhecimento documental (Docs 01-11) com as personas dos agentes** — Bia hoje "sabe" o que está hardcoded em `agent_configs.persona`; ela não consulta o Doc 03 ou Doc 07 dinamicamente
- **Anthropic Claude no LLM Catalog** — só Gemini e GPT-5; sem opção de Claude para raciocínio crítico
- **Personas detalhadas dos 8 agentes restantes** (Ana, Bruno, Roberto, Ágata, Márcio, Flora, Maya, Heitor)

---

*Mapa baseado em inspeção direta do repositório · 296 commits · 32 migrations · 24 edge functions · 39 tabelas · 17 hooks · 13 categorias de componentes*

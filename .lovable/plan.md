Módulo enorme — vou entregar em **4 lotes** sequenciais, cada um testável de ponta a ponta. Aprovação no final de cada lote libera o próximo.

## Lote A — Fundação (DB + Projeto + Backlog)

**Migration 0013** — todas as 9 tabelas (`agile_projects`, `epics`, `user_stories`, `tasks`, `sprints`, `sprint_metrics`, `impediments`, `velocity_history`, `release_plans`), RLS via `has_role`, triggers `updated_at`, realtime nas 4 principais, FK retroativa `user_stories.sprint_id → sprints`, cron `intellix-agile-metrics` (02h UTC).

**Sidebar reorganizada** com grupos colapsáveis (Visão Geral · IntelliX · Consultoria · Projetos Ágeis · Configurações) + atalhos dinâmicos para Backlog/Sprint Ativo do projeto mais recente.

**Páginas:**
- `/projects` — lista de projetos com cards (cliente, sprint ativo, velocity, status)
- `/projects/new` — form (nome, tipo scrum/kanban/scrumban, vincula engagement opcional, duração sprint, WIP limits, DoD)
- `/projects/:id` — overview (sprint ativo, KPIs, atalhos)
- `/projects/:id/backlog` — Product Backlog agrupado por épico (expand/collapse, inline edit, quick-add, filtros, INVEST badges, warnings >13pts)

**Componentes shared:** `MoSCoWBadge`, `StoryPointsBadge`, `INVESTChecker`, `PointsSelector`, `EpicCard`, `StoryRow`, `StoryForm`, `AIAssistButton`.

**Hook:** `useProductBacklog`.

## Lote B — Sprint Board (página principal)

- `/projects/:id/board` — Kanban 5 colunas (Backlog · Ready · In Progress · In Review · Done) com `@hello-pangea/dnd`.
- Edge function `agile-story-move` com validação de WIP limit + transições + timestamps.
- Toast de aviso quando WIP estourar; rollback do drop.
- `StoryCard` completo (cor de épico, MoSCoW, INVEST bar, blocked, pts, tags, tasks count, cycle time).
- `StoryDetailModal` lateral 480px com 7 seções (descrição, AC checklist, INVEST, tasks, tags, bloqueio→cria impedimento, comentários simples).
- Header do board com progresso, botões Planning/Review/Retro, +Story.
- Hook `useSprintBoard` com Realtime.

## Lote C — Sprints + Métricas + Impedimentos

**Edge functions:** `agile-sprint-start`, `agile-sprint-close`, `agile-metrics-record`.

**Páginas:**
- `/projects/:id/sprints` — lista
- `/projects/:id/sprints/:sprintId` — tabs Burndown · Burnup · Cerimônias · Stories
- `/projects/:id/metrics` — 4 KPIs + Velocity Chart + CFD + Cycle Time Scatter + Release Forecast Card
- `/projects/:id/impediments` — log com SLA (P1=24h, P2=72h, P3=7d, P4=14d), filtros
- `/projects/:id/roadmap` — timeline de releases por épico
- `/projects/:id/settings` — DoD, WIP, papéis

**Cerimônias:** modais Planning/Review/Retro (Starfish 3 dims + ações).

**Sprint Planning Panel** lateral em /backlog com cálculo de capacidade (×0.85 da velocity média).

**Componentes:** `BurndownChart`, `BurnupChart`, `VelocityChart`, `CumulativeFlowDiagram`, `CycleTimeChart`, `ReleaseForecastCard`, `SprintReviewForm`, `SprintRetroForm`, `CeremoniesPanel`, `ImpedimentCard`.

**Hooks:** `useAgileProject`, `useSprintMetrics`, `useImpediments`, `useReleaseForecast`.

## Lote D — IA + CRM Avançado + Integração

**Edge function `agile-ai-assist`** (Lovable AI Gateway, gemini-2.5-flash) com 6 tipos: `suggest_sprint_goal`, `prioritize_backlog`, `decompose_epic`, `estimate_story`, `retrospective_insights`, `release_forecast`.

**CRM melhorias:**
- `/crm/deals` Kanban drag-and-drop (Discovery → Proposal → Negotiation → Won → Lost) com totalizador por coluna.
- Modal Won → cria engagement automaticamente.
- Modal Lost → captura `lost_reason`.
- `/crm` dashboard com funil visual (Leads→Qualified→Deals→Won), KPIs (Pipeline, MRR, Engagements ativos, Conversão), feed de atividade.

**Integração squad → backlog:** parser em `notification-dispatcher` ou nova edge `squad-output-to-backlog` que ao detectar `squad_runs.status='completed'` parseia markdown buscando `## Épico N:` / `#### User Story` e popula `epics` + `user_stories` no projeto vinculado ao workspace. Auto-cria projeto quando `engagements.status='active'` (via `crm-event-handler`).

**Notificações** integradas: sprint start/close, impedimento P1, story aceita.

---

## Detalhes técnicos comuns

- Drag-and-drop: `@hello-pangea/dnd` (já compatível React 18). Adicionar via `bun add`.
- Charts: `recharts` (já instalado).
- Cores de épico via prop CSS inline (única exceção, são dados do usuário) — restante dos componentes usa tokens semânticos.
- `secrets`: `INTERNAL_SECRET` já existe; `LOVABLE_API_KEY` já existe.
- Cron usa `app.supabase_url` + `app.internal_secret` (mesmo padrão dos triggers existentes).
- Após cada migration: regenerar `types.ts` automaticamente (Supabase faz).

## Início imediato após aprovação

Disparo Lote A: migration 0013 → componentes shared → páginas /projects e /backlog → sidebar nova. Você valida e libero o Lote B.

Confirma para começar pelo Lote A?

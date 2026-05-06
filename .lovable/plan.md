## Objetivo
1. Projetos ágeis nascem automaticamente do fechamento comercial (Deal `won` / Contrato `signed`), herdando dados do cliente, escopo, valor e prazos.
2. Imediatamente após a criação, o **Agente de Operações** (squad IA) entra em ação para detalhar o projeto: gera planejamento, épicos, backlog inicial de user stories/tarefas e delega responsáveis por departamento.

## Fluxo end-to-end

```text
Lead qualificado → Deal (discovery → proposal → won)
                                 │
                                 ▼
                       trigger_deal_won (DB trigger)
                                 │
                                 ▼
                  crm-event-handler  ("deal_won")
                       │                    │
                       ▼                    ▼
            cria engagement       cria agile_project
                                            │
                                            ▼
                          dispara internal-job: "operations-detail-project"
                                            │
                                            ▼
                    Agente de Operações (LLM via agent_configs)
                       │
                       ├─► gera plano de execução (markdown)
                       ├─► cria épicos em `epics`
                       ├─► cria user stories em `user_stories` (com INVEST/MoSCoW)
                       ├─► cria tarefas em `tasks` (assignee_department)
                       ├─► sugere 1ª sprint em `sprints`
                       └─► registra diretivas em `directives` para squads envolvidos

Contrato assinado → atualiza projeto (datas reais, valor final, escopo definitivo)
                  → reexecuta agente de operações em modo "refinement"
```

## Mudanças

### 1. Migração SQL
- `agile_projects`: adicionar `deal_id uuid`, `contract_id uuid`, `auto_planning_status text default 'pending'` (`pending|running|completed|failed`), `auto_planning_job_id uuid`.
- Índices em `deal_id`, `contract_id`, `engagement_id`.
- Backfill: criar projetos para deals já em `won` que ainda não tenham projeto vinculado.

### 2. Edge Function `crm-event-handler` (editar)
- Case `deal_won`:
  - Cria engagement (mantém)
  - **NOVO:** verifica idempotência (`deal_id` já existe?) e cria `agile_projects` herdando `company_name`, `scope_summary`, `value`, `expected_close`, defaults de WIP/DoD.
  - **NOVO:** dispara `internal-job-dispatch` com `department: 'operacoes'`, `job_id: 'operations-detail-project'`, payload contendo `project_id`, `deal_id`, `scope_summary`.
- Case `contract_signed`:
  - Atualiza projeto vinculado (datas, valor, escopo final).
  - Dispara novamente `operations-detail-project` em modo `refinement` se projeto já tinha planejamento.

### 3. Nova Edge Function `operations-detail-project`
- Recebe `project_id` + contexto (deal, contrato, escopo).
- Carrega prompt do agente de operações de `agent_configs` (squad `operacoes`).
- Chama LLM via `lovable_ai` (gateway) com schema estruturado para retornar:
  ```json
  {
    "execution_plan_md": "...",
    "epics": [{ "title", "description", "business_value", "moscow", "color" }],
    "stories": [{ "epic_index", "persona", "action", "benefit", "acceptance_criteria", "story_points", "moscow", "assignee_department" }],
    "tasks": [{ "story_index", "title", "description", "estimated_hours", "assignee_department" }],
    "first_sprint": { "goal", "duration_days", "story_indexes": [...] },
    "delegations": [{ "department", "responsibility", "deliverables": [...] }]
  }
  ```
- Persiste em `epics`, `user_stories`, `tasks`, `sprints` e cria `directives` para cada departamento delegado.
- Atualiza `agile_projects.auto_planning_status` (`running` → `completed|failed`).
- Registra log em `pipeline_step_outputs` para auditoria.

### 4. UI — `ProjectsList.tsx`
- Badge "Origem: Comercial" quando `deal_id` presente.
- Badge de status do auto-planejamento: `Aguardando IA` / `Planejando…` (animado) / `Pronto` / `Falhou`.
- Coluna mostrando cliente, valor do deal, data de fechamento.

### 5. UI — `ProjectOverview.tsx`
- Seção "Origem Comercial": link para Deal, Contrato, valor, data fechamento.
- Seção "Planejamento da IA de Operações":
  - Estado em tempo real (Realtime em `agile_projects.auto_planning_status`).
  - Botão "Replanejar com IA" (refaz `operations-detail-project` em modo refinement).
  - Visualização do `execution_plan_md` (Markdown).
  - Lista de delegações criadas (link para `directives`).

### 6. UI — `NewProject.tsx`
- Banner: "Projetos são criados automaticamente quando um Deal é marcado como Won. Use este formulário apenas para projetos internos/sem origem comercial."
- Toggle opcional: "Acionar Agente de Operações para detalhar este projeto" (default: on).
- Vínculo opcional a Deal `won` sem projeto.

### 7. UI — Pipeline de Deals (quando existir/futuro)
- Ao mover deal para `won`: toast "Projeto criado — IA de Operações está detalhando o backlog [link]".

## Detalhes técnicos
- **Idempotência:** `crm-event-handler` checa `agile_projects.deal_id` antes de inserir; `operations-detail-project` usa `auto_planning_status` para evitar dupla execução.
- **Permissões:** novas edge functions usam service role internamente; chamadas externas (UI "Replanejar") via `supabase.functions.invoke` autenticada.
- **Realtime:** habilitar Realtime em `agile_projects` para atualizar UI durante `auto_planning_status = running`.
- **Custos LLM:** registrar tokens/custo em `pipeline_step_outputs` (já existente).
- **Fallback:** se LLM falhar, marca `failed` e expõe botão para reprocessar; não bloqueia a criação do projeto.

## Arquivos afetados
- `supabase/migrations/<new>.sql` (novo)
- `supabase/functions/crm-event-handler/index.ts` (editar)
- `supabase/functions/operations-detail-project/index.ts` (novo)
- `src/pages/projects/ProjectsList.tsx` (editar)
- `src/pages/projects/ProjectOverview.tsx` (editar)
- `src/pages/projects/NewProject.tsx` (editar)
- `src/hooks/useProjectOrigin.ts` (novo — fetch deal/contrato/status planejamento)
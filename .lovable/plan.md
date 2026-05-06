
## Lote 1 — Fundação de dados, edge functions e hooks

Este lote prepara toda a infraestrutura backend e os hooks React que os Lotes 2 (UI de workspace) e 3 (onboarding/sidebar) vão consumir. Não cria telas novas ainda — só dados, lógica e ganchos.

### 1. Migration de banco

Cria as tabelas que faltam e ajusta as existentes.

**Tabelas novas:**
- `engagement_plans` — plano multi-squad por workspace (squads_ordered, auto_advance, status, current_squad, completed_squads).
- `squad_checkpoints` — pontos de aprovação humana entre steps de um squad (status pending/approved/rejected, notes, resolved_by).
- `workspace_contexts` — markdown de contexto por workspace (company.md, shared_insights, etc.) com `(workspace_id, context_type)` único.
- `pipeline_step_outputs` — output detalhado de cada step de um run (agent, output_markdown, tokens, custo, duração).
- `agent_prompts` — audit trail dos prompts enviados a cada agente (prompt, response, model, tokens, custo).
- `notification_preferences` — preferências do usuário (quiet_hours_start/end, digest_mode, digest_interval_minutes, channels habilitados por categoria).

**Ajustes em tabelas existentes:**
- `squad_configs`: adicionar coluna `squad_type text default 'internal'` (valores `internal` | `client`) para o WorkspaceNew filtrar.
- `squad_runs`: estender o status para incluir `'checkpoint'` e `'paused'`. Como a coluna hoje é `text` sem CHECK, basta documentar; se houver CHECK, recriar.
- `notifications`: adicionar `scheduled_for timestamptz default now()`, `priority text default 'normal'` (low/normal/high/critical), `category text`, e o status `'digested'`.

**Segurança:** todas as tabelas novas com RLS habilitada e policy `admin_*` usando `has_role(auth.uid(), 'admin')`. `notification_preferences` ganha policy adicional para o próprio usuário (`user_id = auth.uid()`). Realtime habilitado (`REPLICA IDENTITY FULL` + `supabase_realtime`) em `engagement_plans`, `squad_checkpoints`, `squad_runs`, `pipeline_step_outputs`.

**Cron job:** agendar `notification-dispatcher` a cada 5 minutos via `pg_cron` + `pg_net` (executado fora da migration, com a URL e anon key do projeto).

### 2. Edge Functions

**`checkpoint-resolve` (nova, verify_jwt em código):**
- Input: `{ checkpointId, runId, decision, notes? }`.
- Valida JWT e role admin.
- Atualiza `squad_checkpoints` (status, resolved_by, resolved_at, notes).
- Se aprovado: invoca `run-step` para o próximo step e marca `squad_runs.status = 'running'`.
- Se rejeitado: marca run como `failed` e enfileira notificação WhatsApp.

**`engagement-next-squad` (nova, sem JWT — chamada interna):**
- Input: `{ completedRunId, workspaceId, completedSquad }`.
- Atualiza `engagement_plans.completed_squads`.
- Extrai insights do output do Reviewer (último `pipeline_step_outputs`) e faz UPSERT em `workspace_contexts` (`context_type='shared_insights'`).
- Calcula próximo squad elegível (cujo `depends_on ⊆ completed_squads`).
- Se `auto_advance=true`: invoca `run-start` para o próximo squad.
- Se `auto_advance=false`: marca plano como `paused` e enfileira notificação para Felipe.
- Se todos completos: status `completed`.

**`notification-dispatcher` (estender a existente):**
- Adicionar lógica de `scheduled_for <= now()`, ordenação por `priority`, respeito a `quiet_hours` (com bypass para `critical`), e modo digest (agrupa `normal`/`low` da mesma categoria a cada `digest_interval_minutes`).
- Continuar usando `whatsapp-provider` e `adminClient` do `_shared`.

**`run-step` (ajuste mínimo se necessário):** ao completar a última etapa de um squad de cliente, invocar `engagement-next-squad`. Se `run-step` ainda não fizer essa chamada, adicionar.

### 3. Hooks React (sem UI nova ainda)

- `src/hooks/useEngagementPlan.ts` — busca o `engagement_plan` do workspace, subscreve Realtime, calcula `eligibleSquads`, `progress`, `activeRun`, `checkpointRun`.
- `src/hooks/useSquadRun.ts` — carrega `squad_runs` + `pipeline_step_outputs` + `agent_prompts` por runId, com Realtime no `state_snapshot`.
- `src/hooks/useOnboarding.ts` — verifica primeira vez (`okrs.count + leads.count + workspaces.count === 0`), expõe step atual via localStorage, função `completeOnboarding`.

### 4. Tipos

Após a migration, o arquivo `src/integrations/supabase/types.ts` é regenerado automaticamente. Os hooks já consomem o client tipado.

### Diagrama do fluxo

```text
WorkspaceNew                    EngagementPanel              CheckpointModal
     |                                |                            |
     v                                v                            v
engagement_plans  --realtime--> useEngagementPlan       checkpoint-resolve
     |                                |                            |
     +-- squads_ordered               +-- activeRun                 +-- aprovado --> run-step
                                      +-- checkpointRun            +-- rejeitado -> notif WA
                                              |
                                              v
                                         squad_runs (Realtime)
                                              |
                                  status='completed' ao final
                                              |
                                              v
                              engagement-next-squad (interno)
                                  |                    |
                            auto_advance? sim ----> run-start próximo
                            auto_advance? não ----> notifica Felipe
```

### Critério de validação do Lote 1

- Migration aplicada sem erros e linter Supabase limpo (ou com warnings já tratados).
- `checkpoint-resolve` e `engagement-next-squad` deployados; logs sem erro em chamada de teste.
- Cron de `notification-dispatcher` agendado e visível em `cron.job`.
- Hooks importáveis sem erro de tipos.
- App continua funcionando (sem regressão na rota `/office/gestao` atual).

Após aprovado este lote, sigo para o **Lote 2** (componentes e páginas de workspace).

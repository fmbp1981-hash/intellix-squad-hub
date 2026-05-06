## Ação imediata: limpar cron duplicado

Executar via SQL (não-migration, pois mexe em `cron.job`):

```sql
SELECT cron.unschedule(6);
```

Mantém apenas o job 8 (`notification-dispatcher-5min`) ativo.

## Em seguida: Lote 2 — UI de Workspace + Engagement

### Componentes novos

- `src/components/workspace/EngagementPanel.tsx` — mostra plano (squads ordenados, progresso, squad atual), badges de status por squad, botão "Iniciar próximo squad" (quando `auto_advance=false`).
- `src/components/workspace/CheckpointModal.tsx` — modal de aprovação humana; lista contexto markdown do checkpoint, botões Approve/Reject + notas, chama edge `checkpoint-resolve`.
- `src/components/workspace/SquadRunDetail.tsx` — timeline dos `pipeline_step_outputs` por step com agente, output markdown, tokens/custo/duração.
- `src/components/workspace/WorkspaceContextEditor.tsx` — editor markdown para `workspace_contexts` (company.md, shared_insights), com save direto via supabase client.
- `src/components/workspace/EngagementPlanWizard.tsx` — wizard para criar `engagement_plans` (escolher squads de tipo `client`, ordem, auto_advance).

### Páginas / rotas

- `src/pages/workspaces/WorkspaceDetail.tsx` — abas: Overview · Engagement · Contexto · Runs.
- Atualizar `src/pages/workspaces/NewWorkspace.tsx` para, após criar workspace, abrir o `EngagementPlanWizard`.
- Ajustar `src/App.tsx` com rota `/workspaces/:id` apontando para `WorkspaceDetail`.

### Integração com hooks (Lote 1)

- `EngagementPanel` consome `useEngagementPlan(workspaceId)`.
- `SquadRunDetail` consome `useSquadRun(runId)`.
- `CheckpointModal` invoca `supabase.functions.invoke('checkpoint-resolve', {...})`.

### Critério de validação Lote 2

- Criar workspace → wizard abre → plano salvo em `engagement_plans`.
- Painel mostra squads em sequência com Realtime atualizando status.
- Checkpoint aparece como modal; aprovar dispara próximo step (visto via `useSquadRun`).
- Sem regressão em `/office/gestao`, `/jobs`, CRM.

Após aprovação do Lote 2, sigo para o **Lote 3** (Onboarding + Sidebar de notificações + integração com WhatsApp).

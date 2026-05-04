
# Prompt 3 — Workspaces (CRUD)

Implementar as três páginas de gerenciamento de workspaces consumindo a camada `src/lib/supabase/workspaces.ts` criada no Prompt 2.

## Arquivos a criar

### Componentes — `src/components/workspace/`
- **`WorkspaceCard.tsx`** — Card clicável com badge de status (derivado do run mais recente), nome do cliente, engagement, data formatada (`pt-BR`), ícone Google Drive (cyan, clicável, abre em nova aba) quando `drive_folder_url` existe, e contador de runs no rodapé.
- **`WorkspaceCardSkeleton.tsx`** — Skeleton pulsando para o loading state.
- **`WorkspaceForm.tsx`** — Form React Hook Form + Zod com Cliente (obrig.), Engagement (obrig.), Descrição (textarea opcional), Template (Select shadcn opcional com opção "Sem template" + descrição do template selecionado renderizada abaixo).
- **`SquadCard.tsx`** — Card de squad com ícone, nome, borda colorida (cor do squad), botão "Rodar Squad" → `/workspaces/:id/run/:squadId`.
- **`RunStatusBadge.tsx`** — Badge colorido por status (`running` violeta pulsante, `completed` verde, `failed` vermelho, `pending` cinza).
- **`RecentRunsList.tsx`** — Lista de até 5 runs com badge, nome do squad (label do `AVAILABLE_SQUADS`), timestamp relativo (`pt-BR`) e link "Ver output" para runs completed.

### Páginas — `src/pages/workspaces/`
- **`WorkspacesList.tsx`** (`/workspaces`)
  - Header: título "Workspaces" + botão `+ Novo Workspace` (gradiente brand) → `/workspaces/new`.
  - Carrega via `useQuery(['workspaces'], getWorkspaces)`.
  - Para cada workspace, busca contagem/status mais recente dos runs em uma única query agrupada (`getRunsSummaryByWorkspaces`) — adicionar essa função em `workspaces.ts`.
  - Grid responsivo: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`.
  - Empty state: ícone `FolderPlus` + texto + CTA "Criar primeiro workspace".
  - Loading: 3 `WorkspaceCardSkeleton`.

- **`NewWorkspace.tsx`** (`/workspaces/new`)
  - Header com botão voltar + título "Novo Workspace".
  - `WorkspaceForm` no centro (max-w-2xl, dentro de Card).
  - Carrega templates via `useQuery(['templates'], getTemplates)` para alimentar o Select.
  - Submit: `createWorkspace({ ..., owner_id: user.id })` → toast sucesso → fire-and-forget `supabase.functions.invoke('drive-setup', { body: { workspaceId } })` → navega para `/workspaces/:newId`.
  - Tratamento de erro com toast.

- **`WorkspaceOverview.tsx`** (`/workspaces/:id`)
  - Header: client_name (h1 font-display), engagement_name (h2 muted), badge do template (se houver).
  - Botão "📁 Abrir pasta no Drive" (variant outline, cyan) se `drive_folder_url` presente.
  - Seção "Squads disponíveis": grid 2-3 colunas de `SquadCard`. Squads filtrados pelo `template.squads` quando houver template, senão `AVAILABLE_SQUADS` completo.
  - Seção "Runs recentes": `RecentRunsList` com últimos 5 (`getSquadRuns(id).slice(0,5)`).
  - Loading state e tratamento 404 (workspace não existe → mensagem + botão voltar).

## Arquivos a editar

- **`src/App.tsx`** — Trocar os 3 `Placeholder` por `WorkspacesList`, `NewWorkspace`, `WorkspaceOverview`. Os outros placeholders (run/squad, runs, runs/runId, settings) permanecem para os próximos prompts.
- **`src/lib/supabase/workspaces.ts`** — Adicionar `getRunsSummaryByWorkspaces(ids: string[])` retornando `Map<workspaceId, { total: number; latestStatus: RunStatus | null }>` (uma única query `select workspace_id, status, created_at`).

## Detalhes técnicos
- **TanStack Query** para todas as chamadas (cache automático, invalidação após `createWorkspace`).
- Tudo dark mode usando os tokens semânticos (`bg-card`, `border-border`, `text-foreground`, etc.) — sem cores hardcoded.
- Slug e datas via `Intl.DateTimeFormat('pt-BR')`.
- A Edge Function `drive-setup` ainda não existe (Prompt 7) — o invoke é fire-and-forget com `.catch` silencioso, então a UX funciona mesmo sem a function ainda; quando ela for implementada, a pasta começa a aparecer.
- Sem alterações no Supabase nesta etapa.

## Próximo passo
Após aprovação e implementação, peço o **Prompt 4** (Squad Runs + Edge Function `squad-run-start`).

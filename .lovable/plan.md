
# Prompt 2 — Tipos TypeScript + Camada de Acesso ao Supabase

Schema SQL já foi aplicado manualmente no Supabase pelo desenvolvedor. Esta etapa cria apenas o **espelho TypeScript** das tabelas e a **camada de serviço** que o frontend usará para falar com o banco.

## Arquivos a criar

### 1. `src/types/index.ts`
Tipos compartilhados de toda a aplicação:
- Enums: `UserRole`, `AgentStatus`, `SquadStatus`, `RunStatus`, `PhaseStatus`.
- Interfaces de domínio em tempo real: `AgentState`, `HandoffInfo`, `SquadState`.
- Espelhos das tabelas: `Template`, `Workspace`, `WorkspacePhase`, `SquadRun`.
- Constante `AVAILABLE_SQUADS` (6 squads: RH, Financeiro, Comercial, Operações, TI, Marketing) com `id`, `label`, `icon`, `color` — `as const` para inferir `SquadId`.

### 2. `src/lib/supabase/workspaces.ts`
Funções tipadas que encapsulam todo acesso às tabelas (nada de chamadas `supabase.from(...)` espalhadas pelos componentes):
- **Templates:** `getTemplates()`
- **Workspaces:** `getWorkspaces()`, `getWorkspace(id)`, `createWorkspace(payload)` (gera `slug` automático), `updateWorkspaceDrive(id, folderId, folderUrl)`
- **Squad Runs:** `getSquadRuns(workspace_id)`, `getSquadRun(runId)`, `createSquadRun(payload)` (status inicial `running`, `started_at = now`)

## Detalhes técnicos
- TS strict, sem `any`. Casts explícitos `as Workspace[]` etc. para alinhar com o tipo de retorno do Supabase JS.
- Erros do Supabase são propagados via `throw` (a UI vai capturar com try/catch + toast). Exceção: `getWorkspace` e `getSquadRun` retornam `null` quando não encontram.
- `slug` do workspace = `kebab-case(client_name) + '-' + timestamp`, garantindo unicidade.
- Nada de UI nesta etapa — tudo será consumido nos prompts 3+.

## Próximo passo
Após implementação, peço o **Prompt 3** (Workspaces — CRUD: lista, formulário de criação, página de overview).

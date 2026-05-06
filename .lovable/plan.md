# Lote D3 — Drive Setup + Export Run

Adiciona dois recursos finais: configuração de integração de Drive (Google Drive / OneDrive) por workspace, e exportação assíncrona de dados (engagements, projetos, leads, deals, invoices) em CSV/JSON com histórico de execuções.

## Migrations

### Tabela `drive_setup`
- `id uuid pk`, `workspace_id uuid not null`, `provider text` (`google_drive` | `onedrive` | `none`)
- `root_folder_id text`, `root_folder_url text`
- `auto_create_folders boolean default true`
- `folder_template jsonb` (ex: `{"engagement": "/Clients/{client}/{engagement}", "project": "/Projects/{project}"}`)
- `connected_by uuid`, `connected_at timestamptz`, `status text default 'disconnected'`
- `created_at`, `updated_at`
- RLS: `admin_all` (apenas admins gerenciam); `authenticated_select` para leitura.
- Unique: `(workspace_id, provider)`.

### Tabela `export_run`
- `id uuid pk`, `requested_by uuid not null`, `entity_type text` (`engagements` | `projects` | `leads` | `deals` | `invoices` | `dashboard`)
- `format text` (`csv` | `json`)
- `filters jsonb default '{}'`
- `status text default 'pending'` (`pending`|`running`|`completed`|`failed`)
- `row_count int`, `file_url text`, `error_message text`
- `started_at`, `completed_at`, `created_at`
- RLS: usuário vê só seus próprios runs (`requested_by = auth.uid()`); admin vê todos.

## Edge functions

- `supabase/functions/export-run/index.ts` — recebe `{ entity_type, format, filters }`, cria registro em `export_run`, executa query no Postgres via service role, gera CSV/JSON, faz upload no bucket `exports` e atualiza row com `file_url` e `status='completed'`.
- Storage bucket `exports` (privado), policy: usuário lê apenas arquivos do próprio path `{user_id}/...`.

## Frontend

### Novos arquivos
- `src/pages/settings/DriveSetupSettings.tsx` — form com provider (select), root folder URL/ID, toggle auto-create, editor de templates de pasta, botão "Testar conexão" (placeholder — a integração OAuth real exigiria connector). Persiste em `drive_setup`.
- `src/pages/ExportsPage.tsx` — lista `export_run` do usuário, botão "Nova exportação" abre modal (entity_type + format + filtros básicos), invoca edge function. Tabela mostra status, contagem, link de download.
- `src/hooks/useExportRun.ts` — hook para criar export e polling do status.

### Editados
- `src/pages/settings/SettingsLayout.tsx` — adiciona item **Drive** sob "Conta".
- `src/App.tsx` — adiciona rotas:
  - `/settings/drive` → `<DriveSetupSettings />`
  - `/exports` → `<ExportsPage />`
- `src/components/layout/AppSidebar.tsx` — adiciona entrada "Exportações" no grupo principal.

## Notas

- A integração OAuth real com Google Drive/OneDrive fica fora deste lote (requer connector). Esta versão persiste config + URLs e marca `status` como manual. Já deixa estrutura pronta para conectar via `standard_connectors` no futuro.
- `export-run` roda síncrono dentro da própria invocação (sem fila externa) — para volumes maiores no futuro mover para job queue.
- Sem novas dependências.

Aprovar para implementar?

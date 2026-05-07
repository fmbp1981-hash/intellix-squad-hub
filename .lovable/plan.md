## Plano: Fechar D3, D4 e D5 do Prompt D

⚠️ **Nenhuma operação será feita em `agent_configs`.** Sem DELETE, sem reset, sem INSERT em massa. Tabela é intocada.

---

### D3 — Drive & Export (fechar)

**1. Edge Function `drive-setup`**  (nova: `supabase/functions/drive-setup/index.ts`)
- POST autenticado (admin via `has_role`).
- Cria pasta raiz no Google Drive da conta conectada usando o gateway `https://connector-gateway.lovable.dev/google_drive/drive/v3/files` (mimeType `application/vnd.google-apps.folder`).
- Cria subpastas por engagement opcional via body `{ engagementId? }`.
- Persiste `folder_id` em tabela `drive_settings` (criar se não existe via migração: `id`, `scope` text, `scope_id` uuid null, `folder_id` text, `folder_url` text, `created_at`). RLS admin-only.
- Retorna `{ folderId, webViewLink }`.

**2. UI em `/settings/drive`** (`DriveSetupSettings.tsx`)
- Botão "Criar pasta raiz no Drive" → invoca `drive-setup`.
- Lista pastas configuradas (read de `drive_settings`).
- Estado vazio com instrução.

**3. Botão "Exportar" em `SquadRunDetail`**
- Dropdown: Markdown / JSON / PDF (placeholder PDF → markdown por ora).
- Invoca `export-run` com `{ runId, format }`.
- Toast com link de download (signed URL do bucket `exports`).

---

### D4 — Polish / Errors / Performance

**1. ErrorBoundary** (`src/components/ErrorBoundary.tsx`)
- Class component, captura erros em árvore.
- Fallback bonito: ícone, mensagem, botão "Voltar ao Dashboard" + "Recarregar".
- Envolver `<Routes>` em `App.tsx`.

**2. SkeletonPage** (`src/components/ui/SkeletonPage.tsx`)
- Reutiliza `Skeleton`; layout padrão (header + cards grid).

**3. Lazy routes em `App.tsx`**
- Converter rotas pesadas (CRM, Projects, Office, Settings/*) para `React.lazy` + `<Suspense fallback={<SkeletonPage/>}>`.
- Manter Login/Dashboard eager.

**4. Utilitários CSS em `src/index.css`**
- `.hover-lift` → `transition-transform hover:-translate-y-0.5 hover:shadow-brand`.
- `.fade-in-up` → keyframes (opacity 0→1, translateY 8px→0, 300ms).
- Aplicar `.hover-lift` em cards principais (WorkspaceCard, MetricsBar items).

---

### D5 — Auth / Sidebar / PWA

**1. PWA**
- Criar `public/manifest.json` com nome "OpenSquad Platform", short_name, theme_color `#7c3aed`, background `#0a0a0f`, display `standalone`, start_url `/dashboard`.
- Ícones: gerar `public/icon-192.png` e `public/icon-512.png` (placeholder do brand — fundo gradiente + monograma "O").
- Adicionar `<link rel="manifest" href="/manifest.json">` e `<meta name="theme-color" content="#7c3aed">` em `index.html`.

**2. Login redesign** (`src/pages/Login.tsx`)
- Layout split: lado esquerdo branding (gradient hero, logo grande, tagline, 3 features bullets); lado direito form em card.
- Em mobile: stack vertical.
- Manter lógica de auth atual.
- Redirect pós-login: `/dashboard` (não `/workspaces`).

**3. Sidebar status badges** (`AppSidebar.tsx`)
- Hook `useSidebarBadges` → conta `internal_jobs` running, runs ativos, leads novos.
- Renderizar pill numérico ao lado dos itens "Jobs", "Engagements", "CRM".
- Polling a cada 30s via React Query.

---

### Resumo técnico
- **Migrações:** 1 (criar `drive_settings`).
- **Edge functions:** 1 nova (`drive-setup`).
- **Tocadas:** `App.tsx`, `index.html`, `index.css`, `Login.tsx`, `AppSidebar.tsx`, `DriveSetupSettings.tsx`, `SquadRunDetail.tsx`.
- **Novos arquivos:** `ErrorBoundary.tsx`, `SkeletonPage.tsx`, `useSidebarBadges.ts`, `manifest.json`, `icon-192.png`, `icon-512.png`.
- **Sem alterações em `agent_configs`.**

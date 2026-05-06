
# Prompt D — Settings + Dashboard + Polish Final

Entrega o último lote de construção. Dado o tamanho, divido em **5 sub-lotes** sequenciais — cada um deployável e testável isoladamente.

## Decisões de escopo

- **Drive**: Service Account via secret `GOOGLE_SERVICE_ACCOUNT_JSON`. Se ausente, sistema funciona normalmente; botão fica desabilitado com tooltip.
- **PDF Export**: usar Deno + `https://esm.sh/jspdf` + `html2canvas` é instável em edge. Vou usar **renderização HTML server-side + serviço externo opcional**. Default: gerar HTML estilizado e devolver para o cliente baixar como `.html`; quando `PDFSHIFT_API_KEY` estiver presente, converte para PDF real. Mantém entrega sem nova dependência obrigatória.
- **PWA**: apenas manifest + ícones (sem service worker), conforme guideline de evitar SW em iframes Lovable.
- **Tema**: dark-only mantido. Reaproveita tokens existentes em `index.css` e adiciona o que faltar.
- **Sidebar**: já existe `AppSidebar.tsx` — refatoro/expando, não reescrevo do zero.
- **Roles**: aproveita `user_roles` + `has_role` já existentes. `admin` tem tudo; checagens server-side via RLS, client-side via `useIsAdmin`.

## Lote D1 — Dashboard executivo

**Migration:** view `vw_dashboard_feed` (UNION de `squad_runs`, `internal_jobs`, `crm_activities`, `notifications` últimas 24h) + RPC `dashboard_summary()` que retorna JSON consolidado (MRR, pipeline, engagements, sprints, jobs, tokens) em uma chamada.

**Hook:** `src/hooks/useDashboard.ts` — `useQuery`-like sem react-query (manter padrão atual com useState/useEffect).

**Componentes** (`src/components/dashboard/`):
- `DashboardGreeting.tsx`, `MetricsBar.tsx`, `UnifiedFeedCard.tsx`, `AgileProjectsGrid.tsx`, `OKRProgressCard.tsx`, `CommercialFunnelBar.tsx`, `FinancialHealthCard.tsx`, `TokenUsageCard.tsx`, `QuickActionsBar.tsx`, `DashboardSkeleton.tsx`.

**Página:** `src/pages/Dashboard.tsx`. Rota `/dashboard` (já existe em `App.tsx` ou substitui index).

## Lote D2 — Settings expandido

Reorganizar `SettingsPage` para layout com sidebar interna (substitui Tabs atuais). Sub-rotas:

- `/settings/notifications` — reaproveita `NotificationPreferences` + UI de canais/digest/quiet hours/categorias (matriz editável persistida em `notification_preferences.categories`).
- `/settings/whatsapp` — `WhatsAppSettings` existente.
- `/settings/models` — `ModelSettings` + bloco "Testar modelo" (chama `ai-assistant`) e gráfico de custo via Recharts a partir de `token_usage`.
- `/settings/email-templates` — já feito no fechamento do Lote D anterior.
- `/settings/agents` — nova página: lista `agent_configs` agrupados por `squad_id`, modal de edição de `persona`/skills (já há `admin_all` RLS).
- `/settings/squads` — CRUD em `squad_configs`.
- `/settings/budgets` — CRUD em `token_usage` (campo `budget_usd`) + gráfico histórico.
- `/settings/profile` — atualiza `auth.users` metadata + timezone (nova coluna em `profiles` se não existir; senão metadata).
- `/settings/integrations` — mantém atual + nova seção Google Drive.

Componente `SettingsLayout.tsx` com sidebar secundária + `<Outlet />`.

## Lote D3 — Drive & Export

**Edge Functions:**
- `drive-setup/index.ts` — Service Account JWT (assinatura RS256 manual com Web Crypto), cria estrutura `IntelliX/{client}/{engagement}/{Diagnósticos,Propostas,Planos}`, atualiza `workspaces.drive_folder_id/url`. Migration adiciona essas colunas se não existirem.
- `export-run/index.ts` — monta HTML branded a partir de `pipeline_step_outputs`. Se `PDFSHIFT_API_KEY` presente, converte para PDF; senão devolve HTML. Upload opcional ao Drive. Atualiza `squad_runs.drive_file_id/url`.

**UI:** botão "Exportar" em `SquadRunDetail` chamando `export-run` e disparando download (Blob).

**Settings → Integrações:** card Google Drive com status (`configured`/`pending`) + botão "Configurar pasta do workspace".

## Lote D4 — Polish visual + Error states + Performance

**Design tokens:** auditar `index.css` e `tailwind.config.ts`, adicionar tokens faltantes (`--background-elevated`, cores de departamento, status). Garantir `--background`/`--foreground` HSL.

**Tipografia:** classes utilitárias `.text-display`, `.text-heading`, `.text-subheading`, `.text-body`, `.text-small`, `.text-mono` em `index.css`.

**Scrollbar customizada** em `index.css`.

**Componentes compartilhados:**
- `src/components/shared/ErrorState.tsx` (variantes network/not_found/permission/server/llm_unavailable).
- `src/components/shared/ErrorBoundary.tsx` (envolve `<Routes>` em `App.tsx`).
- `src/components/shared/SkeletonPage.tsx` + skeletons específicos.
- `src/lib/error-handler.ts` — mapper centralizado + log opcional em `audit_log`.

**Lazy loading:** converter rotas em `App.tsx` para `React.lazy` + `Suspense fallback={<SkeletonPage/>}`.

**Micro-interações:** adicionar utilities CSS (`.hover-lift`, `.click-press`, `.fade-in-up`) e aplicar em cards principais. Sem framer-motion (manter bundle leve).

**`react-countup`** apenas se já estiver no package — caso contrário, animação CSS simples.

## Lote D5 — Auth, Sidebar final, PWA

**Auth:**
- Conferir `ProtectedRoute` (já existe). Adicionar middleware de role: redirect `/onboarding` se não tem `user_roles`.
- `Login.tsx` (já existe) — repaginar com fundo/grid isométrico.

**Sidebar:** refatorar `AppSidebar.tsx` para incluir todos os grupos do prompt, com badges (jobs ativos, checkpoints pendentes, status providers). Mobile: hamburger + drawer.

**PWA (sem service worker):**
- `public/manifest.json` com cores/ícones.
- Ícones 192 e 512 gerados via script (`/tmp/gen-icons.mjs` usando `canvas` ou ImageMagick) e copiados para `public/`.
- Adicionar `<link rel="manifest">` em `index.html`.
- Sem `vite-plugin-pwa`, sem `sw.js`.

## Detalhes técnicos críticos

- **Sem novas deps pesadas.** Usar Recharts (já presente). Sem framer-motion, sem react-query.
- **Edge functions** seguem padrão `verify_jwt = false` (validação de claims em código onde necessário).
- **`drive-setup`**: assinar JWT do Service Account com `crypto.subtle.importKey('pkcs8', ...)` + `RSASSA-PKCS1-v1_5`. Token temporário trocado em `https://oauth2.googleapis.com/token`. Sem SDK.
- **Migrations idempotentes** para `workspaces.drive_folder_id/url` e qualquer outro ajuste.
- **RPC `dashboard_summary`**: SECURITY DEFINER, retorna JSON. Restrita a usuários autenticados.

## Ordem de execução

1. **D1 Dashboard** — migration + componentes + rota.
2. **D2 Settings** — refator `SettingsPage` + 5 sub-páginas novas.
3. **D3 Drive/Export** — 2 edge functions + migration colunas + UI.
4. **D4 Polish** — tokens, ErrorBoundary, lazy loading.
5. **D5 Auth/Sidebar/PWA** — sidebar refatorada + manifest + ícones.

Cada lote termina deployável; eu pauso entre lotes para você validar (ou confirmamos ir direto até o fim).

## Pergunta antes de começar

Quer que eu execute **os 5 lotes em sequência sem pausar**, ou pauso após cada lote para você validar? Se for sem pausar, vai gerar um diff grande mas chega no estado final mais rápido.

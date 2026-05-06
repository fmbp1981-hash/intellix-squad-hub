## Objetivo
Conceder admin ao usuário `fmbp1981@gmail.com` e avançar com as próximas entregas pendentes (cena do escritório em Phaser, páginas `/office` e `/jobs`, e cron jobs).

## Etapa 1 — Conceder admin (migration)
Rodar migration que insere o papel `admin` para o user_id já identificado:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('ad1cc509-2e51-4223-83e2-119862af770e', 'admin')
ON CONFLICT DO NOTHING;
```

Após isso o usuário poderá acessar `/settings/whatsapp`, `/settings/models` e demais áreas admin sem rodar SQL manual.

## Etapa 2 — Página `/office` (cena Phaser)
- Adicionar dependência `phaser`.
- Criar `src/pages/office/OfficePage.tsx` com canvas Phaser embedado.
- Criar `src/game/office/OfficeScene.ts`:
  - Grid 2D top-down representando o escritório.
  - Sprites placeholder por agente (cor por `role`), posicionados via `agent_configs.position_x/y`.
  - Estado em tempo real: subscrição Supabase em `squad_runs` e `run_steps` para animar o agente "ativo" (pulso/glow) quando há `run_step` em `processing`.
  - Tooltip ao hover: nome do agente, squad, último output resumido.
- Registrar rota `/office` em `src/App.tsx` (admin-only).

## Etapa 3 — Página `/jobs`
- Criar `src/pages/jobs/JobsPage.tsx`:
  - Lista de `internal_jobs` com filtros por `status`, `kind`, `department`.
  - Detalhe lateral mostrando `payload`, `output_markdown` (render markdown), timestamps.
  - Botão "Disparar agora" → chama edge function `internal-job-trigger`.
- Registrar rota `/jobs` em `src/App.tsx` (admin-only).

## Etapa 4 — Cron jobs (pg_cron)
Migration habilitando `pg_cron` + `pg_net` e agendando:
- A cada 1 min: `POST` para edge function `run-step` (processa fila `run_queue`).
- A cada 5 min: `POST` para `notification-dispatcher` (envia notificações pendentes).
- Diário 08:00 BRT: `POST` para `internal-job-trigger` com `kind='daily_report'`.

Os cron usam o anon key + `CALLBACK_SECRET` no header (já existem nos secrets).

## Detalhes técnicos
- Phaser roda em `<div ref>` montado no `useEffect`; cleanup com `game.destroy(true)` no unmount.
- Realtime via `supabase.channel('office').on('postgres_changes', ...)`.
- Rotas admin protegidas por hook `useIsAdmin()` (verifica `user_roles` via RPC `has_role`).
- `JobsPage` usa `react-markdown` (já no projeto, se não, adicionar).

## Entregáveis
- 1 migration (admin role) + 1 migration (cron).
- 4 arquivos novos: `OfficePage.tsx`, `OfficeScene.ts`, `JobsPage.tsx`, hook `useIsAdmin.ts` (se não existir).
- `src/App.tsx` atualizado com 2 rotas.
- `package.json`: adicionar `phaser` (e `react-markdown` se faltar).

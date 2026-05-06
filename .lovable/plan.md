Admin já concedido via SQL pelo usuário. Próximas entregas:

## 1. Hook `useIsAdmin`
Criar `src/hooks/useIsAdmin.ts` consultando `user_roles` para o usuário logado.

## 2. Página `/office` (Phaser)
- `src/game/office/OfficeScene.ts`: cena top-down com grid, círculos coloridos por `role`, tooltip no hover, método `setActive(agentId, bool)` para pulsar agente em execução.
- `src/pages/office/OfficePage.tsx`: monta canvas Phaser, carrega `agent_configs` (com squad_configs join), escuta realtime em `run_steps` para destacar agentes em `processing`.

## 3. Página `/jobs`
- `src/pages/jobs/JobsPage.tsx`: tabela de `internal_jobs` com filtros (status/kind), painel lateral com payload + `output_markdown` via `react-markdown`, botão "Disparar daily_report" chamando edge function `internal-job-trigger`.

## 4. Roteamento e navegação
- `src/App.tsx`: registrar rotas `/office` e `/jobs` dentro do `AppLayout` protegido.
- `src/components/layout/AppSidebar.tsx`: adicionar itens "Escritório" e "Jobs" no menu.

## 5. Cron jobs (pg_cron + pg_net)
Migration habilitando extensões e agendando:
- `* * * * *` → POST `run-step` (processa fila).
- `*/5 * * * *` → POST `notification-dispatcher`.
- `0 11 * * *` (08h BRT) → POST `internal-job-trigger` body `{"kind":"daily_report"}`.

Headers usam o anon key do projeto.

## Dependências
`react-markdown` já adicionado. `phaser` já presente.

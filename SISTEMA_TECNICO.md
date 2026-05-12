# OpenSquad Platform — Documentação Técnica Completa

> **Público-alvo:** Esta documentação destina-se a qualquer agente de IA, desenvolvedor ou analista que precise entender, retomar ou expandir este sistema sem necessidade de contexto prévio de conversas anteriores.
>
> **Versão:** Lovable Edition — arquitetura definitiva aprovada em 2026-05-04
> **Supabase:** `hynadwlwrscvjubryqlg` · **VPS:** `runner.intellixai.com.br`

---

## Índice

1. [Visão Geral e Propósito](#1-visão-geral-e-propósito)
2. [O Que é o OpenSquad](#2-o-que-é-o-opensquad)
3. [Contexto de Negócio — IntelliX.AI](#3-contexto-de-negócio--intellixai)
4. [Decisões Arquiteturais](#4-decisões-arquiteturais)
5. [Arquitetura Técnica](#5-arquitetura-técnica)
6. [Stack Tecnológica](#6-stack-tecnológica)
7. [Estrutura de Arquivos](#7-estrutura-de-arquivos)
8. [Schema do Banco de Dados](#8-schema-do-banco-de-dados)
9. [Edge Functions](#9-edge-functions)
10. [Squads de Consultoria](#10-squads-de-consultoria)
11. [Fluxo End-to-End](#11-fluxo-end-to-end)
12. [Dashboard em Tempo Real (Phaser)](#12-dashboard-em-tempo-real-phaser)
13. [Integração Google Drive](#13-integração-google-drive)
14. [VPS Runner Server](#14-vps-runner-server)
15. [Configuração de Ambiente](#15-configuração-de-ambiente)
16. [Comunicação entre Nós — DB-as-bus](#16-comunicação-entre-nós--db-as-bus)
17. [Roadmap — Subsistemas Futuros](#17-roadmap--subsistemas-futuros)

---

## 1. Visão Geral e Propósito

O **OpenSquad Platform** é uma plataforma web de uso **interno da IntelliX.AI** para orquestrar squads de agentes de IA no contexto de consultoria empresarial.

### Problema que resolve

Antes desta plataforma, toda análise de processos empresariais era executada diretamente via terminal — o operador (fundador da IntelliX.AI) precisava:
- Navegar manualmente para o diretório do workspace de cada cliente
- Executar `claude -p "/opensquad run {squad}"` no terminal
- Observar o `state.json` gerado pelo runner para saber o progresso
- Abrir manualmente os arquivos de output em markdown
- Fazer o upload dos resultados para o Google Drive do cliente à mão

### Solução

Um **cockpit web completo** que permite:
- Criar e gerenciar workspaces (um por engagement de consultoria)
- Disparar execuções de squads com um clique no browser
- Monitorar o progresso dos agentes em tempo real via **escritório virtual Phaser 2D**
- Visualizar outputs em markdown renderizado diretamente na plataforma
- Receber automaticamente o PDF e DOCX do relatório na pasta do cliente no Google Drive

---

## 2. O Que é o OpenSquad

**OpenSquad** (versão v0.1.15+) é um framework de orquestração multi-agente open source que funciona dentro de IDEs de IA (Claude Code, Cursor, Gemini CLI, etc.).

### Conceitos Fundamentais

#### Squad
Uma equipe de agentes de IA que colaboram em pipeline para completar uma tarefa. Cada agente tem papel, persona, instruções e skills próprios.

**Estrutura de um Squad no filesystem:**
```
squads/{nome}/
  squad.yaml           ← configuração do squad (agentes, steps, skills, checkpoint)
  squad-party.csv      ← personas dos agentes (displayName, icon, gender, path)
  state.json           ← estado live escrito pelo runner antes de cada step
  _memory/
    memories.md        ← aprendizados acumulados de runs anteriores (por-squad)
    runs.md            ← log histórico de execuções
  agents/
    lead-analyst.agent.md   ← pesquisa + diagnóstico primário
    specialist.agent.md     ← análise aprofundada por domínio
    strategist.agent.md     ← recomendações e roadmap
    reviewer.agent.md       ← revisão independente + score
  pipeline/
    pipeline.yaml
    steps/
      01-diagnosis.md
      02-specialist.md
      03-strategy.md
      04-review.md
  output/
    2026-05-04-143022/   ← run ID (timestamp)
      v1/
        report.md        ← output do agente
      state.json         ← snapshot do estado ao final do run
```

**Estrutura de Memória do Workspace (cross-squad):**
```
{workspace-slug}/
  _opensquad/
    _memory/
      company.md              ← contexto fixo da empresa cliente (editado pelo operador)
      shared-insights.md      ← NOVO — atualizado automaticamente ao final de cada squad
      cross-squad-log.md      ← NOVO — log de handoffs e conclusões entre squads
```

`shared-insights.md` é a **memória compartilhada cross-squad**: quando o squad RH termina, o runner extrai o Executive Summary e appenda neste arquivo. O squad Financeiro lê este arquivo antes de iniciar — o Lead Analyst sabe que "a empresa não tem sistema de gestão de desempenho" antes de começar a análise financeira de custos com pessoal.

**Formato de `shared-insights.md`:**
```markdown
# Insights Compartilhados — {Cliente}
> Atualizado automaticamente ao final de cada squad. Não editar manualmente.

## rh (concluído em 2026-05-04)
- Empresa não possui sistema de gestão de desempenho
- Turnover de 34% ao ano — crítico
- Ausência de plano de cargos e salários formal

## financeiro (concluído em 2026-05-05)
- ...
```

#### state.json — O Coração do Monitoramento

O runner do OpenSquad escreve este arquivo antes de **cada step** da pipeline. O VPS runner observa este arquivo via `setInterval` e envia callbacks para a Edge Function `squad-state-update`, que propaga mudanças via Supabase Realtime ao dashboard Phaser.

```json
{
  "squad": "rh",
  "status": "running",
  "step": { "current": 2, "total": 6, "label": "analyst" },
  "agents": [
    {
      "id": "researcher",
      "name": "Pesquisadora",
      "icon": "🔍",
      "status": "working",
      "desk": { "col": 1, "row": 1 },
      "gender": "female"
    },
    {
      "id": "analyst",
      "name": "Analista",
      "icon": "📊",
      "status": "idle",
      "desk": { "col": 2, "row": 1 },
      "gender": "male"
    }
  ],
  "handoff": {
    "from": "researcher",
    "to": "analyst",
    "message": "Pesquisa de processos de RH concluída com 12 pontos críticos identificados",
    "completedAt": "2026-05-04T14:32:15Z"
  },
  "startedAt": "2026-05-04T14:30:00Z",
  "updatedAt": "2026-05-04T14:32:15Z"
}
```

**Status possíveis por agente:** `idle` | `working` | `done` | `checkpoint` | `delivering`

**Status possíveis do squad:** `idle` | `running` | `completed` | `failed`

#### Pipeline Runner

O runner executa via `claude -p "/opensquad run {squad}"`:

1. Lê `squad.yaml` e `squad-party.csv`
2. Carrega contexto da empresa (`_opensquad/_memory/company.md`) e insights cross-squad (`_opensquad/_memory/shared-insights.md`)
3. Para cada step: escreve `state.json` → executa agente → valida output → handoff → repete
4. Se `checkpoint_required: true` no `squad.yaml`: ao atingir `checkpoint_step`, escreve `state.status = "checkpoint"` e **pausa** — aguarda resolução via polling da tabela `squad_checkpoints` no Supabase (a cada 10s, timeout 24h)
5. Ao concluir: marca `status: completed`, copia para pasta do run, atualiza `memories.md`, `runs.md` e appenda Executive Summary em `_opensquad/_memory/shared-insights.md`

#### Skills do OpenSquad

Skills são módulos de capacidades extras instaláveis nos agentes. Exemplos disponíveis:
- `web_search` / `web_fetch` — pesquisa web nativa
- `apify` — scraping de dados
- `canva` — criação de designs
- `resend` — envio de emails
- `blotato` / `instagram-publisher` — publicação em redes sociais
- `image-ai-generator` — geração de imagens via IA

---

## 3. Contexto de Negócio — IntelliX.AI

**IntelliX.AI** é uma empresa de consultoria empresarial especializada em IA e automação de processos.

### Modelo de Operação

- **Engagements:** Cada cliente contrata um "engagement" — uma análise completa de processos de um departamento ou área
- **Squads por departamento:** RH, Financeiro, Comercial, Operações, etc. — cada um tem um squad especializado
- **Fases do engagement:**
  - Fase 1: Diagnóstico (coleta de dados, mapeamento de processos)
  - Fase 2: Recomendações (análise crítica, sugestões de melhoria)
  - Fase 3: Implementação (roadmap, épicos, stories para execução)
- **Entregáveis:** Relatórios PDF/DOCX entregues na pasta Google Drive do cliente

### Papéis no Sistema

| Papel | Descrição |
|-------|-----------|
| **Admin (IntelliX)** | Único operador v1 — o fundador. Opera todos os workspaces |
| **Analyst** | Futuro: colaboradores IntelliX que podem rodar squads |
| **Viewer** | Futuro: clientes que podem visualizar resultados |

---

## 4. Decisões Arquiteturais

As seguintes decisões foram tomadas durante sessões de brainstorming e são **definitivas para o MVP v1**. Não reabrir sem justificativa técnica forte.

### Decisão 1 — Dashboard Visual

**Opção escolhida: Phaser como componente React carregado via dynamic import**

- Phaser instalado como pacote npm no projeto Lovable
- Importado dinamicamente via `import('phaser')` dentro de `useEffect` (client-side only)
- A cena `OfficeScene` mostra agentes em escritório 2D animado
- Recebe `SquadState` diretamente do hook de Realtime via prop `squadState`

**Alternativas rejeitadas:**
- React Canvas puro (perderia a riqueza visual dos sprites do OpenSquad)
- iframe separado (problemas de comunicação e state sync)

### Decisão 2 — Modelo de Execução

**Claude Code como subprocess no VPS Hetzner**

O subprocess `claude -p "/opensquad run {squadName}"` é de longa duração (5–30 min). Por isso:
- A Edge Function `squad-run-start` **não** executa o subprocess — ela delega ao VPS via `POST https://runner.intellixai.com.br/run`
- O VPS runner (`runner-server.js`) spawna o subprocess em background e responde imediatamente
- O VPS observa `state.json` via `setInterval(2000)` e envia callbacks HTTP ao Supabase
- Edge Functions têm timeout de ~150s — incompatível com runs longos

**Alternativas rejeitadas:**
- API Anthropic direta dentro de Edge Function: perde skills, memory e infraestrutura OpenSquad
- CLI manual: sem UX integrada

### Decisão 3 — Estrutura de Workspaces no Servidor

**Um diretório OpenSquad por engagement:**

```
/srv/opensquad-workspaces/
  {workspace-slug}/
    _opensquad/
      _memory/
        company.md       ← contexto da empresa cliente
        preferences.md
    squads/
      rh/               ← squad de RH deste cliente
      financeiro/
      comercial/
    output/
      ...
```

Templates reutilizáveis gerenciados na tabela `templates` do Supabase.

### Decisão 4 — Design dos Squads de Consultoria

**1 Lead Analyst + 1 Independent Reviewer por departamento. Sem sub-agentes.**

Pipeline por squad:
- Lead Analyst → Specialist → Strategist → Reviewer
- Output estruturado: Épicos → Features → Stories → Tasks (alimentará futuro Subsistema D)

### Decisão 5 — Auth v1

- **Single admin** (apenas o fundador opera v1)
- Schema multi-role no Supabase com RLS: `admin | analyst | viewer`
- Multi-usuário habilitável via invite sem refatoração quando a equipe crescer

### Decisão 6 — Google Drive como Repositório Oficial

- Ao criar workspace → cria automaticamente `IntelliX/{Cliente}/{Engagement}/` no Drive via Edge Function `drive-setup`
- Ao concluir run → Edge Function `export-run` pede ao VPS para gerar PDF + DOCX → upload automático no Drive
- Autenticação via Service Account (server-side via secrets do Supabase)

### Decisão 7 — Realtime vs WebSocket nativo

**Supabase Realtime substitui WebSocket nativo:**
- WebSocket nativo exige servidor Node.js persistente com upgrade de protocolo — incompatível com Lovable
- Supabase Realtime é zero-config, escalável, com reconexão automática
- Frontend subscreve a `postgres_changes` na tabela `squad_runs` — toda atualização do VPS via Edge Function é automaticamente propagada

### Decisão 8 — Frontend: Lovable em vez de Next.js standalone

**Lovable (Vite + React) substitui Next.js como plataforma de frontend:**

| Aspecto | Next.js (legado, `C:\Projects\opensquad-platform`) | Lovable (produção) |
|---------|-----------------------------------------------------|-------------------|
| Frontend | Next.js 16 App Router | React + Vite (Lovable) |
| Deploy frontend | Vercel | Lovable (built-in) |
| API Routes | `app/api/*/route.ts` | Supabase Edge Functions |
| Auth | `@supabase/ssr` + middleware | Supabase Auth via `supabase-js` |
| Realtime | WebSocket + chokidar | Supabase Realtime |
| Subprocess | child_process no servidor Next | VPS Hetzner via HTTP POST |

O código Next.js em `C:\Projects\opensquad-platform` permanece como **referência histórica** e não recebe novas features. Todo desenvolvimento ativo ocorre no projeto Lovable.

---

## 5. Arquitetura Técnica

O sistema é composto por **três nós** independentes que se comunicam via HTTP e Supabase Realtime:

```
┌─────────────────────────┐    invoke('squad-run-start')    ┌────────────────────────────┐
│   LOVABLE               │ ──────────────────────────────► │   SUPABASE                 │
│   (Vite + React)        │                                  │   hynadwlwrscvjubryqlg     │
│                         │ ◄─── postgres_changes ────────── │                            │
│  • Dashboard UI         │         (Realtime)               │  • PostgreSQL (5 tabelas)  │
│  • Phaser 2D Viewer     │                                  │  • Auth + RLS              │
│  • shadcn/ui dark       │    supabase.from('squad_runs')   │  • Edge Functions (4)      │
│  • React Router v6      │ ──────────────────────────────► │  • Realtime channels       │
│  • Zustand state        │                                  │                            │
└─────────────────────────┘                                  └────────────┬───────────────┘
         lovable.app URL                                                  │
                                                           POST /run      │ POST /squad-state-update
                                                           (bearer token) │ (callback_secret)
                                                                          │
                                                          ┌───────────────▼───────────────┐
                                                          │   VPS LINUX                   │
                                                          │   runner.intellixai.com.br    │
                                                          │                               │
                                                          │  • runner-server.js (PM2)     │
                                                          │  • claude -p "/opensquad run" │
                                                          │  • setInterval → state.json   │
                                                          │  • Puppeteer (PDF)            │
                                                          │  • docx npm (DOCX)            │
                                                          │  • /srv/opensquad-workspaces/ │
                                                          └───────────────────────────────┘
```

### Fluxo resumido

1. **UI → Supabase:** frontend invoca Edge Function `squad-run-start` via `supabase.functions.invoke()`
2. **Supabase → VPS:** Edge Function faz `POST runner.intellixai.com.br/run` com `bearerToken`
3. **VPS → subprocess:** `runner-server.js` spawna `claude -p "/opensquad run {squad}"` em background
4. **VPS → Supabase:** a cada 2s, VPS lê `state.json` e envia `POST /functions/v1/squad-state-update`
5. **Supabase → UI:** Edge Function atualiza `squad_runs`, Realtime entrega `postgres_changes` ao browser
6. **Browser → Phaser:** hook de Realtime atualiza Zustand → Phaser renderiza agentes em tempo real

---

## 6. Stack Tecnológica

### Frontend (Lovable)

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Plataforma | Lovable.dev | Build + deploy + preview integrado, Supabase nativo |
| Framework | React + Vite | Gerado pelo Lovable — CSR performático |
| Linguagem | TypeScript strict | Zero `any`, zero erros de compilação |
| Estilos | Tailwind CSS | Utility-first, dark theme exclusivo |
| Componentes | shadcn/ui | Radix UI acessível, customizável |
| Roteamento | React Router v6 | SPA com rotas protegidas |
| Estado global | Zustand | Leve, sem boilerplate Redux |
| Formulários | React Hook Form + Zod | Validação type-safe |
| Dashboard 2D | Phaser 3 (npm, dynamic import) | Engine usada pelo OpenSquad original |
| Notificações | Sonner | Toasts integrado ao Lovable |
| Markdown | marked | Renderização dos outputs dos squads |

### Backend (Supabase)

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Banco de dados | Supabase PostgreSQL | Auth + DB + RLS integrados |
| Auth | Supabase Auth | Email/senha, sessão gerenciada |
| Realtime | Supabase Realtime (`postgres_changes`) | Propaga estado do squad ao browser sem WebSocket próprio |
| Serverless | Supabase Edge Functions (Deno) | Proxy seguro entre frontend e VPS — guarda secrets |
| Google Drive | googleapis v3 via Service Account | Upload de PDF/DOCX, gestão de pastas |

### VPS Runner

| Componente | Tecnologia | Justificativa |
|-----------|-----------|---------------|
| Servidor HTTP | Node.js nativo (`http.createServer`) | Sem dependências externas, leve |
| Subprocess | `child_process.spawn` | Executa `claude -p "/opensquad run {squad}"` |
| File watching | `setInterval` + `fs.readFile` | Chokidar não funciona em chamadas serverless; polling a cada 2s é suficiente |
| PDF | Puppeteer | Markdown → HTML → PDF com branding IntelliX.AI |
| DOCX | docx npm | Geração de Word sem dependências nativas |
| Process manager | PM2 | Keep-alive, restart automático, logs |
| Proxy HTTPS | Nginx + Certbot (Let's Encrypt) | SSL para `runner.intellixai.com.br:443 → 3099` |

---

## 7. Estrutura de Arquivos

### Projeto Lovable (frontend + edge functions)

```
[projeto-lovable]/
│
├── src/
│   ├── components/
│   │   ├── office/
│   │   │   └── OfficeViewer.tsx          ← wrapper React do Phaser Game
│   │   ├── workspace/
│   │   │   ├── WorkspaceCard.tsx         ← card clicável na listagem
│   │   │   ├── WorkspaceForm.tsx         ← formulário criar workspace (Zod)
│   │   │   ├── RunHistory.tsx            ← lista de runs com badges de status
│   │   │   └── RunOutputViewer.tsx       ← markdown renderizado do relatório
│   │   └── ui/
│   │       └── [shadcn components]/      ← button, card, input, badge, etc.
│   │
│   ├── pages/ (ou app/ conforme geração do Lovable)
│   │   ├── Login.tsx                     ← /login
│   │   ├── WorkspaceList.tsx             ← /workspaces
│   │   ├── WorkspaceNew.tsx              ← /workspaces/new
│   │   ├── WorkspaceOverview.tsx         ← /workspaces/:id
│   │   ├── RunDashboard.tsx              ← /workspaces/:id/run/:squad
│   │   ├── RunHistory.tsx                ← /workspaces/:id/runs
│   │   └── RunOutputViewer.tsx           ← /workspaces/:id/runs/:runId
│   │
│   ├── hooks/
│   │   └── useAgents.ts                  ← Realtime subscription em squad_runs
│   │
│   ├── store/
│   │   └── useSquadStore.ts              ← Zustand: squadState, runStatus
│   │
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts                 ← createClient() com VITE_* vars
│   │       └── workspaces.ts             ← CRUD helpers (getWorkspaces, createSquadRun, ...)
│   │
│   ├── types/
│   │   └── index.ts                      ← AgentState, SquadState, Workspace, SquadRun, etc.
│   │
│   └── index.css                         ← design system IntelliX.AI (tokens CSS, fontes, scrollbar)
│
├── supabase/
│   └── functions/
│       ├── squad-run-start/
│       │   └── index.ts                  ← ✅ DEPLOYADA — dispara run no VPS
│       ├── squad-state-update/
│       │   └── index.ts                  ← ✅ DEPLOYADA — recebe callback do VPS
│       ├── drive-setup/
│       │   └── index.ts                  ← 🔜 Prompt 7 — cria pasta Drive
│       └── export-run/
│           └── index.ts                  ← 🔜 Prompt 7 — orquestra PDF/DOCX + upload
│
└── .env / Lovable Secrets                ← VITE_SUPABASE_URL, VPS_RUNNER_URL, etc.
```

### VPS Runner (servidor Hetzner/Hostinger)

```
/srv/
├── runner-server.js                      ← servidor HTTP na porta 3099
├── .env                                  ← VPS_RUNNER_SECRET, ANTHROPIC_API_KEY, etc.
└── opensquad-workspaces/
    ├── {workspace-slug-1}/
    │   ├── _opensquad/_memory/company.md
    │   └── squads/rh/state.json
    └── {workspace-slug-2}/
        └── ...

/etc/nginx/sites-available/runner.intellixai.com.br   ← proxy 443 → 3099
```

### Projeto Next.js legado (referência, não usar)

```
C:\Projects\opensquad-platform\           ← LEGADO — não recebe features novas
├── app/                                  ← App Router Next.js 16
├── lib/execution/squad-runner.ts         ← código de referência do subprocess
├── lib/execution/state-watcher.ts        ← código de referência do chokidar
└── SISTEMA_TECNICO.md                    ← este arquivo
```

---

## 8. Schema do Banco de Dados

Projeto Supabase: `hynadwlwrscvjubryqlg` · Todas as tabelas com RLS ativo.

### Tabelas

#### `user_roles`
Controle de acesso multi-role. v1 apenas `admin`.

```sql
CREATE TABLE user_roles (
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role       text NOT NULL DEFAULT 'admin'
               CHECK (role IN ('admin', 'analyst', 'viewer')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_sees_own_role" ON user_roles
  FOR ALL USING (user_id = auth.uid());
```

#### `templates`
Templates de engagement reutilizáveis (ex: "Diagnóstico Padrão v2").

```sql
CREATE TABLE templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  phases      jsonb NOT NULL DEFAULT '[]',   -- ex: ["Fase 1 — Diagnóstico", ...]
  squads      jsonb NOT NULL DEFAULT '[]',   -- ex: ["rh", "financeiro", ...]
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_templates" ON templates FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
```

#### `workspaces`
Cada workspace representa um engagement de consultoria para um cliente.

```sql
CREATE TABLE workspaces (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text UNIQUE NOT NULL,        -- ex: "empresa-xyz-1746450000000"
  client_name      text NOT NULL,               -- ex: "Empresa XYZ Ltda"
  engagement_name  text NOT NULL,               -- ex: "Diagnóstico de RH Q2 2026"
  description      text,
  template_id      uuid REFERENCES templates(id),
  drive_folder_id  text,                        -- ID da pasta no Google Drive
  drive_folder_url text,                        -- URL pública da pasta
  owner_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_workspaces" ON workspaces FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
```

#### `workspace_phases`
Fases dentro de um engagement (Diagnóstico, Recomendações, Implementação).

```sql
CREATE TABLE workspace_phases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  order_index  integer NOT NULL,
  status       text DEFAULT 'pending'
                 CHECK (status IN ('pending', 'active', 'completed')),
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE workspace_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_phases" ON workspace_phases FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
```

#### `squad_runs`
Registro de cada execução de squad. Persiste estado em tempo real e links dos entregáveis.

```sql
CREATE TABLE squad_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  phase_id         uuid REFERENCES workspace_phases(id),
  squad_name       text NOT NULL,               -- ex: "rh", "financeiro"
  status           text DEFAULT 'pending'
                     CHECK (status IN ('pending','running','completed','failed')),
  state_snapshot   jsonb,                       -- último state.json recebido do VPS
  opensquad_run_id text,                        -- run_id gerado pelo OpenSquad
  output_markdown  text,                        -- conteúdo do relatório final
  drive_file_id    text,                        -- ID do PDF no Drive
  drive_file_url   text,                        -- URL do PDF no Drive
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id)
);
ALTER TABLE squad_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_runs" ON squad_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Realtime habilitado (confirmado em 2026-05-04)
ALTER TABLE squad_runs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE squad_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
```

### Triggers

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 9. Edge Functions

Projeto Supabase `hynadwlwrscvjubryqlg`. Todas em Deno/TypeScript.

| Função | Status | verify_jwt | Gatilho | Propósito |
|--------|--------|-----------|---------|-----------|
| `squad-run-start` | ✅ Deployada | `false` ⚠️ | Frontend via `supabase.functions.invoke()` | Valida workspace, chama VPS `/run` |
| `squad-state-update` | ✅ Deployada | `false` | VPS (callback anônimo + CALLBACK_SECRET) | Recebe state.json, atualiza squad_runs |
| `squad-checkpoint-resolve` | ✅ Criada | `true` | Frontend (botão Aprovar/Rejeitar) | Resolve checkpoint humano, desbloqueia VPS |
| `drive-setup` | 🔜 Prompt 7 | `true` | Frontend (fire-and-forget ao criar workspace) | Cria hierarquia de pastas no Drive |
| `export-run` | 🔜 Prompt 7 | interna | Chamada por `squad-state-update` ao completar | Pede PDF/DOCX ao VPS, faz upload no Drive |
| `engagement-next-squad` | ✅ Criada | interna | Chamada por `squad-state-update` ao completar | Avança para próximo squad do engagement |

> ⚠️ **Segurança:** `squad-run-start` foi deployada com `verify_jwt: false`. Em produção, deve ser `true` ou deve validar o JWT manualmente via `createClient` com o header `Authorization` da request. A chamada via `supabase.functions.invoke()` envia o JWT do usuário, mas sem `verify_jwt: true` o Supabase não rejeita requests sem JWT válido.

### `squad-run-start`

**Input:** `{ workspaceId, squadName, runId }`

**Fluxo:**
1. Valida inputs e busca workspace pelo `workspaceId`
2. Faz `POST https://runner.intellixai.com.br/run` com bearer `VPS_RUNNER_SECRET`
3. Passa `callbackUrl = SUPABASE_URL + /functions/v1/squad-state-update` e `callbackSecret = CALLBACK_SECRET`
4. Se VPS responder erro → marca `squad_runs.status = 'failed'`
5. Retorna `{ ok: true, runId }` ao frontend

**Secrets necessários:** `VPS_RUNNER_URL`, `VPS_RUNNER_SECRET`, `CALLBACK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### `squad-state-update`

**Auth:** header `Authorization: Bearer {CALLBACK_SECRET}` (sem JWT — chamado pelo VPS)

**Input:** `{ runId, state, outputMarkdown? }`

**Fluxo:**
1. Valida `CALLBACK_SECRET`
2. Atualiza `squad_runs.state_snapshot = state`
3. Se `state.status === 'completed'` → atualiza status + `completed_at` + `output_markdown`
4. Se completado → dispara `export-run` (fire-and-forget)
5. Supabase Realtime propaga `postgres_changes` automaticamente ao frontend

**Secrets necessários:** `CALLBACK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### `drive-setup` _(a deployer no Prompt 7)_

**Input:** `{ workspaceId }`

**Fluxo:**
1. Busca `client_name` e `engagement_name` do workspace
2. Cria ou reutiliza `IntelliX/{client_name}/` no Drive
3. Cria `{engagement_name}/` dentro da pasta do cliente
4. Atualiza `workspaces.drive_folder_id` e `drive_folder_url`

### `export-run` _(a deployer no Prompt 7)_

**Input:** `{ runId, workspaceId, squadName }`

**Fluxo:**
1. Valida que workspace tem `drive_folder_id`
2. Faz `POST runner.intellixai.com.br/export` com markdown do run
3. Recebe `pdfBase64` + `docxBase64` do VPS
4. Faz upload de ambos para a pasta do cliente no Drive via googleapis
5. Atualiza `squad_runs.drive_file_id` e `drive_file_url`

---

## 10. Squads de Consultoria

Os squads são configurados **fora da plataforma web** — no filesystem do servidor usando o CLI do OpenSquad. A plataforma apenas os dispara e monitora.

### Design Universal dos Squads de Consultoria

Cada squad de consultoria segue o padrão:

```
Squad: {departamento}
├── Agente 1: Lead Analyst  (pesquisa + análise primária)
├── Agente 2: Specialist    (análise aprofundada por domínio)
├── Checkpoint: aprovação humana do diagnóstico
├── Agente 3: Strategist    (recomendações e roadmap)
└── Agente 4: Reviewer      (revisão independente + score)
```

**Princípio:** 1 Lead Analyst + 1 Independent Reviewer por departamento. Sem sub-agentes para fases do mesmo domínio — perde coerência e multiplica tokens.

### Output Estruturado para Subsistema D

Todo squad de consultoria deve produzir output no formato:

```markdown
# Diagnóstico — {Departamento} — {Cliente}

## Executive Summary

## Processos Mapeados

## Problemas Identificados (Épicos)

### Épico 1: {Nome}
- **Feature 1.1:** {Descrição}
  - **Story:** Como {ator}, quero {ação}, para {benefício}
    - **Task:** {ação técnica específica}

## Recomendações

## Roadmap de Implementação

## Score de Maturidade: {X}/10
```

Este formato alimentará automaticamente o **Subsistema D** (backlog agile, quando implementado).

### Squads Disponíveis

| ID | Departamento | Ícone | Cor |
|----|-------------|-------|-----|
| `rh` | Recursos Humanos | 👥 | `#7c3aed` |
| `financeiro` | Financeiro | 💰 | `#06b6d4` |
| `comercial` | Comercial/Vendas | 📈 | `#10b981` |
| `operacoes` | Operações | ⚙️ | `#f59e0b` |
| `ti` | Tecnologia | 💻 | `#ec4899` |
| `marketing` | Marketing | 📣 | `#f97316` |

### Configuração de Squad — `squad.yaml` + `pipeline.yaml`

O squad RH serve como referência canônica. Todos os outros squads seguem o mesmo schema.

**`squads/rh/squad.yaml`:**
```yaml
name: rh
display_name: "Recursos Humanos"
description: "Diagnóstico completo de processos de RH"
icon: "👥"
color: "#7c3aed"
version: "1.0.0"

party_file: squad-party.csv
pipeline_file: pipeline/pipeline.yaml

memory:
  path: _memory/
  load_on_start:
    - memories.md
    - runs.md

context:
  company_file: ../../_opensquad/_memory/company.md
  workspace_shared: ../../_opensquad/_memory/shared-insights.md  # memória cross-squad

settings:
  checkpoint_required: true   # pausa entre Specialist e Strategist aguardando aprovação humana
  checkpoint_step: 2          # após o step 2 (Specialist)
  max_runtime_minutes: 45
```

**`squads/rh/pipeline/pipeline.yaml`:**
```yaml
steps:
  - id: 1
    agent: lead-analyst
    label: "Pesquisa & Diagnóstico Primário"
    input: context.company_file
    output: pipeline/steps/01-diagnosis.md
    timeout_minutes: 15

  - id: 2
    agent: specialist
    label: "Análise Especializada de RH"
    input: pipeline/steps/01-diagnosis.md
    output: pipeline/steps/02-specialist.md
    timeout_minutes: 15

  # CHECKPOINT — operador aprova antes de continuar para recomendações
  - id: checkpoint
    type: human_approval
    label: "Aprovação do Diagnóstico"
    requires: [1, 2]

  - id: 3
    agent: strategist
    label: "Recomendações & Roadmap"
    input:
      - pipeline/steps/01-diagnosis.md
      - pipeline/steps/02-specialist.md
    output: pipeline/steps/03-strategy.md
    timeout_minutes: 10

  - id: 4
    agent: reviewer
    label: "Revisão Independente"
    input: pipeline/steps/03-strategy.md
    output: pipeline/steps/04-review.md
    timeout_minutes: 5

output:
  final_report: output/{run_id}/v1/report.md
  merge_steps: [1, 2, 3, 4]
```

**`squads/rh/squad-party.csv`:**
```csv
id,displayName,icon,gender,path
lead-analyst,Ana Pesquisadora,🔍,female,agents/lead-analyst.agent.md
specialist,Carlos Especialista,📊,male,agents/specialist.agent.md
strategist,Beatriz Estrategista,🎯,female,agents/strategist.agent.md
reviewer,Roberto Revisor,✅,male,agents/reviewer.agent.md
```

### Templates de Agentes — `agents/*.agent.md`

Os 4 arquivos de agente vivem em `squads/{squad}/agents/`. Substitua `{Departamento}` pelo departamento do squad.

**`agents/lead-analyst.agent.md`:**
```markdown
# Lead Analyst — {Departamento}

## Role
Pesquisador-analista sênior especializado em diagnóstico de processos de {departamento}.

## Objective
Mapear todos os processos do departamento, identificar gargalos e produzir diagnóstico
preliminar estruturado no formato IntelliX padrão.

## Instructions
- Leia o contexto da empresa em `_opensquad/_memory/company.md` antes de qualquer análise
- Se existir `_opensquad/_memory/shared-insights.md`, leia e referencie insights anteriores
- Mapeie processos AS-IS usando estrutura: Entrada → Processamento → Saída → Responsável
- Identifique no mínimo 5 problemas críticos com evidência explícita
- Estruture o output em Épicos → Features → Stories conforme formato IntelliX
- Escreva handoff de 3 parágrafos para o Specialist: contexto, principais achados, lacunas

## Output Format
Siga o template em `squads/{squad}/pipeline/steps/01-diagnosis.md`

## Skills
- web_search (benchmarks setoriais, regulamentações, melhores práticas)
```

**`agents/specialist.agent.md`:**
```markdown
# Specialist — {Departamento}

## Role
Especialista de domínio com profundidade técnica em {departamento}. Aprofunda o diagnóstico
do Lead Analyst com análise técnica específica.

## Objective
Validar e aprofundar o diagnóstico preliminar, identificar causas raiz e quantificar impactos.

## Instructions
- Leia o output do Lead Analyst em `pipeline/steps/01-diagnosis.md`
- Para cada Épico identificado: detalhe causa raiz, impacto financeiro estimado e urgência
- Identifique dependências e conflitos entre os problemas
- Produza análise de maturidade por processo (1-10) com rubrica explícita
- Mantenha foco no domínio — não expanda para outros departamentos

## Output Format
Siga o template em `squads/{squad}/pipeline/steps/02-specialist.md`
```

**`agents/strategist.agent.md`:**
```markdown
# Strategist — {Departamento}

## Role
Estrategista responsável por converter diagnóstico em plano de ação concreto e priorizado.

## Objective
Produzir roadmap de implementação com recomendações priorizadas por impacto e esforço.

## Instructions
- Leia os outputs do Lead Analyst e Specialist
- Produza recomendações ordenadas por matriz impacto × esforço (Quick Wins primeiro)
- Para cada recomendação: quem executa, prazo estimado, dependências, KPIs de sucesso
- O roadmap deve ter 3 horizontes: 30 dias / 90 dias / 12 meses
- Alimente a seção de Épicos com Features e Stories prontas para o Subsistema D

## Output Format
Siga o template em `squads/{squad}/pipeline/steps/03-strategy.md`
```

**`agents/reviewer.agent.md`:**
```markdown
# Independent Reviewer — {Departamento}

## Role
Auditor independente. Avalia o relatório consolidado sem viés de quem o produziu.

## Objective
Validar rigor metodológico, consistência interna e aplicabilidade das recomendações.
Atribuir Score de Maturidade final.

## Instructions
- Leia APENAS `pipeline/steps/03-strategy.md` — não leia os steps anteriores diretamente
- Para cada Épico: evidência suficiente? (sim/não + justificativa em 1 linha)
- Identifique conflitos internos entre recomendações
- Liste "pontos cegos": o que o time NÃO investigou e deveria
- Atribua Score de Maturidade de 1 a 10 com rubrica explícita por dimensão
- Adicione seção "## Revisão Independente" ao final do relatório — NÃO reescreva o restante

## Output Format
Adicione ao relatório final a seção "## Revisão Independente" com:
- Validação por Épico
- Pontos cegos identificados
- Score de Maturidade: {X}/10 (com rubrica)
- Recomendação final: Aprovado / Aprovado com ressalvas / Reprovado
```

---

## 11. Fluxo End-to-End

### Criar um Novo Engagement

```
1. Usuário clica "+ Novo Workspace" no Lovable
2. Preenche: Cliente, Engagement, Descrição, Template (opcional)
3. WorkspaceForm.onSubmit():
   a. Cria workspace no Supabase → retorna workspace.id
   b. Dispara supabase.functions.invoke('drive-setup', { workspaceId }) — fire-and-forget
   c. Redireciona → /workspaces/{id}
4. Edge Function drive-setup executa em background:
   - Cria IntelliX/{Cliente}/{Engagement}/ no Google Drive
   - Atualiza workspace.drive_folder_url
5. WorkspaceCard exibe ícone Drive após update via Realtime ou re-fetch
```

### Rodar um Squad

```
1. Usuário acessa /workspaces/{id}/run/rh no Lovable
2. Verifica se já existe run com status='running' para este workspace+squad
3. Usuário clica "Iniciar Squad":
   a. createSquadRun({ workspace_id, squad_name, created_by }) → cria squad_runs entry
   b. supabase.functions.invoke('squad-run-start', { workspaceId, squadName, runId })
4. Edge Function squad-run-start:
   a. POST https://runner.intellixai.com.br/run (Bearer VPS_RUNNER_SECRET)
   b. Payload: { workspaceSlug, squadName, runId, callbackUrl, callbackSecret }
5. VPS runner responde 200 imediatamente e executa em background:
   a. spawn('claude', ['-p', '/opensquad run rh'], { cwd: workspaceDir })
   b. setInterval(2000) → lê state.json → POST /functions/v1/squad-state-update
6. Edge Function squad-state-update:
   a. UPDATE squad_runs SET state_snapshot = {...} WHERE id = runId
   b. Supabase Realtime propaga postgres_changes ao browser
7. Browser recebe update via canal Realtime:
   a. setSquadState(payload.new.state_snapshot)
   b. Zustand atualiza → OfficeViewer re-renderiza
   c. Agentes mudam de status no escritório Phaser em tempo real
8. Ao concluir (state.status === 'completed'):
   a. squad_runs.status = 'completed'
   b. squad-state-update dispara export-run (fire-and-forget)
   c. export-run: VPS gera PDF/DOCX → upload Drive → atualiza drive_file_url
   d. UI exibe banner verde + botão "Abrir no Drive"
```

### Checkpoint Humano — Pausa e Retomada

O checkpoint ocorre entre o Step 2 (Specialist) e o Step 3 (Strategist). O operador precisa ler o diagnóstico e aprovar antes que recomendações sejam geradas.

```
1. VPS conclui Step 2 (Specialist)
2. Runner detecta checkpoint_required: true + checkpoint_step: 2 no squad.yaml
3. VPS escreve state.json com status: "checkpoint"
4. VPS POST /functions/v1/squad-state-update com state
5. Edge Function cria registro em squad_checkpoints (status: 'pending', context_md: sumário)
6. Edge Function UPDATE squad_runs SET state_snapshot = { status: "checkpoint", ... }
7. Supabase Realtime propaga → browser
8. RunDashboard exibe banner amarelo com sumário do diagnóstico:
   - Seção "## Aguardando Aprovação" com context_md renderizado em markdown
   - Botão "Aprovar e Continuar" → supabase.functions.invoke('squad-checkpoint-resolve',
       { checkpointId, decision: 'approved' })
   - Botão "Rejeitar" → modal para notes → invoke com decision: 'rejected'

--- SE APROVADO ---
9.  Edge Function squad-checkpoint-resolve:
    UPDATE squad_checkpoints SET status='approved', resolved_by, resolved_at
10. VPS polling (setInterval 10s) detecta status='approved'
11. Runner desbloqueia → executa Step 3 (Strategist) e Step 4 (Reviewer)
12. Fluxo normal de conclusão

--- SE REJEITADO ---
9.  Edge Function squad-checkpoint-resolve:
    UPDATE squad_checkpoints SET status='rejected', notes
    UPDATE squad_runs SET status='failed', completed_at
10. Realtime propaga → UI exibe banner vermelho "Diagnóstico rejeitado: {notes}"
11. VPS polling detecta 'rejected' → encerra subprocess graciosamente
```

**Tabela `squad_checkpoints`:** ver `supabase/migrations/0002_checkpoints.sql`

**Edge Function `squad-checkpoint-resolve`:** ver `supabase/functions/squad-checkpoint-resolve/index.ts`

**VPS — lógica `waitForCheckpoint()` no `runner-server.js`:**
```javascript
async function waitForCheckpoint(runId, supabaseUrl, supabaseKey) {
  // Timeout de 24h — runs de consultoria podem aguardar overnight
  const TIMEOUT_MS = 24 * 60 * 60 * 1000;
  const POLL_MS = 10_000;
  const deadline = Date.now() + TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(interval);
        reject(new Error('Checkpoint timeout (24h)'));
        return;
      }
      const res = await fetch(
        `${supabaseUrl}/rest/v1/squad_checkpoints?run_id=eq.${runId}&status=neq.pending&select=status,notes`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const rows = await res.json();
      if (rows.length > 0) {
        clearInterval(interval);
        rows[0].status === 'approved' ? resolve('approved') : reject(new Error(rows[0].notes));
      }
    }, POLL_MS);
  });
}
```

### Visualizar Output

```
1. Usuário acessa /workspaces/{id}/runs/{runId}
2. Busca squad_runs por runId via supabase.from('squad_runs').select('*').eq('id', runId)
3. marked.parse(output_markdown) converte → HTML
4. Renderiza com classe prose prose-invert (Tailwind Typography)
5. Botão "Abrir PDF no Drive" → drive_file_url
```

---

## 12. Dashboard em Tempo Real (Phaser)

### Componente `OfficeViewer.tsx`

Wrapper React do Phaser Game em `src/components/office/OfficeViewer.tsx`:

- **Props:** `{ squadState: SquadState | null, width?: number, height?: number }`
- **Init:** `useEffect(() => { import('phaser').then(...) }, [])` — carrega Phaser apenas no cliente
- **Update:** `useEffect(() => { sceneRef.current?.renderAgents(agents) }, [squadState])` — propaga estado

### Cadeia de propagação de estado

```
VPS: state.json muda (setInterval 2s)
    ↓
POST /functions/v1/squad-state-update (Bearer CALLBACK_SECRET)
    ↓
Edge Function: UPDATE squad_runs SET state_snapshot = {...}
    ↓
Supabase Realtime: postgres_changes event (squad_runs, UPDATE)
    ↓
Browser: supabase.channel('run-{runId}')
         .on('postgres_changes', { event:'UPDATE', table:'squad_runs', filter:'id=eq.{runId}' }, handler)
    ↓
setSquadState(payload.new.state_snapshot)  ← React state
    ↓
<OfficeViewer squadState={squadState} />
    ↓
sceneRef.current.renderAgents(agents)      ← Phaser scene
    ↓
AgentSprite: statusCircle.setFillStyle() + pulseTimer toggle
```

### Status → animação Phaser

| Status | Cor | Animação |
|--------|-----|----------|
| `idle` | `#94a3b8` (cinza) | sem animação |
| `working` | `#06b6d4` (cyan) | pulse scale 1.0 ↔ 1.15 a cada 500ms |
| `done` | `#10b981` (verde) | sem animação |
| `checkpoint` | `#f59e0b` (amarelo) | sem animação |
| `delivering` | `#7c3aed` (violeta) | sem animação |

### Subscription Realtime no frontend

```typescript
useEffect(() => {
  if (!currentRunId) return;
  const channel = supabase
    .channel(`run-${currentRunId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'squad_runs',
      filter: `id=eq.${currentRunId}`
    }, (payload) => {
      setSquadState(payload.new.state_snapshot);
      setRunStatus(payload.new.status);
      if (payload.new.drive_file_url) setDriveUrl(payload.new.drive_file_url);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [currentRunId]);
```

---

## 13. Integração Google Drive

### Autenticação

- **Service Account** Google Cloud com permissão `https://www.googleapis.com/auth/drive`
- Credenciais em JSON salvas no secret `GOOGLE_SERVICE_ACCOUNT_KEY` do Supabase (nunca no frontend)
- A pasta raiz `IntelliX/` deve ser criada manualmente no Drive e seu ID configurado em `GOOGLE_DRIVE_PARENT_FOLDER_ID`

### Hierarquia de Pastas

```
Drive (conta Google IntelliX.AI)
└── IntelliX/                          ← GOOGLE_DRIVE_PARENT_FOLDER_ID
    ├── Empresa XYZ Ltda/              ← criado ao criar 1º engagement do cliente
    │   ├── Diagnóstico de RH Q2 2026/ ← drive_folder_url do workspace
    │   │   ├── rh-2026-05-04.pdf
    │   │   └── rh-2026-05-04.docx
    │   └── Análise Comercial 2026/
    └── Outra Empresa SA/
```

### Geração dos Documentos (no VPS)

Puppeteer e docx rodam **no VPS** — não em Edge Functions (sem suporte a browser headless nem manipulação binária complexa em Deno).

**PDF (Puppeteer):**
- Markdown → HTML com template IntelliX.AI (logo, data, tipografia Segoe UI)
- Puppeteer renderiza o HTML → PDF A4 com margens 20mm
- Retornado como `pdfBase64` no body da resposta ao `export-run`

**DOCX (docx npm):**
- Parser simples de Markdown por linhas
- Detecta `#`, `##`, `###` → HeadingLevel correspondente
- Texto normal → Paragraph com TextRun
- Retornado como `docxBase64`

---

## 14. VPS Runner Server

O `runner-server.js` é o único componente persistente do sistema — um servidor Node.js minimalista que age como bridge entre as Edge Functions do Supabase e o subprocess Claude Code CLI.

### Configuração

| Item | Valor |
|------|-------|
| Domínio | `runner.intellixai.com.br` |
| Porta interna | `3099` |
| Proxy | Nginx (443 SSL → 3099) |
| SSL | Let's Encrypt via Certbot |
| Processo | PM2 (`opensquad-runner`) |
| Arquivo | `/srv/runner-server.js` |
| Workspaces | `/srv/opensquad-workspaces/{slug}/` |

### Endpoints

#### `POST /run`

Inicia a execução de um squad. **Responde 200 imediatamente** e executa em background.

**Auth:** `Authorization: Bearer {VPS_RUNNER_SECRET}`

**Input:**
```json
{
  "workspaceSlug": "empresa-xyz-1746450000000",
  "squadName": "rh",
  "runId": "uuid-do-run",
  "callbackUrl": "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/squad-state-update",
  "callbackSecret": "token-secreto"
}
```

**Comportamento em background:**
1. Spawna `claude -p "/opensquad run {squadName}"` no diretório `{workspaceDir}`
2. `setInterval(2000)`: lê `state.json` → se mudou → POST callback ao Supabase
3. Ao fechar subprocess: envia estado final com `status: 'completed'` ou `'failed'` + `outputMarkdown`

#### `POST /export`

Gera PDF e DOCX a partir do markdown do run.

**Auth:** `Authorization: Bearer {VPS_RUNNER_SECRET}`

**Input:** `{ runId, squadName, markdown, clientName, engagementName }`

**Output:** `{ pdfBase64, docxBase64 }`

#### `GET /health`

**Output:** `{ ok: true, version: "1.0.0", service: "opensquad-runner" }`

Sem autenticação. Usado para monitoramento.

### Inicialização e persistência

```bash
# Instalar dependências globais
npm install -g pm2 puppeteer docx marked @anthropic-ai/claude-code

# Iniciar o runner
pm2 start /srv/runner-server.js --name opensquad-runner

# Configurar auto-start
pm2 startup
pm2 save

# Verificar saúde
curl https://runner.intellixai.com.br/health
```

### Nginx config

```nginx
server {
    listen 443 ssl;
    server_name runner.intellixai.com.br;

    ssl_certificate /etc/letsencrypt/live/runner.intellixai.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/runner.intellixai.com.br/privkey.pem;

    location / {
        proxy_pass http://localhost:3099;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 1800s;
        proxy_send_timeout 1800s;
    }
}
```

> **Nota de migração:** para migrar o VPS de Hetzner para Hostinger (ou outro provedor), consulte `MIGRATION_VPS_HOSTINGER.md` neste diretório.

---

## 15. Configuração de Ambiente

### Lovable Secrets (`Project Settings → Secrets`)

```
# Supabase (prefixo VITE_ = exposto no bundle React)
VITE_SUPABASE_URL=https://hynadwlwrscvjubryqlg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# VPS Runner (prefixo VITE_ para URL pública; secret sem prefixo para Edge Functions)
VITE_VPS_RUNNER_URL=https://runner.intellixai.com.br

# App
VITE_APP_NAME=OpenSquad Platform — IntelliX.AI
```

### Supabase Edge Function Secrets (painel Supabase → Edge Functions → Secrets)

```
VPS_RUNNER_URL=https://runner.intellixai.com.br
VPS_RUNNER_SECRET=<token-secreto>       ← confirmar que VPS usa o mesmo valor
CALLBACK_SECRET=<token-secreto>          ← confirmar que VPS usa o mesmo valor
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_DRIVE_PARENT_FOLDER_ID=<id-da-pasta-IntelliX>
SUPABASE_URL=<auto>                      ← injetado automaticamente pelo Supabase
SUPABASE_SERVICE_ROLE_KEY=<auto>         ← injetado automaticamente pelo Supabase
```

### VPS `.env` (`/srv/.env`)

```
VPS_RUNNER_SECRET=<mesmo-do-supabase>
CALLBACK_SECRET=<mesmo-do-supabase>
OPENSQUAD_WORKSPACES_DIR=/srv/opensquad-workspaces
ANTHROPIC_API_KEY=sk-ant-...
```

### Setup inicial de um novo workspace no VPS

```bash
ssh user@runner.intellixai.com.br
cd /srv/opensquad-workspaces
mkdir {workspace-slug} && cd {workspace-slug}
npx opensquad init
# Editar _opensquad/_memory/company.md com dados do cliente
```

### Estado atual de deploy (2026-05-04)

| Componente | Status |
|-----------|--------|
| Edge Function `squad-run-start` | ✅ Deployada (verify_jwt: **false** ⚠️ — mudar para true antes do go-live) |
| Edge Function `squad-state-update` | ✅ Deployada (verify_jwt: false) |
| Secret `VPS_RUNNER_URL` | ✅ Configurado |
| Secret `VPS_RUNNER_SECRET` | ✅ Configurado |
| Secret `CALLBACK_SECRET` | ✅ Configurado |
| `squad_runs` Realtime | ✅ Ativo (REPLICA IDENTITY FULL) |
| Lovable — Prompts 1–4 | ✅ Executados |
| Lovable — Prompt 5 (Phaser) | 🔄 Em andamento |
| Edge Function `drive-setup` | 🔜 Prompt 7 |
| Edge Function `export-run` | 🔜 Prompt 7 |
| Lovable — Prompts 6–8 | 🔜 Pendente |

---

## 16. Comunicação entre Nós — DB-as-bus

O princípio central da arquitetura: **o Postgres é a fonte da verdade. O Realtime é o sistema nervoso. Nenhum nó conhece o outro diretamente exceto via Supabase.**

### Por que não WebSocket nativo

O WebSocket `/__squads_ws` do projeto Next.js original requer um servidor Node.js persistente com `http.createServer` e upgrade de protocolo. O Lovable não dá acesso ao servidor HTTP subjacente — o frontend é client-side puro. A solução com Supabase Realtime é superior: zero configuração, escalável, reconexão automática, funciona em qualquer deploy.

### Por que não chokidar na Edge Function

`chokidar` requer acesso ao filesystem do SO para registrar eventos `inotify`. Edge Functions são ambientes Deno serverless sem filesystem persistente — cada invocação é isolada. O VPS, que tem filesystem real, observa o `state.json` via `setInterval` e envia o estado pro Supabase via HTTP callback.

### Fluxo bidirecional completo

```
FLUXO 1 — UI → Squad (iniciar run)
────────────────────────────────────────────────────────
[Lovable UI]
  supabase.functions.invoke('squad-run-start', { workspaceId, squadName, runId })
    │
    ▼
[Edge Function: squad-run-start]
  fetch('https://runner.intellixai.com.br/run', {
    method: 'POST',
    headers: { Authorization: 'Bearer VPS_RUNNER_SECRET' },
    body: { workspaceSlug, squadName, runId, callbackUrl, callbackSecret }
  })
    │
    ▼
[VPS: runner-server.js]
  spawn('claude', ['-p', '/opensquad run rh'], { cwd: workspaceDir })
  → responde 200 imediatamente, executa em background


FLUXO 2 — Squad → UI (propagação de estado)
────────────────────────────────────────────────────────
[VPS: runner-server.js] (background)
  setInterval(2000) → readFile('state.json')
  → POST https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/squad-state-update
     headers: { Authorization: 'Bearer CALLBACK_SECRET' }
     body: { runId, state, outputMarkdown? }
    │
    ▼
[Edge Function: squad-state-update]
  supabase.from('squad_runs').update({ state_snapshot: state }).eq('id', runId)
    │
    ▼
[Supabase Postgres]
  UPDATE squad_runs SET state_snapshot = {...}
    │
    ▼ (automático)
[Supabase Realtime]
  postgres_changes broadcast → todos os canais inscritos em 'squad_runs'
    │
    ▼
[Lovable UI — canal ativo]
  supabase.channel('run-{runId}').on('postgres_changes', handler)
  → setSquadState(payload.new.state_snapshot)
    │
    ▼
[Phaser OfficeScene]
  renderAgents(agents) → avatares animados em tempo real
```

### Comportamentos especiais

**Ao completar:**
```
VPS → squad-state-update (state.status = 'completed')
  → UPDATE squad_runs: status='completed', completed_at=now(), output_markdown=...
  → dispara export-run (fire-and-forget)
      → VPS /export → retorna pdfBase64 + docxBase64
      → Edge Function faz upload no Drive
      → UPDATE squad_runs: drive_file_id + drive_file_url
  → Realtime propaga → UI exibe "Concluído" + botão Drive
```

**Múltiplos clientes conectados:**
```
Qualquer número de abas/usuários subscritos ao mesmo canal
'run-{runId}' recebe o update simultaneamente.
Ambas as abas mostram o mesmo estado em tempo real.
```

**Reconexão automática:**
```
Supabase Realtime gerencia reconexão de WebSocket automaticamente.
O frontend não precisa de lógica de fallback — o Realtime cuida.
```

### Eventos futuros (v2)

Quando houver notificações globais (ex: "todos os squads pausados por manutenção"):
```typescript
// Broadcast para todos os clientes conectados sem usar postgres_changes
supabase.channel('global-events').send({
  type: 'broadcast',
  event: 'maintenance',
  payload: { message: 'Sistema em manutenção. Runs pausados.' }
})
```

---

## 17. Roadmap — Subsistemas Futuros

### Prompts Lovable pendentes (MVP v1)

| Prompt | Conteúdo | Status |
|--------|---------|--------|
| Prompt 6 | Histórico de runs + Output Viewer | 🔜 |
| Prompt 7 | Edge Functions drive-setup + export-run | 🔜 |
| Prompt 8 | Polish visual + design IntelliX.AI final | 🔜 |

### Subsistema B — Configuração de Squads via UI

Interface para criar e editar squads sem precisar mexer no filesystem:
- Editor visual de `squad.yaml` e `squad-party.csv`
- Preview do pipeline antes de executar
- Marketplace de templates de squads

### Subsistema C — (a definir)

Ainda não especificado. Aguardando definição de negócio.

### Subsistema D — PMI Agile / Gerenciamento de Projetos

**Requisitos registrados:**
- Painel de gerenciamento de tarefas (visão consolidada por projeto/cliente)
- Backlog management por projeto (priorização, refinamento)
- Pipeline Kanban de evolução e status de tarefas e projetos
- Input automático via outputs estruturados dos squads (Épicos → Features → Stories → Tasks)

### v2 — Multi-usuário

- Convite de analistas por workspace (role `analyst`)
- Compartilhamento de output com cliente via link público (role `viewer`)
- Sem refatoração do schema RLS — já preparado

### v2 — Integrações adicionais

- WhatsApp (Evolution API) para notificações de conclusão de runs
- n8n para automações pós-diagnóstico
- Fila de runs com pgmq (múltiplos squads em paralelo com controle de concorrência)

### v3 — Redesign arquitetural (possibilidade futura)

Migração do subprocess Claude Code CLI para **agentes nativos via Edge Functions + Gemini**:
- Squads viram Edge Functions com loop ReAct chamando Gemini diretamente
- Elimina necessidade do VPS para execução (Edge Functions substituem)
- DB-as-bus completo com `tasks` table + database webhooks (padrão Duma/arquitetura de referência)
- Mantém tudo no Supabase — zero VPS

Esta migração só faz sentido quando os squads OpenSquad puderem ser totalmente replicados via API de LLM sem perda de capabilities (skills especializadas, filesystem memory, etc.).

---

## 18. Orquestrador de Engagement

O Orquestrador permite executar um engagement completo (múltiplos squads em sequência) sem intervenção manual entre cada squad. Ele vive sobre o padrão DB-as-bus existente.

### Schema — `engagement_plans`

Ver `supabase/migrations/0003_engagement_plans.sql`.

```sql
-- Estrutura simplificada
engagement_plans (
  workspace_id    uuid,
  squads_ordered  jsonb,   -- [{squad, phase_id, depends_on[]}, ...]
  auto_advance    boolean, -- true = avança sozinho; false = operador clica
  status          text,    -- pending | running | completed | failed | paused
  current_squad   text,
  completed_squads jsonb   -- ["rh", "financeiro"]
)
```

### Edge Function — `engagement-next-squad`

Ver `supabase/functions/engagement-next-squad/index.ts`.

Chamada internamente por `squad-state-update` (fire-and-forget) quando `state.status === 'completed'`:

```
squad-state-update detecta status='completed'
    │
    ├── dispara export-run (PDF/DOCX) — fire-and-forget
    └── dispara engagement-next-squad — fire-and-forget
            │
            ▼
    Busca engagement_plan ativo para o workspace
            │
            ├── Marca completedSquad em completed_squads[]
            ├── Identifica próximo squad (depends_on[] satisfeitos)
            │
            ├── auto_advance=false → atualiza current_squad
            │     Realtime propaga → UI exibe badge "Próximo: Financeiro"
            │     Operador clica "Iniciar" → invoca squad-run-start manualmente
            │
            └── auto_advance=true → cria squad_run + invoca squad-run-start
                  Próximo squad inicia automaticamente sem intervenção
```

### Fluxo Completo de Engagement (6 squads, auto_advance=true)

```
Operador cria engagement_plan:
  squads_ordered: [
    {squad:"rh",         depends_on:[]},
    {squad:"financeiro",  depends_on:["rh"]},
    {squad:"comercial",   depends_on:["rh"]},
    {squad:"operacoes",   depends_on:["financeiro","comercial"]},
    {squad:"ti",          depends_on:["operacoes"]},
    {squad:"marketing",   depends_on:["comercial"]}
  ]
  auto_advance: true

Operador clica "Iniciar Engagement" → dispara squad RH manualmente

RH completa →
  engagement-next-squad vê depends_on:[] satisfeitos em financeiro e comercial
  → dispara financeiro e comercial em paralelo

Financeiro completa →
  operacoes ainda aguarda comercial — nenhum squad iniciado

Comercial completa →
  depends_on:["financeiro","comercial"] satisfeitos → dispara operacoes
  depends_on:["comercial"] satisfeito → dispara marketing (em paralelo)

Operacoes completa →
  depends_on:["operacoes"] satisfeito → dispara ti

Ti completa →
  completed_squads = todos → status = 'completed'
  Realtime propaga → UI exibe "Engagement concluído — 6/6 squads"
```

### UI — Painel de Engagement (`/workspaces/:id/engagement`)

| Elemento | Comportamento |
|---------|--------------|
| Timeline de squads | Cards com status visual: cinza (pending), cyan pulsando (running), verde (completed), vermelho (failed) |
| Toggle "Auto-avançar" | Liga/desliga `auto_advance` via PATCH `engagement_plans` |
| Botão "Iniciar Próximo" | Visível apenas quando `auto_advance=false` e há squad elegível |
| Progresso | `{completedSquads.length}/{squadsOrdered.length} squads concluídos` |
| Realtime | Subscreve `engagement_plans` para atualizar cards sem refresh |

### Atualização necessária no `squad-state-update`

Adicionar chamada fire-and-forget ao final do fluxo de completar:

```typescript
// Após UPDATE squad_runs SET status='completed'...
if (state.status === 'completed') {
  // ... dispara export-run (já existe)

  // NOVO: notifica orquestrador
  EdgeRuntime.waitUntil(
    fetch(`${supabaseUrl}/functions/v1/engagement-next-squad`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('INTERNAL_SECRET')}`,
      },
      body: JSON.stringify({ completedRunId: runId, workspaceId, completedSquad: squadName }),
    })
  );
}
```

### Estado de Deploy (2026-05-05)

| Componente | Status |
|-----------|--------|
| `engagement_plans` migration | ✅ `supabase/migrations/0003_engagement_plans.sql` |
| Edge Function `engagement-next-squad` | ✅ `supabase/functions/engagement-next-squad/index.ts` |
| Chamada em `squad-state-update` | 🔜 Adicionar fire-and-forget (Prompt 7+) |
| UI `/workspaces/:id/engagement` | 🔜 Lovable Prompt 8+ |

---

*Documentação técnica viva · IntelliX.AI · OpenSquad Platform — Lovable Edition*
*Última atualização: 2026-05-05 | Versão 2.1 — gaps estruturais resolvidos*

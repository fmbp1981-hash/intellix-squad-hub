# OpenSquad Platform — Documentação Técnica Completa

> **Público-alvo:** Esta documentação destina-se a qualquer agente de IA, desenvolvedor ou analista que precise entender, retomar ou expandir este sistema sem necessidade de contexto prévio de conversas anteriores.

---

## Índice

1. [Visão Geral e Propósito](#1-visão-geral-e-propósito)
2. [O Que é o OpenSquad](#2-o-que-é-o-opensquad)
3. [Contexto de Negócio — IntelliX.AI](#3-contexto-de-negócio--intellixai)
4. [Decisões Arquiteturais (Brainstorming)](#4-decisões-arquiteturais-brainstorming)
5. [Arquitetura Técnica](#5-arquitetura-técnica)
6. [Stack Tecnológica](#6-stack-tecnológica)
7. [Estrutura de Arquivos](#7-estrutura-de-arquivos)
8. [Schema do Banco de Dados](#8-schema-do-banco-de-dados)
9. [Rotas da API](#9-rotas-da-api)
10. [Squads de Consultoria](#10-squads-de-consultoria)
11. [Fluxo End-to-End](#11-fluxo-end-to-end)
12. [Dashboard em Tempo Real (Phaser)](#12-dashboard-em-tempo-real-phaser)
13. [Integração Google Drive](#13-integração-google-drive)
14. [Configuração de Ambiente](#14-configuração-de-ambiente)
15. [Estado Atual de Implementação](#15-estado-atual-de-implementação)
16. [Roadmap — Subsistemas Futuros](#16-roadmap--subsistemas-futuros)

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
  squad.yaml           ← configuração do squad (agentes, steps, skills)
  squad-party.csv      ← personas dos agentes (displayName, icon, gender, path)
  state.json           ← estado live escrito pelo runner antes de cada step
  _memory/
    memories.md        ← aprendizados acumulados de runs anteriores
    runs.md            ← log histórico de execuções
  agents/
    researcher.agent.md
    analyst.agent.md
    ...
  pipeline/
    pipeline.yaml
    steps/
      01-research.md
      02-analysis.md
      ...
  output/
    2026-05-04-143022/   ← run ID (timestamp)
      v1/
        report.md        ← output do agente
      state.json         ← snapshot do estado ao final do run
```

#### state.json — O Coração do Monitoramento

O runner do OpenSquad escreve este arquivo antes de **cada step** da pipeline. A plataforma web observa este arquivo via `chokidar` e propaga mudanças por WebSocket ao dashboard Phaser.

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

O runner executa via `claude --print "/opensquad run {squad}"`:

1. Lê `squad.yaml` e `squad-party.csv`
2. Carrega contexto da empresa do cliente (`_opensquad/_memory/company.md`)
3. Para cada step: escreve `state.json` → executa agente → valida output → handoff → repete
4. Ao concluir: marca `status: completed` no `state.json`, copia para a pasta do run, atualiza `memories.md` e `runs.md`

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

## 4. Decisões Arquiteturais (Brainstorming)

As seguintes decisões foram tomadas durante sessão de brainstorming e são **definitivas para o MVP v1**. Não reabrir sem justificativa técnica forte.

### Decisão 1 — Dashboard Visual

**Opção escolhida: Phaser como componente React lazy-loaded**

- Next.js como shell da aplicação
- Phaser 3 integrado via `dynamic(() => import('./OfficeViewer'), { ssr: false })`
- WebSocket hook (`useSquadSocket.ts`) e Zustand store portados diretamente do repositório de referência OpenSquad
- A cena Phaser (`OfficeScene`) preservada intacta — mostra agentes em escritório 2D animado

**Alternativas rejeitadas:**
- React Canvas puro (perderia a riqueza visual dos sprites do OpenSquad)
- iframe separado (problemas de comunicação e state sync)

### Decisão 2 — Modelo de Execução

**Modelo 2: Claude Code como subprocess**

- API route `POST /api/squads/:workspaceId/:squadName/run` spawna:
  ```bash
  claude -p "/opensquad run {squadName}"
  ```
  no diretório do workspace no servidor
- `chokidar` observa `squads/{squad}/state.json` → push de updates via WebSocket `/__squads_ws`
- Outputs do run persistidos no Supabase (`squad_runs.state_snapshot`) em tempo real
- Ao concluir: export automático PDF + DOCX + upload Google Drive

**Por que não serverless:**
O subprocess Claude Code é de longa duração (pode demorar 5-30 min). Funções serverless têm timeout. Deploy recomendado: Railway, Render, VPS com Docker ou servidor dedicado.

**Alternativa rejeitada:**
- Modelo 1 (CLI manual): operação muito manual, sem UX integrada
- Modelo 3 (API Anthropic direta): perde toda a infraestrutura de skills/memory do OpenSquad

### Decisão 3 — Estrutura de Projetos

**Híbrido B + D:**

- **Workspace por Engagement:** cada engagement de consultoria tem pasta OpenSquad isolada no servidor
- Estrutura no filesystem do servidor:
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
- **Fases dentro do workspace:** Fase 1 Diagnóstico → Fase 2 Recomendações → Fase 3 Implementação
- **Templates reutilizáveis:** "Diagnóstico Padrão v2", "Análise Comercial Express" etc.

### Decisão 4 — Design dos Squads de Consultoria

**Princípios:**
- 1 Lead Analyst + 1 Independent Reviewer por departamento
- **Sem sub-agentes** para fases do mesmo domínio (perde coerência, multiplica tokens)
- Output dos squads estruturado como: **Épicos → Features → Stories → Tasks** (para alimentar futuramente o subsistema D de gerenciamento de projetos)

### Decisão 5 — Auth v1

- **Single admin** (apenas o fundador opera v1)
- Schema multi-role já preparado no Supabase com RLS: `admin | analyst | viewer`
- Ownership por workspace
- Multi-usuário habilitável via invite sem refatoração quando a equipe crescer

### Decisão 6 — Google Drive como Repositório Oficial

- Ao criar workspace → cria automaticamente `IntelliX/{Cliente}/{Engagement}/` no Drive
- Ao concluir run → gera PDF (Puppeteer) + DOCX (docx npm) → upload automático
- Autenticação via Service Account (melhor para automação server-side)

### Decisão 7 — Escopo MVP v1

**Dentro do MVP:**
- Auth single admin (Supabase)
- Criar/gerenciar Workspaces por cliente
- Templates de Engagement reutilizáveis
- Disparar runs via browser (subprocess)
- Dashboard Phaser ao vivo
- Histórico de runs por workspace
- Visualizar outputs (markdown renderizado)
- Google Drive: pasta automática + upload PDF/DOCX

**Fora do MVP (v2+):**
- Multi-usuário / convites de analistas
- Kanban + Backlog agile (subsistema D)
- Configuração de squads via UI
- Compartilhamento de output com cliente via link público
- Integração n8n / Evolution API / WhatsApp
- Fila de runs com Redis (v1 usa in-memory)

---

## 5. Arquitetura Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (Next.js)                        │
│                                                             │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │  Sidebar Nav │  │         Workspace Dashboard          │ │
│  │  (shadcn/ui) │  │  ┌─────────────┐  ┌─────────────┐  │ │
│  │              │  │  │  RunHistory │  │ OfficeViewer│  │ │
│  │  - Workspaces│  │  │  (lista de  │  │  (Phaser 3) │  │ │
│  │  - Settings  │  │  │   runs)     │  │  animações  │  │ │
│  └──────────────┘  │  └─────────────┘  └─────────────┘  │ │
│                    └─────────────────────────────────────┘ │
│                                                             │
│  Zustand Store ←── useSquadSocket ←── WebSocket            │
│  (activeStates)    (reconnect+poll)    /__squads_ws         │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP / WebSocket
                              │
┌─────────────────────────────────────────────────────────────┐
│                  SERVIDOR (Node.js persistente)              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Next.js App Router                     │   │
│  │                                                     │   │
│  │  POST /api/squads/:id/:name/run                     │   │
│  │    ├── createClient() Supabase                      │   │
│  │    ├── spawn('claude', ['-p', '/opensquad run rh']) │   │
│  │    │         ↓                                      │   │
│  │    │   /srv/opensquad-workspaces/{slug}/            │   │
│  │    │         ↓                                      │   │
│  │    └── watchSquadState() via chokidar               │   │
│  │              ↓ state.json muda                      │   │
│  │         broadcastStateUpdate() via WS               │   │
│  │                                                     │   │
│  │  POST /api/export/:runId                            │   │
│  │    ├── generatePdf() via Puppeteer                  │   │
│  │    ├── generateDocx() via docx                      │   │
│  │    └── uploadToDrive() via googleapis               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┼──────────────┐
               │              │              │
       ┌───────▼──────┐ ┌─────▼─────┐ ┌────▼────────┐
       │   Supabase   │ │  Google   │ │  Filesystem  │
       │  PostgreSQL  │ │   Drive   │ │  /srv/...    │
       │  + Auth      │ │   API     │ │  workspaces  │
       │  + RLS       │ │  v3       │ │  state.json  │
       └──────────────┘ └───────────┘ └─────────────┘
```

### Fluxo de WebSocket com Fallback

O hook `useSquadSocket` implementa reconexão inteligente:

1. Tenta conectar WebSocket em `/__squads_ws?workspace={id}`
2. Se falhar 3x consecutivas → ativa **HTTP polling** (`/api/squads/:id/snapshot` a cada 3s)
3. Quando WebSocket volta → desativa polling, volta ao WS
4. Exponential backoff: 1s → 2s → 4s → ... → máximo 30s

---

## 6. Stack Tecnológica

| Camada | Tecnologia | Versão | Justificativa |
|--------|-----------|--------|---------------|
| Framework | Next.js | 15 (App Router) | SSR + API routes + middleware auth |
| Linguagem | TypeScript | 5.x strict | Tipagem completa, zero `any` |
| Estilo | Tailwind CSS | 4.x | Utility-first, dark theme |
| Componentes | shadcn/ui | latest | Radix UI acessível, customizável |
| Auth + DB | Supabase | latest | Auth + PostgreSQL + RLS integrados |
| ORM | @supabase/ssr | latest | Cookies SSR-safe no App Router |
| Dashboard 2D | Phaser | 4.x | Engine usada pelo OpenSquad original |
| Estado global | Zustand | 5.x | Leve, sem boilerplate Redux |
| Formulários | React Hook Form + Zod | latest | Validação type-safe |
| Observação FS | chokidar | 5.x | Watch de `state.json` no servidor |
| Subprocess | Node.js child_process | nativo | Spawn do Claude Code |
| PDF | Puppeteer | 24.x | Markdown → HTML → PDF preciso |
| DOCX | docx | 9.x | Geração de Word sem dependências |
| Google Drive | googleapis | 171.x | Drive API v3 via Service Account |
| Markdown | marked | 18.x | Renderização de outputs |
| Deploy | Vercel (frontend) | - | Edge network, CI/CD automático |
| Deploy servidor | Railway / Render / VPS | - | Node persistente para subprocess |

---

## 7. Estrutura de Arquivos

```
opensquad-platform/
│
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                    ← layout dark centralizado + force-dynamic
│   │   └── login/
│   │       └── page.tsx                  ← formulário email/senha Supabase Auth
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                    ← verifica auth + renderiza SidebarNav
│   │   ├── page.tsx                      ← redirect → /workspaces
│   │   ├── workspaces/
│   │   │   ├── page.tsx                  ← listagem de workspaces (SSR)
│   │   │   ├── new/
│   │   │   │   └── page.tsx              ← formulário criar workspace
│   │   │   └── [id]/
│   │   │       ├── page.tsx              ← overview do workspace + runs recentes
│   │   │       ├── run/
│   │   │       │   └── [squadName]/
│   │   │       │       └── page.tsx      ← execução ao vivo (Phaser + WS)
│   │   │       └── runs/
│   │   │           ├── page.tsx          ← histórico completo de runs
│   │   │           └── [runId]/
│   │   │               └── page.tsx      ← output viewer (markdown renderizado)
│   │   └── settings/
│   │       └── page.tsx                  ← (placeholder MVP)
│   │
│   └── api/
│       ├── squads/
│       │   └── [workspaceId]/
│       │       ├── [squadName]/
│       │       │   └── run/
│       │       │       └── route.ts      ← POST: spawna claude subprocess
│       │       └── snapshot/
│       │           └── route.ts          ← GET: estado atual (fallback polling)
│       ├── drive/
│       │   └── setup/
│       │       └── route.ts              ← POST: cria pasta Drive do workspace
│       └── export/
│           └── [runId]/
│               └── route.ts              ← POST: gera PDF/DOCX + upload Drive
│
├── components/
│   ├── office/
│   │   ├── OfficeViewer.tsx              ← wrapper React do Phaser Game
│   │   ├── OfficeViewerDynamic.tsx       ← dynamic import (ssr: false)
│   │   └── phaser/
│   │       ├── OfficeScene.ts            ← cena principal Phaser (portada do OpenSquad)
│   │       ├── AgentSprite.ts            ← sprite de cada agente com animações
│   │       ├── RoomBuilder.ts            ← constrói sala (paredes, móveis, decoração)
│   │       ├── assetKeys.ts              ← chaves e paths de todos os sprites PNG
│   │       └── palette.ts               ← cores e constantes de layout
│   │
│   ├── workspace/
│   │   ├── WorkspaceCard.tsx             ← card clicável na listagem
│   │   ├── WorkspaceForm.tsx             ← formulário criar workspace (Zod)
│   │   ├── RunHistory.tsx                ← lista de runs com badges de status
│   │   └── RunOutputViewer.tsx           ← (reserved)
│   │
│   └── ui/
│       ├── sidebar-nav.tsx               ← navegação lateral + sign out
│       └── [shadcn components]/          ← button, card, input, badge, etc.
│
├── hooks/
│   └── useSquadSocket.ts                 ← WebSocket + fallback polling + reconexão
│
├── store/
│   └── useSquadStore.ts                  ← Zustand: activeStates, connected, squads
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     ← createBrowserClient (uso client-side)
│   │   ├── server.ts                     ← createServerClient com cookies (SSR)
│   │   └── middleware.ts                 ← (helper, se necessário)
│   ├── execution/
│   │   ├── squad-runner.ts               ← spawn subprocess claude -p
│   │   └── state-watcher.ts              ← chokidar watch state.json
│   ├── drive/
│   │   ├── client.ts                     ← getDriveClient() via Service Account
│   │   ├── folder-manager.ts             ← createClientFolder() hierárquico
│   │   └── uploader.ts                   ← uploadToDrive() PDF/DOCX
│   └── export/
│       ├── pdf-generator.ts              ← markdown → Puppeteer → PDF Buffer
│       └── docx-generator.ts             ← markdown → docx → Buffer
│
├── types/
│   └── squad-state.ts                    ← Agent, AgentStatus, SquadState, WsMessage
│
├── middleware.ts                          ← proteção de rotas Next.js
│
├── public/
│   └── assets/
│       ├── avatars/                       ← sprites PNG dos personagens (44 arquivos)
│       ├── desks/                         ← sprites de mesas/monitores (8 arquivos)
│       └── furniture/                     ← móveis e decoração (36 arquivos)
│
└── supabase/
    └── migrations/
        └── 0001_initial.sql              ← schema completo (5 tabelas + RLS)
```

---

## 8. Schema do Banco de Dados

Projeto Supabase dedicado para a plataforma. Todas as tabelas com RLS ativo.

### Tabelas

#### `user_roles`
Controle de acesso multi-role. v1 apenas `admin`.

```sql
CREATE TABLE user_roles (
  user_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role     text NOT NULL DEFAULT 'admin'
             CHECK (role IN ('admin', 'analyst', 'viewer')),
  created_at timestamptz DEFAULT now()
);
```

#### `templates`
Templates de engagement reutilizáveis (ex: "Diagnóstico Padrão v2").

```sql
CREATE TABLE templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  phases      jsonb NOT NULL DEFAULT '[]',  -- array de fases com squads
  created_at  timestamptz DEFAULT now()
);
```

#### `workspaces`
Cada workspace representa um engagement de consultoria para um cliente.

```sql
CREATE TABLE workspaces (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text UNIQUE NOT NULL,          -- ex: "empresa-xyz-1746450000000"
  client_name      text NOT NULL,                 -- ex: "Empresa XYZ Ltda"
  engagement_name  text NOT NULL,                 -- ex: "Diagnóstico de RH Q2 2026"
  description      text,
  template_id      uuid REFERENCES templates(id),
  drive_folder_id  text,                          -- ID da pasta no Google Drive
  drive_folder_url text,                          -- URL pública da pasta
  owner_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
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
```

#### `squad_runs`
Registro de cada execução de squad. Persiste estado e links dos entregáveis.

```sql
CREATE TABLE squad_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  phase_id         uuid REFERENCES workspace_phases(id),
  squad_name       text NOT NULL,                -- ex: "rh", "financeiro"
  status           text DEFAULT 'pending'
                     CHECK (status IN ('pending','running','completed','failed')),
  state_snapshot   jsonb,                        -- último state.json recebido
  opensquad_run_id text,                         -- run_id gerado pelo OpenSquad
  output_markdown  text,                         -- conteúdo do relatório final
  drive_file_id    text,                         -- ID do PDF no Drive
  drive_file_url   text,                         -- URL do PDF no Drive
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id)
);
```

### Políticas RLS (v1 — admin vê tudo)

```sql
-- workspaces
CREATE POLICY "admin_all" ON workspaces FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- workspace_phases (mesma política)
-- squad_runs (mesma política)

-- user_roles — usuário vê apenas o próprio registro
CREATE POLICY "admin_self" ON user_roles FOR ALL
  USING (user_id = auth.uid());

-- templates — admin vê todos
CREATE POLICY "admin_all" ON templates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));
```

---

## 9. Rotas da API

### `POST /api/squads/[workspaceId]/[squadName]/run`

Inicia a execução de um squad. **Responde imediatamente** — o run acontece em background.

**Fluxo:**
1. Busca o workspace no Supabase → valida que existe
2. Cria registro em `squad_runs` com `status: 'running'`
3. Obtém o diretório do workspace no filesystem
4. Inicia `watchSquadState()` → observa `state.json` via chokidar
5. Dispara `runSquad()` em background (não bloqueia a resposta)
6. Retorna `{ runId, status: 'running' }`

**Efeitos colaterais automáticos:**
- Cada mudança no `state.json` → atualiza `squad_runs.state_snapshot` no Supabase
- Ao completar → atualiza `status: 'completed'` + dispara `POST /api/export/:runId`

---

### `GET /api/squads/[workspaceId]/snapshot`

Fallback polling. Retorna o estado atual de todos os runs ativos do workspace.

**Resposta:**
```json
{
  "type": "SNAPSHOT",
  "squads": ["rh"],
  "activeStates": {
    "rh": { ...SquadState }
  }
}
```

---

### `POST /api/drive/setup`

Cria a hierarquia de pastas no Google Drive para um workspace.

**Corpo:** `{ workspaceId: string }`

**Fluxo:**
1. Busca `client_name` e `engagement_name` do workspace
2. Verifica se pasta do cliente já existe em `IntelliX/` no Drive
3. Cria (ou reutiliza) pasta do cliente
4. Cria pasta do engagement dentro da pasta do cliente
5. Salva `drive_folder_id` e `drive_folder_url` no workspace

**Estrutura criada no Drive:**
```
IntelliX/
  {client_name}/
    {engagement_name}/     ← drive_folder_url aponta aqui
```

---

### `POST /api/export/[runId]`

Gera PDF + DOCX do output do run e faz upload para o Google Drive.

**Corpo:** `{ workspaceId, workspaceSlug, squadName }`

**Fluxo:**
1. Verifica se workspace tem `drive_folder_id`
2. Localiza o arquivo `.md` mais recente em `output/{run_id}/`
3. Gera PDF via Puppeteer (template com branding IntelliX.AI)
4. Gera DOCX via `docx` npm
5. Upload paralelo PDF + DOCX para a pasta do cliente no Drive
6. Atualiza `squad_runs` com `output_markdown`, `drive_file_id`, `drive_file_url`

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

### Squads Planejados

| Squad | Departamento | Foco Principal |
|-------|-------------|----------------|
| `rh` | Recursos Humanos | Processos de recrutamento, avaliação, desenvolvimento |
| `financeiro` | Financeiro | Controles financeiros, relatórios, automação contábil |
| `comercial` | Comercial/Vendas | Pipeline de vendas, CRM, métricas de conversão |
| `operacoes` | Operações | Fluxos operacionais, gargalos, padronização |
| `ti` | Tecnologia | Infraestrutura, processos de desenvolvimento, segurança |
| `marketing` | Marketing | Estratégia de conteúdo, canais, métricas |

---

## 11. Fluxo End-to-End

### Criar um Novo Engagement

```
1. Usuário clica "+ Novo Workspace"
2. Preenche: Cliente, Engagement, Descrição
3. WorkspaceForm.onSubmit():
   a. Cria workspace no Supabase → retorna workspace.id
   b. Dispara POST /api/drive/setup em background (não bloqueia)
   c. Redireciona → /workspaces/{id}
4. /api/drive/setup cria:
   - IntelliX/{Cliente}/{Engagement}/ no Google Drive
   - Salva drive_folder_id + drive_folder_url no workspace
```

### Rodar um Squad

```
1. Usuário acessa /workspaces/{id}/run/rh
2. useSquadSocket(workspaceId) conecta ao WebSocket
3. Usuário clica "Rodar Squad" (ou navega para esta URL)
4. POST /api/squads/{workspaceId}/rh/run
   a. Cria squad_runs entry: status=running
   b. chokidar começa a observar state.json
   c. spawn('claude', ['-p', '/opensquad run rh']) no diretório do workspace
5. Claude Code executa o squad:
   a. Escreve state.json antes de cada step
   b. chokidar detecta mudança → atualiza squad_runs.state_snapshot
   c. WebSocket propaga → Zustand store → OfficeScene re-renderiza
6. Usuário vê em tempo real: agentes trabalhando no escritório 2D
7. Ao completar:
   a. state.json: status=completed
   b. squad_runs: status=completed
   c. POST /api/export/{runId} disparado automaticamente
      - Gera PDF e DOCX
      - Upload para pasta do cliente no Drive
      - Atualiza squad_runs com links
8. Usuário vê link "Abrir no Drive" na interface
```

### Visualizar Output

```
1. Usuário acessa /workspaces/{id}/runs/{runId}
2. Server Component busca squad_runs por runId
3. marked() converte output_markdown → HTML
4. Renderiza com prose-invert (Tailwind Typography)
5. Link "Abrir no Drive" → PDF no Google Drive
```

---

## 12. Dashboard em Tempo Real (Phaser)

### Componentes

#### `OfficeScene.ts`
Cena principal Phaser. Responsável por:
- Preload de todos os sprites (avatares, mesas, móveis)
- Escuta evento `stateUpdate` → recebe `SquadState`
- `renderScene(agents)` → posiciona agentes em grid (máx 3 colunas)
- Auto-assign de posições de desk por ordem (index % 3 + 1, floor(index/3) + 1)
- Zoom automático para caber todos os agentes na viewport
- Lounge area no fundo da cena (sofás, plantas, mesa de café)

#### `AgentSprite.ts`
Sprite de um agente individual. Renderiza:
- Avatar (PNG 48x51px, escala 0.8x) — animação talk/blink a 500ms
- Mesa de trabalho com monitor (desk_wood + desktop_set)
- Badge com nome + status colorido (idle/working/done/checkpoint/delivering)
- Caneca de café na mesa

#### `RoomBuilder.ts`
Constrói a sala:
- Piso em checkerboard (warm wood)
- Paredes com decoração (janelas, prateleiras, quadro branco)
- Zona lounge: sofá, poltronas, mesa de café, plantas
- Bordas escuras que escondem overflow

#### Sprites disponíveis
- **44 avatares:** Male1-4 (4 poses cada), Female1-6 (3-4 poses cada)
- **8 sprites de mesa/monitor:** preto/branco × idle/coding/coding-alt/up
- **36 sprites de móveis:** plants, bookshelf, whiteboard, couch, etc.

### Comunicação React ↔ Phaser

```
state.json muda
    ↓
chokidar detecta
    ↓
WebSocket broadcast { type: 'SQUAD_UPDATE', squad, state }
    ↓
useSquadSocket.dispatch()
    ↓
Zustand: updateSquadState(squad, state)
    ↓
OfficeViewer.useEffect([state])
    ↓
scene.events.emit('stateUpdate', state)
    ↓
OfficeScene.onStateUpdate(state)
    ↓
renderScene(agents) → AgentSprite.updateStatus()
```

---

## 13. Integração Google Drive

### Autenticação
- **Service Account** Google Cloud com permissão `https://www.googleapis.com/auth/drive`
- Credenciais em JSON salvas na env var `GOOGLE_SERVICE_ACCOUNT_KEY`
- A pasta raiz `IntelliX/` deve ser criada manualmente no Drive e seu ID configurado em `GOOGLE_DRIVE_PARENT_FOLDER_ID`

### Hierarquia de Pastas

```
Drive (conta Google IntelliX.AI)
└── IntelliX/                         ← GOOGLE_DRIVE_PARENT_FOLDER_ID
    ├── Empresa XYZ Ltda/              ← criado ao criar 1º engagement do cliente
    │   ├── Diagnóstico de RH Q2 2026/ ← drive_folder_url do workspace
    │   │   ├── rh-2026-05-04.pdf
    │   │   └── rh-2026-05-04.docx
    │   └── Análise Comercial 2026/
    └── Outra Empresa SA/
```

### Geração dos Documentos

**PDF (Puppeteer):**
- Markdown → HTML com template IntelliX.AI (logo, data, tipografia Segoe UI)
- Puppeteer renderiza o HTML → PDF A4 com margens 20mm
- Resolve todos os estilos (code blocks, headings, etc.)

**DOCX (docx npm):**
- Parser simples de Markdown por linhas
- Detecta `#`, `##`, `###` → HeadingLevel correspondente
- Texto normal → Paragraph com TextRun
- Título e data IntelliX.AI no início

---

## 14. Configuração de Ambiente

### `.env.local` (desenvolvimento)

```env
# ───────────────────────────────────────
# SUPABASE
# ───────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ───────────────────────────────────────
# GOOGLE DRIVE
# ───────────────────────────────────────
# JSON completo da Service Account Google Cloud
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...","client_email":"...@...iam.gserviceaccount.com"}'
# ID da pasta raiz "IntelliX" no Google Drive
GOOGLE_DRIVE_PARENT_FOLDER_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs

# ───────────────────────────────────────
# OPENSQUAD EXECUTION
# ───────────────────────────────────────
# Diretório raiz dos workspaces no servidor
OPENSQUAD_WORKSPACES_DIR=/srv/opensquad-workspaces
# Binário do Claude Code (deve estar no PATH)
CLAUDE_CODE_BIN=claude
# URL pública da aplicação (para self-calls de export)
NEXT_PUBLIC_APP_URL=https://opensquad.intellixai.com.br

# ───────────────────────────────────────
# ANTHROPIC
# ───────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
```

### Variáveis de Ambiente no Vercel

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SERVICE_ACCOUNT_KEY
GOOGLE_DRIVE_PARENT_FOLDER_ID
OPENSQUAD_WORKSPACES_DIR
CLAUDE_CODE_BIN
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
```

### Setup Inicial

```bash
# 1. Clonar o projeto
cd C:\Projects\opensquad-platform

# 2. Instalar dependências
npm install

# 3. Configurar .env.local com valores reais

# 4. Linkar com o projeto Supabase
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF

# 5. Aplicar migration (cria as 5 tabelas + RLS)
npx supabase db push

# 6. Criar usuário admin no Supabase
# Painel Supabase → Authentication → Users → Add user
# Email: fmbp1981@gmail.com, Senha: (definir)

# 7. Inserir role admin no SQL Editor do Supabase
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE email = 'fmbp1981@gmail.com';

# 8. Inicializar pasta de workspaces no servidor
mkdir -p /srv/opensquad-workspaces

# 9. Inicializar um workspace OpenSquad para o primeiro cliente
cd /srv/opensquad-workspaces
mkdir empresa-xyz && cd empresa-xyz
npx opensquad init
# Configurar company.md com dados do cliente

# 10. Rodar em desenvolvimento
cd C:\Projects\opensquad-platform
npm run dev
```

### Requisitos do Servidor (Produção)

O Squad Execution Service **NÃO funciona em Vercel/serverless** — o subprocess Claude Code é de longa duração. Deploy recomendado:

- **Railway** ou **Render** (planos com containers Docker persistentes)
- **VPS** (DigitalOcean, Hetzner) com Docker
- Imagem base deve ter: `node 20+`, `claude` CLI instalado, `ANTHROPIC_API_KEY` disponível

```dockerfile
FROM node:20-slim
# Instalar Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code
# ... resto do Dockerfile
```

---

## 15. Estado Atual de Implementação

### Commits realizados (branch `master`)

| Commit | Descrição | Task |
|--------|-----------|------|
| `6a40e0e` | feat: scaffold Next.js 15 opensquad-platform | Task 1 |
| `8f65033` | feat: supabase schema + client helpers | Task 2 |
| `1d1a600` | fix: supabase server client — log setAll cookie errors | Task 2 fix |
| `6f43c3f` | feat: auth flow — login, middleware, protected routes | Task 3 |
| `67517b0` | feat: workspace CRUD — list, create | Task 4 |
| `c929982` | feat: google drive — auto-create client folder on workspace creation | Task 5 |
| `db824a7` | feat: squad execution service — subprocess runner + state watcher + run API | Task 6 |
| `d7c9471` | feat: real-time office dashboard — Phaser + WebSocket hook + Zustand | Task 7 |
| `b794c28` | feat: run history + output viewer com link para Drive | Task 8 |
| `3368206` | feat: PDF/DOCX export + auto-upload Google Drive ao concluir run | Task 9 |
| `0cea10a` | feat: workspace overview page — runs recentes + link para Drive | Task 10 |
| `a9a3487` | fix: prevent Supabase client init during SSR — force-dynamic + lazy createClient | Build fix |

### Status de Verificação

- ✅ `npx tsc --noEmit` — zero erros TypeScript
- ✅ `npm run build` — build completo sem erros
- ✅ Todas as 12 rotas compiladas como `ƒ` (dynamic, server-rendered on demand)
- ⏳ Pendente: configurar `.env.local` com credenciais reais e testar fluxo completo

---

## 16. Roadmap — Subsistemas Futuros

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
- Os outputs dos squads (formato Épicos → Features → Stories → Tasks) alimentam este backlog automaticamente

### v2 — Multi-usuário

- Sistema de convites por email (usando Supabase Auth)
- Analistas podem ser adicionados a workspaces específicos
- Clientes podem receber acesso viewer com link compartilhado
- Zero refatoração necessária — schema RLS já preparado

### v2 — Fila de Runs com Redis

Substituir o controle in-memory de runs por uma fila Redis:
- Limite de runs simultâneos por workspace
- Prioridade de execução
- Retry automático em caso de falha

### v2 — WebSocket Server Dedicado

O WebSocket `/__squads_ws` atualmente depende de configuração especial de servidor. Migrar para:
- Servidor WebSocket dedicado (ws + Node.js)
- Ou Supabase Realtime (substituição mais simples)

---

*Documento gerado em 2026-05-04. Última atualização: MVP v1 completo, build verificado.*

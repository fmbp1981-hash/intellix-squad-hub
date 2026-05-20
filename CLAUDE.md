# CLAUDE.md · IntelliX Squad Hub

> Este arquivo é lido automaticamente pelo Claude Code ao abrir o repositório.
> Define como Claude deve operar neste projeto.

---

## Sobre o projeto

`intellix-squad-hub` é o **sistema de gestão interno single-tenant da IntelliX.AI**, uma agência brasileira de soluções de IA focada no mercado latino-americano com foco em ROI, automação e eficiência operacional.

**Não é um produto vendido a terceiros.** É uma ferramenta interna que opera a IntelliX por dentro.

Internamente, o sistema usa o codinome "IntelliX OpenSquad Platform" em algumas migrations — isso é legado de uma fase em que se considerou multi-tenant; **a decisão atual é single-tenant**.

---

## O que este sistema faz

Orquestra a operação completa da IntelliX em 4 dimensões integradas:

1. **Squad Hub** — 10 agentes de IA com personas individuais (Ana, Bia, Bruno, Carlos, Roberto, Ágata, Márcio, Flora, Maya, Heitor), organizados em squads (`internal-sdr`, `internal-marketing`, `internal-operacoes`, etc.) e executados via sistema de fila (`run_queue` + `run_steps`).

2. **Projetos Ágeis** — gestão completa de projetos da IntelliX e clientes (sprints, backlog, métricas, OKRs, impediments) com agentes de IA assistindo (`ai-sprint-coach`).

3. **CRM** — gestão comercial completa (leads, deals em kanban, contracts, invoices, automations) com agentes de IA assistindo (`ai-deal-coach`).

4. **Escritório virtual em Phaser** — visualização pixel-art onde cada agente é um sprite navegando em um "escritório" 2D.

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Vite 5 + React 18 + TypeScript + Shadcn/UI + Tailwind CSS |
| Plataforma de desenvolvimento | Lovable (com `lovable-tagger` em devDeps) |
| Backend | Supabase (Postgres + Auth + RLS + Edge Functions Deno) |
| LLM | Lovable AI Gateway (`LOVABLE_API_KEY`) — modelos: Google Gemini 2.5 (Pro/Flash/Flash-Lite) + OpenAI GPT-5 (full/mini/nano) |
| Visualização | Phaser 4.1 (escritório virtual) |
| Estado | TanStack React Query |
| Validação | zod (com schemas em edge functions) |
| Forms | react-hook-form + @hookform/resolvers |
| Roteamento | react-router-dom v6 |
| DnD (kanbans) | @hello-pangea/dnd |
| Gráficos | Recharts |

**⚠️ NÃO há integração com Anthropic Claude.** Se em alguma feature for necessário, decidir separadamente (impacto arquitetural).

---

## Estrutura de pastas

```
intellix-squad-hub/
├── docs/                              ← Documentação do projeto
│   ├── base-conhecimento/             ← 11 documentos da Base (Doc 01 a 11)
│   │   ├── 01_INTELLIX_IDENTIDADE.md
│   │   ├── ...
│   │   ├── 09_INTELLIX_PRECIFICACAO_INTERNA.md   ⚠️ RESTRITO
│   │   └── 11_INTELLIX_RENOVACAO.md
│   ├── ESTADO_ATUAL.md                ← Mapa fiel do código real
│   ├── PIVOTS.md                      ← Histórico de pivots
│   ├── SPEC_v3.md                     ← Especificação mestra atual
│   └── CHANGELOG.md
│
├── src/
│   ├── pages/                         ← 17 categorias de páginas
│   ├── components/                    ← 13 categorias de componentes
│   ├── game/office/                   ← Phaser scene + floorplan
│   ├── hooks/                         ← 17 hooks customizados
│   ├── integrations/supabase/         ← Cliente Supabase
│   ├── lib/                           ← llm-catalog, supabase, utils
│   └── types/
│
├── supabase/
│   ├── migrations/                    ← 32 migrations SQL
│   └── functions/                     ← 24 edge functions Deno
│
└── .lovable/                          ← Config Lovable (não tocar)
```

---

## Princípios não-negociáveis

Toda decisão, todo PR, todo commit deve respeitar estes princípios:

### 1. Honestidade técnica
- Agentes nunca prometem o que não podem entregar
- Se a Base de Conhecimento não tem uma resposta, dizer "vou confirmar e te respondo em [prazo]"
- Em casos de dúvida arquitetural: parar e perguntar ao Felipe, não chutar

### 2. Tom Satya Nadella
Alinhado ao **Doc 01 (Identidade)** e **Doc 02 (Glossário)** da Base de Conhecimento:
- Português brasileiro
- Calmo, estratégico, anti-hype
- Sem jargão técnico em comunicação externa
- Sem anglicismos proibidos do Doc 02 (use "Painel" não "Dashboard", "Escritório" não "Office" em UI; em código pode usar inglês)

### 3. Humano no loop
- Agentes geram drafts; **Felipe valida antes de enviar a cliente**
- Decisões financeiras (preço, desconto) sempre passam por Felipe
- Doc 09 (Precificação Interna) **NUNCA** é exposto a agente — apenas Felipe consulta

### 4. Propriedade da IntelliX
- Sistema é da IntelliX, single-tenant
- Não introduzir conceito de `tenant_id` em tabelas
- Schema desenhado para uma única organização

### 5. Risk Reversal real
- Promessas dos agentes só podem repetir o que está em contrato/Base de Conhecimento
- Não inventar garantias

---

## Como navegar o sistema

### Sidebar oficial (`src/components/layout/AppSidebar.tsx`)

```
Visão Geral
  └─ /painel                       (PainelPage)

IntelliX
  ├─ /escritorio                   (EscritorioPage — tabs: Office + Ágata)
  ├─ /pipeline                     (PipelinePage)
  └─ /jobs                         (JobsPage)

Squad Hub
  └─ /squads                       (SquadsListPage)

Projetos Ágeis
  └─ /projetos                     (ProjectsList → ProjetoDetailPage)

Sistema
  └─ /config                       (ConfigPage — tabs: Agentes + Canais + Perfil)
```

### Rotas legadas (NÃO REMOVER, mantidas para retrocompatibilidade)
- `/dashboard` → Dashboard (substituída por `/painel`)
- `/office`, `/office/gestao` → Office (encapsulada em `/escritorio`)
- `/workspaces` → Workspaces (substituída por `/squads`)
- `/projects/*` → Projects (substituída por `/projetos/*`)
- `/settings/*` → Settings (substituída por `/config`)
- `/crm/*` → CRM (não está no sidebar mas funcional)
- `/exports` → ExportsPage

Veja `docs/PIVOTS.md` para entender por que essas rotas existem em paralelo.

---

## Schema Supabase (visão geral)

39 tabelas em 6 grupos:

| Grupo | Tabelas principais |
|---|---|
| **Identidade do Squad** | squad_configs, agent_configs, sprite_assets, llm_configs, whatsapp_configs, drive_setup |
| **Execução de squad** | squad_runs, run_queue, run_steps, internal_jobs |
| **Projetos Ágeis** | agile_projects, briefings, directives, epics, user_stories, tasks, impediments, sprints, sprint_metrics, sprint_ai_alerts, velocity_history, release_plans, okrs |
| **CRM** | leads, deals, deal_ai_insights, contracts, invoices, engagements, crm_activities, crm_automations, crm_automation_runs |
| **Comunicação** | notifications, email_log |
| **Auditoria** | audit_log, token_usage, export_run, outbound_webhooks |

**Importante:** `portfolio_projects` foi DROPADA em 09/05/2026 e substituída por flag `is_portfolio` em `agile_projects`. Não recriar.

**RLS está ativa em todas as tabelas.** Não desabilitar nunca.

Detalhes completos em `docs/ESTADO_ATUAL.md`.

---

## Edge functions implementadas (24)

| Tipo | Funções |
|---|---|
| Execução de squad | `run-start`, `run-step`, `run-abort` |
| IA contextual | `ai-assistant`, `ai-deal-coach`, `ai-sprint-coach` |
| CRM | `crm-event-handler`, `crm-automation-runner`, `lead-score-calculator`, `engagement-next-squad` |
| Gestão (Ágata) | `gestao-trigger`, `gestao-directive-dispatch` |
| Jobs | `internal-job-trigger`, `internal-job-dispatch` |
| Comunicação | `send-email`, `send-whatsapp`, `notification-dispatcher` |
| Outras | `drive-setup`, `outbound-webhook-dispatcher`, `operations-detail-project`, `checkpoint-resolve`, `export-run`, `agile-story-move` |

Padrão das edge functions:
- Deno runtime
- Validação com zod
- `cors.ts` em `_shared/`
- `auth.ts` em `_shared/` com `requireAdmin` ou similar
- Service role key para operações elevadas
- Schemas Zod para validação de payloads

---

## Os 10 agentes (estado atual)

| Agente | Squad | Persona | Status |
|---|---|---|---|
| Ana | (a confirmar) | Genérica | ⚠️ Detalhar (Fase B do SPEC v3) |
| **Bia** | internal-sdr | ✅ Completa (SDR com BANT, ICP, abordagem) | OK |
| Bruno | (a confirmar) | Genérica | ⚠️ Detalhar |
| **Carlos** | (comercial) | ✅ Completa (Closer Comercial) | OK |
| Roberto | (a confirmar) | Genérica | ⚠️ Detalhar |
| Ágata | (orquestração) | Genérica | ⚠️ Detalhar (papel é claro) |
| Márcio | internal-operacoes | Genérica | ⚠️ Detalhar |
| Flora | (a confirmar) | Genérica | ⚠️ Detalhar |
| Maya | internal-marketing | Genérica | ⚠️ Detalhar |
| Heitor | (a confirmar) | Genérica | ⚠️ Detalhar |

**Notas importantes:**
- Bia foi originalmente "Beatriz" (squad Delivery, role Strategist) — migrada para SDR em 08/05/2026
- Carlos era "specialist genérico" — migrado para Closer Comercial em 08/05/2026
- Esses dois UPDATEs **preservaram o agent_id** — não recriar agentes do zero
- Detalhes em `docs/PIVOTS.md` (P7, P8)

**5 sprites estão corrompidos no banco** (agata, marcio, flora, maya, heitor) — ver Fase C do SPEC v3.

---

## A Base de Conhecimento (Docs 01-11)

11 documentos markdown em `docs/base-conhecimento/`:

| Doc | Nome | Audiência |
|---|---|---|
| 01 | Identidade | Todos os agentes |
| 02 | Glossário | Todos |
| 03 | Frentes Comerciais | Bia, Carlos |
| 04 | Pilares Técnicos | Carlos (diagnóstico técnico) |
| 05 | Portfólio | Bia, Carlos |
| 06 | Taxonomia ROI | Carlos |
| 07 | Objeções Comerciais | Bia, Carlos |
| 08 | Playbook Comercial | Bia, Carlos |
| **09** | **Precificação Interna** | **⚠️ APENAS FELIPE — nunca agente** |
| 10 | Processo de Entrega | Ágata, Felipe |
| 11 | Renovação e Retenção | Ágata, Felipe |

**Status crítico:** essa Base de Conhecimento **ainda não está integrada ao sistema** como RAG. As personas atuais de Bia e Carlos têm trechos da Base hardcoded em `agent_configs.persona`. Isso significa que atualizar um documento NÃO atualiza os agentes automaticamente.

→ **Esta é a Fase A do SPEC v3** (prioridade número 1).

---

## Convenções de código

### TypeScript / React
- Strict mode habilitado
- Functional components com hooks (sem classes)
- Custom hooks em `src/hooks/`
- Componentes de página em `src/pages/`
- Componentes reutilizáveis em `src/components/`
- Layout em `src/components/layout/`
- Shadcn/UI components em `src/components/ui/` — **não editar diretamente**; criar wrappers se precisar customizar
- Lazy loading de páginas pesadas via `React.lazy()`
- Skeleton states para loading
- ErrorBoundary envolvendo Suspense

### Tailwind
- Classes do design system primeiro (`bg-primary`, `text-foreground`, etc.)
- HSL variables CSS para temas (light/dark)
- `cn()` de `@/lib/utils` para conditional classes
- Gradients e cores customizadas em `tailwind.config.ts`

### Supabase
- Cliente em `src/integrations/supabase/client.ts`
- Types gerados em `src/types/`
- RLS sempre ativa
- Edge functions com `cors.ts` + auth shared
- Migrations sempre em `supabase/migrations/` com timestamp

### Naming
- Tabelas: snake_case (`agile_projects`, `squad_configs`)
- Colunas: snake_case (`created_at`, `is_portfolio`)
- Componentes: PascalCase (`PainelPage`, `OfficeScene`)
- Hooks: camelCase com prefixo `use` (`useSquadRun`)
- Rotas UI: kebab-case em português (`/escritorio`, `/projetos`)

---

## Regras para o Claude Code neste projeto

### ✅ Sempre

1. **Ler `docs/SPEC_v3.md` antes de propor mudança arquitetural**
2. **Consultar `docs/PIVOTS.md` antes de mexer em algo que possa ter sido pivotado** — para não repetir tentativas abandonadas
3. **Verificar `docs/ESTADO_ATUAL.md` antes de assumir que algo precisa ser criado** — pode já existir
4. **Validar com Felipe antes de criar nova rota ou nova tabela** — sistema já é grande
5. **Manter RLS em todas as novas tabelas**
6. **Adicionar tipos TypeScript completos** — sem `any` casual
7. **Escrever testes para edge functions novas** (Vitest configurado)

### ❌ Nunca

1. **Nunca expor Doc 09 (Precificação Interna) a agente**
2. **Nunca remover rotas legadas** sem migração explícita (`/dashboard`, `/office`, `/workspaces`, `/projects`, `/settings/*`)
3. **Nunca recriar `portfolio_projects`** — foi consolidado em `agile_projects.is_portfolio`
4. **Nunca introduzir Anthropic Claude** sem decisão arquitetural com Felipe
5. **Nunca introduzir conceito de multi-tenant** — sistema é single-tenant
6. **Nunca dar `DELETE` em `agent_configs`** — preserva sprite e histórico; use UPDATE
7. **Nunca commitar `LOVABLE_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`** — sempre via env

---

## Quando o Claude Code deve parar e perguntar

Pare e pergunte ao Felipe antes de:
- Criar nova tabela no Supabase
- Criar nova rota no router
- Criar novo agente no sistema
- Modificar persona de agente existente
- Alterar a arquitetura de execução de squad
- Mudar a forma como a Base de Conhecimento é consumida
- Introduzir nova dependência no `package.json`

---

## Fluxo de trabalho recomendado (Epic Workflow)

```
1. Felipe define o objetivo (em conversa ou via SPEC)
2. /spec → Claude lê SPEC_v3.md e o contexto necessário
3. /break → quebra o objetivo em behaviors atomicos isolados
4. /plan → planeja arquitetura técnica de cada behavior
5. /execute → implementa
6. Testes (vitest) + validação com Felipe
7. Commit + PR
```

---

## Recursos externos importantes

- **Supabase projeto:** `hynadwlwrscvjubryqlg`
- **Lovable AI Gateway:** via `LOVABLE_API_KEY` env
- **VPS Hetzner (Evolution API + n8n):** IP `178.156.204.170` (Felipe sabe credenciais)
- **Repositório:** https://github.com/fmbp1981-hash/intellix-squad-hub

---

## Próximo passo previsível ao abrir este repo

Se este é o primeiro `claude` no repo, o primeiro objetivo é:

> **Fase A do SPEC_v3.md** — implementar Base de Conhecimento como RAG no sistema.

Comando sugerido:
```
> Leia ESTADO_ATUAL.md, PIVOTS.md e SPEC_v3.md. 
> Execute /break na Fase A (Base de Conhecimento como RAG) 
> para gerar arquivos atomicos em behaviors/.
```

---

*CLAUDE.md · IntelliX Squad Hub · Maio 2026*
*Atualizar este arquivo sempre que houver mudança estrutural no projeto*

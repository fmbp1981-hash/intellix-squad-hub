# PIVOTS · intellix-squad-hub

> Registro dos pivots identificados na análise do repositório
> Para que o Claude Code não repita as mesmas tentativas

---

## Como ler este documento

Cada pivot tem 4 informações:
- **De → Para:** o que mudou
- **Quando:** data identificada nas migrations ou no código
- **Por quê:** motivação (declarada ou inferida)
- **Decisão para o Claude Code:** o que respeitar daqui pra frente

---

## P1 · Workspaces → Squads (nomenclatura conceitual)

**Quando:** identificado no sidebar atual

**Mudança:**
- Rotas legadas: `/workspaces`, `/workspaces/new`, `/workspaces/:id`, `/workspaces/:id/run/:squad`
- Rotas oficiais: `/squads`, `/squads/new`, `/squads/:id`, `/squads/:id/run/:squad`
- Componentes: `WorkspacesList`, `NewWorkspace`, `WorkspaceOverview`, `RunDashboard` foram **reutilizados** nas rotas `/squads`

**Por que:**
- "Squad" é a nomenclatura final da marca (consistente com a Base de Conhecimento e com o nome do produto: "IntelliX OpenSquad Platform")
- "Workspace" foi a primeira tentativa, mas confundia (parecia conceito do Notion/Slack)

**Decisão para o Claude Code:**
- Tratar `/squads` como rota oficial em novo código
- Manter `/workspaces` como retrocompatibilidade (não remover sem migração de bookmarks)
- Tabelas Supabase: o schema usa `squad_configs`, `squad_runs` — nunca `workspace_configs`. Consistente.

---

## P2 · Settings espalhado → Config unificado

**Quando:** identificado no sidebar atual

**Mudança:**
- Antes: `/settings` com SettingsPage de índice + 10 sub-rotas separadas (`/settings/notifications`, `/settings/whatsapp`, `/settings/models`, `/settings/email-templates`, `/settings/agents`, `/settings/squads`, `/settings/budgets`, `/settings/profile`, `/settings/drive`, `/settings/integrations`)
- Agora: **`/config`** com `ConfigPage` em formato Tabs reunindo apenas o essencial (Agentes, Canais — WhatsApp+Models, Perfil)

**Por que (inferido):**
- 10 sub-rotas eram cognitivamente demais
- Usuário Felipe (operação solo) precisa de poucas configs ativas
- Restantes (drive, integrations, email-templates, budgets, etc.) continuam acessíveis em `/settings/*` para casos específicos

**Decisão para o Claude Code:**
- Ao criar UI de configuração nova, adicionar como tab dentro de `/config`, não criar nova rota `/settings/*`
- Settings legadas continuam vivas para acesso direto, não removê-las
- `ConfigPage` é o ponto de entrada do usuário cotidiano

---

## P3 · Office isolado → Escritorio com tabs (Office + Ágata Gestão)

**Quando:** identificado no sidebar atual

**Mudança:**
- Antes: `/office` (visualização Phaser) e `/office/gestao` (Ágata) como rotas separadas
- Agora: **`/escritorio`** com Tabs unindo "Escritório" (Phaser) + "Ágata"

**Por que (inferido):**
- Ágata é a orquestradora — faz sentido que esteja no contexto visual do escritório
- Tab única reduz cliques

**Decisão para o Claude Code:**
- Tratar `/escritorio` como UX oficial; `/office` permanece como rota legada
- Qualquer feature nova ligada à Ágata orquestradora entra como sub-tab de `/escritorio`

---

## P4 · Dashboard → Painel

**Quando:** identificado em rotas atuais (`Navigate to="/painel" replace` na rota raiz)

**Mudança:**
- Antes: `/dashboard` (DashboardPage)
- Agora: **`/painel`** (PainelPage) — usa `useDashboard` hook + `useGestao` hook + cards customizados

**Por que (inferido):**
- "Painel" é mais consistente com tom português brasileiro da IntelliX (Doc 02 — Glossário)
- PainelPage é mais rico: tem MetricsBar + UnifiedFeed + alertas pendentes da Ágata
- Dashboard antigo ficou como rota legada

**Decisão para o Claude Code:**
- Página inicial é `/painel` — qualquer alteração de home aplica aqui
- Não inflar `/painel` com mais widgets sem necessidade; é uma página enxuta por design

---

## P5 · Projects → Projetos (nomenclatura + componente novo)

**Quando:** identificado em rotas atuais

**Mudança:**
- Antes: `/projects` apontando para `ProjectOverview`
- Agora: **`/projetos`** apontando para `ProjetoDetailPage` (componente DIFERENTE)
- A página de listagem (`ProjectsList`) e criação (`NewProject`) **continuam compartilhadas** entre `/projects` e `/projetos`

**Por que (inferido):**
- Apenas a página de detalhe (`Overview` vs `Detail`) foi reescrita — provavelmente para refletir nova UX ou nova estrutura de dados
- O resto reaproveitou os componentes existentes

**Decisão para o Claude Code:**
- Página oficial de detalhe é `ProjetoDetailPage` em `/projetos/:id`
- `ProjectOverview` em `/projects/:id` é legacy — não evoluir, mas não derrubar
- Para criar e listar projetos, usar os componentes compartilhados

---

## P6 · portfolio_projects → agile_projects.is_portfolio (consolidação no schema)

**Quando:** **9 de Maio de 2026** — pivot dentro do mesmo dia (raro, mas decidido rapidamente)

**Mudança:**
- Migration `20260509_portfolio_projects.sql` criou tabela `portfolio_projects` separada com TYPE enums (`portfolio_category`, `portfolio_status`)
- Algumas horas depois, migration `20260509_portfolio_flag.sql`:
  - Adicionou flag `is_portfolio boolean` em `agile_projects`
  - Dropou `portfolio_projects` e os enums
  - Seedou 15 projetos diretamente em `agile_projects`

**Por que (declarado na própria migration):**
> *"Portfolio flag on agile_projects + drop portfolio_projects table — replaced by agile_projects + is_portfolio"*

Inferido: ter duas tabelas para o mesmo conceito (projetos) era duplicação. Consolidar em uma com flag é design mais limpo.

**Decisão para o Claude Code:**
- Toda lógica de portfolio usa `agile_projects` com filtro `is_portfolio = true`
- Não recriar `portfolio_projects` — está dropada deliberadamente
- Os 15 projetos seedados já estão em `agile_projects`

---

## P7 · Beatriz (Delivery Strategist) → Bia (SDR Comercial)

**Quando:** Migration `20260508_fase1_reestruturacao_agentes.sql` (8 de Maio de 2026)

**Mudança:**
- Beatriz era do squad `internal-delivery`, role `strategist`
- Renomeada para **Bia** (nome mais curto, alinhado com o Doc 03 da Base de Conhecimento)
- Reatribuída ao squad `internal-sdr` (squad recém-criado nesta migration)
- Nova persona completa: SDR com BANT, ICP, abordagem, canais (texto longo de ~70 linhas)

**Importante:** a migration usa `UPDATE` (não `DELETE` + `INSERT`), explicitamente comentado:
> *"PASSO 3: Beatriz → Bia (UPDATE — NUNCA DELETE)"*

Isso preserva o `agent_id` e o sprite associado.

**Implicação remanescente (a verificar):**
- O sprite no banco ainda tem key `beatriz`?
- Se sim, a aplicação precisa mapear sprite_key="beatriz" → agente "Bia", OU o sprite_key precisa ser renomeado em outra migration

**Decisão para o Claude Code:**
- Bia é o nome oficial do agente SDR
- Não recriar Beatriz
- Verificar se sprite_key precisa ser atualizado (e fazer migration se sim)

---

## P8 · Carlos: specialist genérico → Closer Comercial

**Quando:** Migration `20260508_fase1_reestruturacao_agentes.sql` + `20260508_fase1b_update_personas.sql`

**Mudança:**
- Carlos era `specialist` no squad `default` (executor genérico que produzia "o entregável principal")
- Agora é **Closer Comercial** — recebe leads qualificados da Bia, conduz diagnóstico, envia proposta

**Por que (inferido):**
- A função de "specialist genérico" não escalava para o modelo de negócio real da IntelliX
- O par Bia (SDR) + Carlos (Closer) é o desenho comercial validado (Doc 08 — Playbook Comercial)

**Decisão para o Claude Code:**
- Carlos é exclusivamente Closer
- Se precisar de "specialist genérico" para outra função, criar agente novo — não reaproveitar Carlos

---

## P9 · Bug fix de departamentos (Márcio, Maya)

**Quando:** Migration `20260508_fase1_reestruturacao_agentes.sql`

**Mudança:**
- Márcio estava em `internal-marketing`, **corrigido** para `internal-operacoes`
- Maya estava em `internal-rh`, **corrigida** para `internal-marketing`

**Por que (declarado):**
> *"PASSO 1: Corrigir bugs de departamento"*

Inferido: os agentes foram seedados inicialmente com departamentos errados, e a Fase 1 limpou.

**Decisão para o Claude Code:**
- Não há squad `internal-rh` ativo no design atual
- Squads conhecidos: `internal-marketing`, `internal-sdr`, `internal-operacoes`, `default` (provavelmente outros — listar via query)

---

## P10 · Anthropic Claude → Lovable AI Gateway (Gemini + GPT-5)

**Quando:** decisão arquitetural visível no `llm-catalog.ts` e nas edge functions

**Mudança:**
- Memory do Felipe e a SPEC v2 mencionavam multi-provider com Claude
- O código real usa apenas `LOVABLE_API_KEY` chamando via Lovable AI Gateway
- Catálogo: `google/gemini-2.5-pro`, `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`, `openai/gpt-5`, `openai/gpt-5-mini`, `openai/gpt-5-nano`

**Por que (inferido):**
- Lovable AI Gateway é a forma padrão da plataforma Lovable
- Provavelmente custo previsível e abstração de provider em uma única API key
- Adicionar Anthropic exigiria mudanças arquiteturais (env vars, lógica de provider, etc.)

**Decisão para o Claude Code:**
- Sistema atual NÃO usa Anthropic Claude
- Se em algum momento for necessário Claude (ex: raciocínio crítico em diagnóstico), abrir como decisão arquitetural separada — não assumir disponibilidade
- Doc 04 da Base de Conhecimento (Pilares Técnicos) menciona Claude — está desatualizado para este sistema

---

## P11 · Base de Conhecimento documental NÃO INTEGRADA

**Quando:** estado atual (a Base de Conhecimento — Docs 01-11 — foi produzida em maio/2026 fora do sistema)

**Estado:**
- Bia e Carlos têm `persona` hardcoded em `agent_configs` (texto longo escrito direto na migration)
- Não há tabela `knowledge_chunks`, `documents`, `embeddings` no schema
- Não há edge function de ingestion ou de RAG
- Atualizar a Base de Conhecimento (ex: novo Doc 12) NÃO atualiza os agentes automaticamente

**Por que (inferido):**
- O sistema foi construído antes da Base de Conhecimento estar madura
- A persona dos agentes foi escrita direto no SQL como solução rápida

**Decisão para o Claude Code:**
- Este é o **gap mais importante a fechar na próxima fase**
- Ver SPEC v3, Fase 1 — implementar tabela `knowledge_chunks` + ingestion + tool de consulta nos prompts

---

## Resumo executivo dos pivots

| # | Pivot | Status |
|---|---|---|
| P1 | Workspaces → Squads | ✅ Consolidado (rota legada mantida) |
| P2 | Settings → Config | ✅ Consolidado (rotas detalhadas mantidas) |
| P3 | Office isolado → Escritorio com tabs | ✅ Consolidado |
| P4 | Dashboard → Painel | ✅ Consolidado |
| P5 | Projects → Projetos (componente de detalhe novo) | ✅ Consolidado parcialmente |
| P6 | portfolio_projects → agile_projects.is_portfolio | ✅ Consolidado |
| P7 | Beatriz → Bia (SDR) | ✅ Consolidado |
| P8 | Carlos (specialist) → Carlos (Closer) | ✅ Consolidado |
| P9 | Bug fix Márcio/Maya | ✅ Resolvido |
| P10 | Anthropic → Lovable AI Gateway | ✅ Consolidado (decisão arquitetural) |
| P11 | Base de Conhecimento não integrada | 🔴 **Gap aberto — endereçar na próxima fase** |

---

## Princípios extraídos dos pivots (para futuras decisões)

1. **Renomeação não dropa dados** — Bia ainda é a mesma agent_id da Beatriz; rotas legadas continuam vivas. Preservar histórico.
2. **Consolidar quando há duplicação conceitual** — portfolio_projects + agile_projects viraram uma tabela só. Aplicar mesma lógica em casos futuros.
3. **Tabs > múltiplas rotas** quando o usuário transita entre contextos relacionados (Office + Ágata = Escritorio com Tabs).
4. **Sidebar enxuto** — apenas o que o usuário usa todos os dias. Rotas detalhadas existem mas não poluem a navegação principal.
5. **Português onde o usuário lê** (Painel, Escritorio, Projetos, Config); **inglês no código e nas tabelas** (PainelPage, EscritorioPage, agile_projects, squad_runs).

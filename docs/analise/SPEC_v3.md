# SPEC v3 · IntelliX Squad Hub

> Especificação Mestra — versão ancorada no estado REAL do repositório
> Formato Spec Driven Development (SDD) · Compatível com Epic Workflow
> Versão 3.1 · Maio 2026
>
> **Mudanças v3.1:** Correção da estrutura de agentes após análise da UI real.
> Squad Marketing tem 7 agentes já implementados (Maya, Iris, Lúcio, Otto, Sofia, Téo, Vera).
> Ana, Bruno, Flora, Márcio são legados inativos. Fases B e C atualizadas.

---

## 1. Realidade do sistema (recap)

O `intellix-squad-hub` é um **sistema interno single-tenant da IntelliX.AI** já implementado em Lovable + Vite + React + Supabase, com:

- 296 commits desde o início
- 7 menus oficiais (Painel · Escritório · Pipeline · Jobs · Squads · Projetos · Config)
- Sistema completo de Projetos Ágeis (sprints, backlog, métricas, OKRs, impediments)
- CRM completo (leads, deals kanban, contracts, invoices, automations)
- 10 agentes catalogados em `agent_configs` (Ana, Bia, Bruno, Carlos, Roberto, Ágata, Márcio, Flora, Maya, Heitor)
- Visualização Phaser do escritório virtual (com sprites pixel-art)
- 3 agentes IA contextuais já funcionais (ai-assistant, ai-deal-coach, ai-sprint-coach)
- Sistema de execução de squad (`run_queue` + `run_steps` + `squad_runs`)
- 15 projetos catalogados como portfolio/dev

→ Detalhes em `ESTADO_ATUAL.md`.

---

## 2. Princípios não-negociáveis (herdados da SPEC v2, ainda válidos)

1. **Honestidade técnica** — agentes nunca prometem o que não podem entregar
2. **Tom Satya Nadella** — alinhado ao Doc 01 e 02 da Base de Conhecimento
3. **Humano no loop** — Felipe valida saídas críticas antes de enviar a cliente
4. **Propriedade da IntelliX** — single-tenant, código próprio
5. **Risk Reversal real** — promessas dos agentes ancoradas em estrutura documentada

---

## 3. Status das Fases

Diferente da SPEC v2 que tinha 4 fases (Fase 0 Base + Fase 1 Comercial + Fase 2 Marketing + Fase 3 Ágata), a SPEC v3 reconhece que **muito já está em produção** e reorganiza as fases por **gaps abertos**.

```
┌────────────────────────────────────────────────────────────────────┐
│            ESTADO DAS CAPACIDADES                                  │
│                                                                    │
│  ✅ IMPLEMENTADO (existe no repo, funcional)                       │
│     - Schema Supabase (39 tabelas, RLS, audit)                     │
│     - Sistema de execução de squad                                 │
│     - 3 agentes IA contextuais (assistant, deal-coach, sprint-coach)│
│     - Sistema completo de Projetos Ágeis                           │
│     - CRM completo                                                 │
│     - Office Phaser                                                │
│     - Sistema de notificações + e-mail + WhatsApp                  │
│     - Sistema de gestão Ágata (directives)                         │
│                                                                    │
│  ⚠️ PARCIALMENTE IMPLEMENTADO (existe mas incompleto)              │
│     - Personas dos agentes (só Bia + Carlos completos)             │
│     - Sprites dos agentes (5 dos 10 corrompidos)                   │
│                                                                    │
│  ❌ NÃO IMPLEMENTADO (precisa ser feito)                            │
│     - Base de Conhecimento como RAG no sistema                     │
│     - Tool de consulta da Base nos prompts dos agentes             │
│     - Personas detalhadas dos 8 agentes restantes                  │
│     - Integração WhatsApp ativa (Evolution API)                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. Fase A — Base de Conhecimento como RAG (PRIORITÁRIA)

> Esta é a Fase mais importante da SPEC v3. Sem ela, atualizar a Base de Conhecimento documental (Docs 01-11) não atualiza os agentes — eles continuam respondendo com persona congelada.

### 4.1 — Objetivo

Implementar sistema de Retrieval-Augmented Generation (RAG) que permite:
- Carregar os 11 documentos da Base de Conhecimento no Supabase com embeddings
- Atualizar 1 doc → reembedar → agentes consultam dinamicamente
- Doc 09 (Precificação Interna) **NUNCA** entra no RAG (visível apenas a Felipe)

### 4.2 — Behaviors (formato Epic Workflow)

#### Behavior A-1 — Schema de Base de Conhecimento

**Dado** que precisamos armazenar a Base de Conhecimento no sistema
**Quando** o admin (Felipe) executa a migration de criação
**Então** existem as tabelas:

```sql
-- Tabela principal de documentos
public.knowledge_documents (
  id uuid PRIMARY KEY,
  doc_number int NOT NULL,             -- 1 a 11 (corresponde a Doc 01 a Doc 11)
  title text NOT NULL,                  -- "Identidade", "Glossário", etc.
  version text NOT NULL,                -- "v1.0", "v1.2", "v2.0"
  layer text NOT NULL,                  -- "estrategia" | "oferta" | "operacao"
  is_restricted boolean DEFAULT false,  -- true para Doc 09 (Precificação)
  full_content text NOT NULL,           -- markdown completo
  metadata jsonb DEFAULT '{}',          -- audiência (quais agentes consomem), tags
  created_at timestamptz,
  updated_at timestamptz
);

-- Chunks com embedding para RAG
public.knowledge_chunks (
  id uuid PRIMARY KEY,
  document_id uuid REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,             -- ordem do chunk no documento
  section_title text,                   -- ex: "Parte 3 - ROI por frente"
  content text NOT NULL,
  embedding vector(1536),               -- pgvector (text-embedding-3-small da OpenAI)
  created_at timestamptz
);
CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
```

**Critérios de aceitação:**
- Migration executa sem erro em base limpa
- RLS configurada: agentes consultam via service_role; Felipe consulta via admin
- Doc 09 NUNCA pode ser retornado por busca de agente

---

#### Behavior A-2 — Edge function de ingestion

**Dado** um documento markdown na pasta `docs/base-conhecimento/`
**Quando** Felipe roda a edge function `knowledge-ingest`
**Então** o documento é dividido em chunks de ~500-800 tokens, embedados via OpenAI text-embedding-3-small, e salvos em `knowledge_chunks`

**Critérios:**
- Suporta atualização incremental (se doc já existe, deleta chunks antigos e reembeda)
- Doc 09 é ignorado pela ingestion (ou marcado como restricted)
- Logs detalhados de quantos chunks foram criados por doc
- Tempo de ingestion total < 60s para os 11 docs

---

#### Behavior A-3 — Edge function de busca semântica

**Dado** uma pergunta natural ("Qual o preço do FORJA MVP?")
**Quando** um agente chama `knowledge-search` com a pergunta + seu `agent_id`
**Então** o sistema:
1. Embeda a pergunta
2. Busca top-5 chunks semanticamente similares
3. Filtra chunks de documentos restricted aos quais o agente não tem acesso
4. Retorna chunks com `document_title`, `section_title`, `content`, `similarity_score`

**Critérios:**
- Bia (SDR) NÃO pode ver chunks do Doc 09
- Carlos (Closer) NÃO pode ver chunks do Doc 09
- Felipe via admin pode ver tudo
- Latência < 500ms p95

---

#### Behavior A-4 — Tool de consulta nos prompts dos agentes

**Dado** Bia ou Carlos respondendo a uma pergunta de cliente
**Quando** a pergunta envolve dado da Base de Conhecimento (preço, escopo, processo, objeção)
**Então** o agente:
1. Decide consultar a Base (via tool definida no system prompt)
2. Chama `knowledge-search` com a pergunta extraída
3. Recebe chunks relevantes
4. Compõe a resposta usando os chunks (citando a fonte se apropriado)

**Critérios:**
- System prompt de cada agente declara explicitamente o tool
- Agente cita a fonte quando usa um chunk ("Conforme nossa documentação interna...")
- Agente NÃO inventa preço se não encontra chunk relevante — em vez disso, escala para Felipe

---

#### Behavior A-5 — UI de gestão da Base no Config

**Dado** Felipe acessa `/config` → nova tab "Base de Conhecimento"
**Quando** ele visualiza a página
**Então** vê lista dos 11 documentos com versão atual, última atualização, número de chunks
**E** pode acionar "Reingerir" para qualquer doc

**Critérios:**
- Não permite editar conteúdo do doc na UI (edição é via arquivo `.md` no repo, depois ingestion)
- Mostra preview da Base para validar como agente vê
- Botão de "reingerir tudo" para casos de atualização em massa

---

### 4.3 — Arquivos a criar (Fase A)

```
supabase/migrations/
  20260520_knowledge_base_schema.sql      ← Behavior A-1

supabase/functions/
  knowledge-ingest/                       ← Behavior A-2
    index.ts
  knowledge-search/                       ← Behavior A-3
    index.ts

src/pages/config/
  KnowledgeBaseTab.tsx                    ← Behavior A-5
  
src/hooks/
  useKnowledgeBase.ts

docs/base-conhecimento/                   ← Já existe (os 11 docs)
```

### 4.4 — Atualização das personas existentes (Bia, Carlos)

Após Fase A implementada, **atualizar as personas** de Bia e Carlos para incluir instruções de uso da Base:

```
## Como consultar a Base de Conhecimento

Você tem acesso à ferramenta `knowledge_search`. Use sempre que:
- Cliente perguntar sobre preço, prazo ou escopo
- Cliente apresentar objeção que você reconhece como documentada
- Você não tem certeza da resposta

Como usar: chame knowledge_search com a pergunta em linguagem natural.
Receba até 5 trechos relevantes. Componha sua resposta com base neles.

Se a busca não retornar chunks relevantes, NUNCA invente.
Diga ao cliente: "Vou confirmar isso com a equipe e te respondo em [prazo]."
E gere um alerta para Felipe.
```

Essa atualização sai como nova migration: `20260521_update_personas_with_rag.sql`.

---

## 5. Fase B — Personas dos agentes ativos sem persona detalhada

> ⚠️ **Correção v3.1:** A Fase B original listava agentes incorretos.
> Estrutura real confirmada por Felipe em 20/05/2026 — ver ESTADO_ATUAL.md seção 5.

Depois da Base de Conhecimento como RAG funcionando, completar as personas dos
9 agentes ativos que ainda têm persona genérica.

### 5.1 — Prioridade 1: Ágata (orquestradora)

Ágata tem papel claro (`internal:gestao:daily-standup`) mas persona genérica.
Por ser a orquestradora de todo o sistema, sua persona é a mais crítica depois de Bia e Carlos.

**O que a persona da Ágata precisa cobrir:**
- Como ela conduz o daily-standup do squad
- Como ela despacha directives para os agentes
- Como ela monitora o funil comercial e projetos em andamento
- Como ela gera alertas para Felipe
- Tom de comunicação (interno — mais direto que Bia/Carlos)

---

### 5.2 — Prioridade 2: Squad Marketing (7 agentes)

Os 7 agentes do Squad Marketing já existem no banco com roles e squads corretos.
**O trabalho da Fase B é completar as personas — não criar os agentes.**

| Agente | Role | Squad | O que a persona precisa cobrir |
|---|---|---|---|
| **Maya** | manager:strategist | squad:marketing | Estratégia geral do squad, priorização de pautas, alinhamento com a identidade IntelliX |
| **Iris** | content-curator | squad:marketing:curator | Como selecionar e curar conteúdo externo relevante para IntelliX |
| **Lúcio** | lead-analyst:researcher | squad:marketing:researcher | Como pesquisar tendências, concorrentes, oportunidades de pauta |
| **Otto** | intelligence-analyst | squad:marketing:intelligence | Como analisar dados de engajamento e performance de conteúdo |
| **Sofia** | reviewer:editor | squad:marketing:editor | Como revisar conteúdo para tom Satya Nadella, Glossário (Doc 02) e qualidade |
| **Téo** | specialist:copywriter | squad:marketing:copywriter | Como escrever copy para LinkedIn, Instagram, e-mail; tom anti-hype |
| **Vera** | specialist:art-director | squad:marketing:art-director | Como orientar criação visual, identidade visual IntelliX |

**Insumo obrigatório para todas as personas do Squad Marketing:**
Docs 01 (Identidade), 02 (Glossário) e 05 (Portfólio) da Base de Conhecimento.

---

### 5.3 — Prioridade 3: Heitor (gestão de incidentes)

Heitor (`internal:gestao:incident-response`) tem papel de resposta a incidentes operacionais.
Persona precisa cobrir: quando acionar, como escalar, o que fazer em falha crítica de sistema.

---

### 5.4 — Agentes que NÃO entram na Fase B (legados)

| Agente | Motivo |
|---|---|
| Ana | Legado squad:default — não atua nesta fase |
| Bruno | Legado squad:default — não atua nesta fase |
| Flora | Legado job-weight — não atua nesta fase |
| Márcio | Legado job-weight — não atua nesta fase |

**Regra:** zero esforço de configuração nos legados. Não participam do fluxo de execução.
Reativar somente no futuro se um squad de execução/delivery for criado.

---

### 5.5 — Como implementar personas na Fase B

Cada persona vira uma migration `UPDATE` em `agent_configs` — nunca `DELETE`.
Seguir o padrão estabelecido em `20260508_fase1b_update_personas.sql`.

```sql
-- Exemplo de padrão a seguir
UPDATE agent_configs
SET persona = '...',
    updated_at = NOW()
WHERE name = 'agata';
```

Felipe revisa cada persona antes de executar a migration.

---

## 6. Fase C — Bug fix dos sprites

Sprites corrompidos nos agentes ativos. A lista corrigida (baseada na estrutura real):

### 6.1 — Sprites a corrigir (agentes ATIVOS)
- **agata** — IHDR com CRC inválido (prioritário — é a orquestradora)
- **maya** — IDAT truncado (~16 bytes)
- **heitor** — IDAT truncado (~39 bytes)

### 6.2 — Sprites a verificar (Squad Marketing — podem não ter sprite ainda)
- **iris, lucio, otto, sofia, teo, vera** — verificar se existem em `sprite_assets`
  ou se usam fallback genérico. Se não existem, criar na mesma migration.

### 6.3 — Sprites dos LEGADOS (não priorizar)
- **flora, marcio** — corrompidos, mas agentes legados. Corrigir somente se houver
  tempo sobrando na Fase C. Não bloquear o restante.

### 6.4 — Como resolver

Duas opções:
1. **Felipe envia os PNGs originais** (96×144 por frame, 10 frames = 960×144)
2. **Gerar proceduralmente** novos PNGs pixel-art seguindo estrutura dos que funcionam

Migration: `20260520_fix_corrupted_sprites.sql` — UPSERT em `sprite_assets`.

**Atenção:** confirmar se `sprite_key` da Bia ainda é `beatriz` — se sim, corrigir
para `bia` ou ajustar o loader.

---

## 7. Fase D — Integração WhatsApp ativa

A tabela `whatsapp_configs` existe, a edge function `send-whatsapp` existe, mas não há evidência de que Evolution API esteja conectada e ativa.

### 7.1 — O que verificar primeiro

- A edge function `send-whatsapp` está apontando para qual URL? (Evolution API na VPS Hetzner?)
- Tem token de autenticação configurado?
- Tem webhook inbound (receber mensagens) implementado?

### 7.2 — O que provavelmente falta (a confirmar)

- Edge function `whatsapp-webhook-inbound` para receber mensagens
- Mapeamento mensagem inbound → lead/deal no CRM
- Atribuição de mensagem ao agente correto (Bia se for lead novo)

---

## 8. O que NÃO está nas Fases (intencional)

### O que NÃO faremos agora

- ❌ **Migração para Anthropic Claude** — sistema usa Lovable AI Gateway (Gemini + GPT-5). Mudar requer alterações arquiteturais; não é prioridade.
- ❌ **Multi-tenant** — Felipe confirmou: single-tenant. Não introduzir `tenant_id`.
- ❌ **Reescrever sistemas existentes** (CRM, Projetos Ágeis, etc.) — funcionam. Não tocar sem bug reportado.
- ❌ **Configurar agentes legados** (Ana, Bruno, Flora, Márcio) — inativos por decisão. Zero esforço até novo squad de execução ser criado.

### Decisões já tomadas e confirmadas por Felipe (não reabrir)

| Decisão | Confirmado em |
|---|---|
| Sistema é single-tenant | 20/05/2026 |
| Squad Marketing tem 7 agentes: Maya + Iris + Lúcio + Otto + Sofia + Téo + Vera | 20/05/2026 |
| Squad Comercial: Bia (SDR) + Carlos (Closer) | Fase 1 migrations |
| Orquestração: Ágata (daily-standup) + Heitor (incident-response) | 20/05/2026 |
| Ana, Bruno, Flora, Márcio são legados inativos nesta fase | 20/05/2026 |
| LLM provider: Lovable AI Gateway (não Anthropic) | Arquitetural |

### Decisões intencionalmente adiadas

- **Adicionar Doc 12 (Política de Privacidade) à Base de Conhecimento** — necessário, mas só faz sentido depois da Fase A
- **Atualizar Doc 05 (Portfólio) com os 15 projetos catalogados no sistema** — Base de Conhecimento desatualizada vs realidade do código
- **Remover rotas legadas** (`/dashboard`, `/office`, `/workspaces`, `/projects`, `/settings/*`) — débito técnico, não urgente

---

## 9. Risco identificado: Base de Conhecimento vs Schema do código

O Doc 04 (Pilares Técnicos) da Base de Conhecimento e o schema real divergem em pontos:

| Tópico | Base de Conhecimento diz | Código real diz |
|---|---|---|
| LLM Providers | Multi-provider com Claude para "raciocínio crítico" | Apenas Gemini + GPT-5 via Lovable Gateway |
| Squad | Squad Marketing (7) + Squad Comercial (Bia+Carlos) + Ágata | 10 agentes em squads variados (marketing, sdr, operacoes) |
| Portfolio | 3 cases ativos (Cavendish, XPAG, Yolo) | 15 projetos catalogados (7 live, 7 dev, 1 archived) |
| Multi-tenant | "Multi-tenant ready" mencionado | Single-tenant explícito |

**Decisão necessária por Felipe:** atualizar a Base de Conhecimento documental para refletir o código real, ou atualizar o código para refletir a Base documental?

**Recomendação:** o código é fato consumado (15 projetos no banco, 10 agentes). Atualizar a Base de Conhecimento (Docs 04, 05) na próxima revisão para alinhar. Isso vira **Doc 04 v2.0** e **Doc 05 v2.0**.

---

## 10. Próximos comandos no Claude Code

Quando você abrir o Claude Code na pasta do repo (depois de aplicar o CLAUDE.md):

```bash
cd ~/intellix-squad-hub
claude
```

Dentro do Claude Code:

```
> Leia CLAUDE.md, ESTADO_ATUAL.md, PIVOTS.md e SPEC_v3.md.
> Depois execute /break na Fase A para quebrar em behaviors atomicos.
```

O `/break` da Fase A deve gerar:
- `behaviors/A-1-schema-knowledge.md`
- `behaviors/A-2-edge-ingest.md`
- `behaviors/A-3-edge-search.md`
- `behaviors/A-4-personas-com-rag.md`
- `behaviors/A-5-ui-config-base.md`

Depois `/plan` em cada behavior, depois `/execute` no plano.

---

## 11. Critério de sucesso da v3 inteira

A v3 é bem-sucedida quando:
1. ✅ Fase A implementada — Base de Conhecimento como RAG funcionando
2. ✅ Bia e Carlos consultam a Base dinamicamente em vez de ter prompt hardcoded
3. ✅ Felipe pode atualizar 1 doc `.md`, rodar `knowledge-ingest`, e agentes refletem na próxima conversa
4. ✅ Sprites corrompidos resolvidos (Fase C)
5. ✅ Pelo menos a Ágata + 3 outros agentes (escolhidos por Felipe) têm persona detalhada (Fase B parcial)
6. 🟡 Integração WhatsApp ativa (Fase D) — opcional dependendo de prioridade comercial

**Métrica de sucesso global:** atualizar a Base de Conhecimento (mudar uma linha no Doc 03) → 30 segundos depois, Bia já responde com a nova informação em uma conversa real.

---

## 12. Convenção de versionamento desta SPEC

- **v1.0** (descartada) — antes da Base de Conhecimento estar consolidada
- **v2.0** (descartada) — antes da análise do repositório (assumia construir do zero)
- **v3.0** (esta) — ancorada no estado real do código

A v3 será atualizada para v3.1 quando Fase A estiver concluída, com lições aprendidas.

---

*IntelliX Squad Hub · SPEC v3 · Maio 2026*
*Análise: 296 commits · 32 migrations · 24 edge functions · 39 tabelas*

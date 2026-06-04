# Squad de Marketing — Design Spec

**Data:** 2026-06-04  
**Projeto:** intellix-squad-hub (OpenSquad Platform)  
**Status:** Aprovado para implementação

---

## Contexto

O `intellix-squad-hub` já possui o arquivo `.agents/product-marketing.md` com brand voice, 5 pilares de conteúdo e messaging framework completo. Gap identificado: zero edge functions de marketing e zero UI de aprovação de conteúdo.

Este spec define o **Squad de Marketing** — um conjunto de 4 edge functions e 1 página de UI para geração, revisão e aprovação de rascunhos de posts para LinkedIn e Instagram.

---

## Requisitos

- Geração de conteúdo com aprovação manual (sem publicação automática)
- Volume: 5–15 posts/semana (3 por execução agendada, seg/qua/sex)
- Felipe atua como curador passivo — aprova ou rejeita o que o squad gera
- Felipe pode propor um tema on-demand para disparar geração avulsa
- Fontes de pesquisa: base de conhecimento IntelliX + web/Google via Perplexity + LinkedIn via SerpAPI
- Toda lógica nas edge functions do Supabase — sem dependência de n8n

---

## Arquitetura

### Pipeline de execução

```
pg_cron (seg/qua/sex 8h)
        │
        ▼
marketing-orchestrator
        │
        ├──► marketing-researcher
        │         ├── knowledge-search (edge fn existente)
        │         ├── Perplexity API sonar-pro  ← web + Google + notícias
        │         └── SerpAPI site:linkedin.com ← posts públicos LinkedIn
        │              retorna: context_bundle (5–8 snippets ranqueados)
        │
        ├──► marketing-ideator (recebe context_bundle)
        │         ├── aplica distribuição de pilares (30/25/20/15/10%)
        │         └── retorna: 3 ideias com título, pilar, ângulo
        │
        └──► marketing-writer (1 chamada por ideia)
                  ├── aplica brand voice de .agents/product-marketing.md
                  └── salva 3 drafts em marketing_drafts com status=generated

Felipe propõe tema on-demand
        │
        ▼
UI dialog → POST marketing-orchestrator { theme_prompt, platform }
        └──► mesmo pipeline, com contexto de tema no marketing-ideator
```

### Edge functions

| Função | Responsabilidade |
|--------|-----------------|
| `marketing-orchestrator` | Coordena o pipeline; aceita payload opcional `{ theme_prompt, platform }` para modo manual |
| `marketing-researcher` | Busca paralela em 3 fontes; retorna `context_bundle[]` com source, url, snippet |
| `marketing-ideator` | Gera 3 ideias ranqueadas respeitando distribuição de pilares |
| `marketing-writer` | Produz rascunho completo seguindo brand voice e estrutura de post validada |

Todas as funções reusam `_shared/auth.ts`, `_shared/cors.ts` e `_shared/llm-provider.ts`.

### Fontes de pesquisa (hardcoded, sem config)

| Fonte | API | O que cobre |
|-------|-----|-------------|
| IntelliX knowledge base | `knowledge-search` (edge fn) | Cases, produtos, docs internos |
| Web + Google + notícias | Perplexity `sonar-pro` | Tendências IA, Google Discover |
| LinkedIn posts públicos | SerpAPI `site:linkedin.com` | Conteúdo B2B do nicho |

Nenhuma config de UI necessária. Para adicionar fonte futura: ajuste na edge function.

---

## Schema

```sql
create type marketing_pilar as enum (
  'resultado_ia',
  'educacao_pratica',
  'bastidores',
  'posicionamento',
  'comercial'
);

create type marketing_status as enum (
  'generated',
  'approved',
  'rejected',
  'published'
);

create type marketing_platform as enum (
  'linkedin',
  'instagram',
  'whatsapp'
);

create table marketing_drafts (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  content           text not null,
  pilar             marketing_pilar not null,
  platform          marketing_platform not null default 'linkedin',
  status            marketing_status not null default 'generated',
  theme_prompt      text,                  -- preenchido só no modo manual
  research_snippets jsonb,                 -- top 3 fontes: [{ source, url, snippet }]
  trigger_mode      text not null default 'scheduled', -- 'scheduled' | 'manual'
  approved_at       timestamptz,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);

alter table marketing_drafts enable row level security;

create policy "admin only"
  on marketing_drafts for all
  using (auth.jwt() ->> 'role' = 'admin');
```

---

## UI

### Rota e arquivos

```
/marketing                          → MarketingPage
src/pages/marketing/MarketingPage.tsx
src/pages/marketing/MarketingDraftCard.tsx
src/hooks/useMarketingDrafts.ts
```

Rota adicionada em `App.tsx` (lazy). Entrada no nav lateral ao lado de Pipeline.

### MarketingPage

- Header: título "Squad de Marketing" + badge com count de drafts `generated` + botão "Propor tema"
- Tabs de filtro: Gerados (N) | Aprovados | Publicados | Rejeitados
- Lista de `MarketingDraftCard`

### MarketingDraftCard

Segue o padrão de `OutreachApprovalCard`. Por card:

- Header: título do post + badge pilar + badge plataforma + timestamp relativo
- Body: preview do conteúdo com expansão "ver mais"
- Ações por status:
  - `generated` → [Regerar ↺] [Rejeitar ✕] [Aprovar ✓]
  - `approved` → [Marcar como publicado]
  - `published` / `rejected` → somente leitura

### Dialog "Propor tema"

Disparado pelo botão no header:

- Textarea: "Descreva o tema ou ângulo que quer explorar"
- Selector de plataforma (LinkedIn | Instagram | WhatsApp), default LinkedIn
- Botão "Gerar" → POST `marketing-orchestrator` com `{ theme_prompt, platform, trigger_mode: 'manual' }`
- Loading state durante geração (~15–20s esperado)

---

## Secrets necessários (Supabase)

| Secret | Descrição |
|--------|-----------|
| `PERPLEXITY_API_KEY` | API key Perplexity sonar-pro |
| `SERPAPI_KEY` | API key SerpAPI |
| `OPENAI_API_KEY` | Já configurada (knowledge-search) |

---

## Fora do escopo (não implementar agora)

- Publicação automática nas plataformas (OAuth LinkedIn/Instagram)
- Config UI de fontes ou pilares
- Histórico de pesquisa / cache de context_bundle
- Métricas de performance dos posts
- Agendamento de horário de publicação

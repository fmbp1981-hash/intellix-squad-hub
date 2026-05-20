# A-1: Schema de Base de Conhecimento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar as tabelas `knowledge_documents` e `knowledge_chunks` no Supabase com pgvector, RLS e índice HNSW — fundação do sistema RAG.

**Architecture:** Uma migration SQL única cria as duas tabelas, habilita a extensão `vector` (pgvector), define políticas RLS seguindo o padrão `has_role()` já existente no projeto, e cria o índice HNSW para busca semântica eficiente. Nenhum código TypeScript é modificado neste behavior.

**Tech Stack:** PostgreSQL 17, pgvector, Supabase SQL Editor / CLI, funções SQL existentes `public.has_role()` e `public.update_updated_at()`.

---

## Padrões do projeto (ler antes de começar)

O projeto usa estas convenções em migrations — seguir exatamente:

- **Nomeação:** `YYYYMMDD_descricao_snake_case.sql` (ex: `20260508_fase1_reestruturacao_agentes.sql`)
- **Header:** bloco de comentário `===` com projeto + data + instrução de execução
- **Criação segura de objetos:** `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
- **RLS admin:** `public.has_role(auth.uid(), 'admin')` — função já existe, NÃO criar nova
- **Trigger updated_at:** `public.update_updated_at()` — função já existe, NÃO criar nova
- **REPLICA IDENTITY:** `ALTER TABLE ... REPLICA IDENTITY FULL;` em toda nova tabela
- **Rollback:** bloco comentado no final da migration para referência

---

## Mapeamento de arquivos

| Ação | Arquivo |
|---|---|
| Criar | `supabase/migrations/20260520_knowledge_base_schema.sql` |
| Verificar (existente) | `supabase/migrations/20260510_routing_rules.sql` — referência de padrão RLS + trigger |

---

## Task 1: Verificar pré-requisitos no Supabase

**Files:**
- Read: `supabase/migrations/20260510_routing_rules.sql` (confirmar que `has_role` e `update_updated_at` existem)

- [ ] **Step 1.1: Confirmar que `public.has_role` existe**

Abrir o Supabase SQL Editor do projeto `hynadwlwrscvjubryqlg` e rodar:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('has_role', 'update_updated_at');
```

Resultado esperado: 2 linhas — `has_role` e `update_updated_at`.

Se retornar 0 ou 1 linha: **parar e avisar Felipe** — alguma migration anterior não foi aplicada.

- [ ] **Step 1.2: Confirmar que pgvector está disponível**

No mesmo SQL Editor:

```sql
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE name = 'vector';
```

Resultado esperado: 1 linha com `name = 'vector'`. `installed_version` pode ser NULL se ainda não habilitado — normal.

Se retornar 0 linhas: pgvector não está disponível no plano do Supabase. **Parar e avisar Felipe** — necessário verificar se o projeto está no plano Pro ou superior.

- [ ] **Step 1.3: Confirmar que as tabelas ainda não existem**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('knowledge_documents', 'knowledge_chunks');
```

Resultado esperado: 0 linhas. Se retornar alguma: tabela já criada anteriormente — verificar com Felipe antes de continuar.

---

## Task 2: Escrever a migration SQL

**Files:**
- Criar: `supabase/migrations/20260520_knowledge_base_schema.sql`

- [ ] **Step 2.1: Criar o arquivo de migration**

Criar o arquivo `supabase/migrations/20260520_knowledge_base_schema.sql` com o conteúdo completo abaixo:

```sql
-- =============================================================================
-- knowledge_documents + knowledge_chunks — Base de Conhecimento RAG
-- Projeto: IntelliX OpenSquad Platform (hynadwlwrscvjubryqlg)
-- Data: 2026-05-20
-- Behavior: A-1 (Fase A — Base de Conhecimento como RAG)
-- Executar no Supabase SQL Editor
-- DEPENDE: public.has_role() e public.update_updated_at() já existentes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pré-requisito: extensão pgvector
-- text-embedding-3-small = 1536 dimensões
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- TABELA: knowledge_documents
-- Armazena os 11 documentos da Base de Conhecimento com metadados.
-- Doc 09 (Precificação Interna) tem is_restricted = true.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  doc_number    integer     NOT NULL,
  title         text        NOT NULL,
  version       text        NOT NULL DEFAULT 'v1.0',
  layer         text        NOT NULL,
  is_restricted boolean     NOT NULL DEFAULT false,
  full_content  text        NOT NULL DEFAULT '',
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT knowledge_documents_pkey          PRIMARY KEY (id),
  CONSTRAINT knowledge_documents_doc_number_uk UNIQUE (doc_number),
  CONSTRAINT knowledge_documents_layer_check   CHECK (
    layer IN ('estrategia', 'oferta', 'operacao')
  )
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents REPLICA IDENTITY FULL;

-- Índice para listagem por doc_number (UI de /config)
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_doc_number
  ON public.knowledge_documents (doc_number);

-- Trigger updated_at
CREATE TRIGGER trg_knowledge_documents_updated
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: knowledge_documents
-- Autenticados veem documentos não restritos.
-- Admin vê tudo (incluindo Doc 09).
-- Service role bypassa RLS por padrão (edge functions).
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "knowledge_documents_read_unrestricted"
    ON public.knowledge_documents
    FOR SELECT
    USING (
      auth.role() = 'authenticated'
      AND is_restricted = false
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "knowledge_documents_admin_all"
    ON public.knowledge_documents
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- TABELA: knowledge_chunks
-- Chunks dos documentos com embedding pgvector para busca semântica.
-- Cascade delete: apagar o documento apaga todos os seus chunks.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  document_id   uuid        NOT NULL,
  chunk_index   integer     NOT NULL,
  section_title text,
  content       text        NOT NULL,
  embedding     vector(1536),
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT knowledge_chunks_pkey             PRIMARY KEY (id),
  CONSTRAINT knowledge_chunks_document_fk      FOREIGN KEY (document_id)
    REFERENCES public.knowledge_documents (id) ON DELETE CASCADE,
  CONSTRAINT knowledge_chunks_position_uk      UNIQUE (document_id, chunk_index)
);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Índice HNSW para busca por similaridade de cosseno (pgvector)
-- m=16, ef_construction=64 — boa qualidade para base pequena (< 500 chunks)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índice para recuperar chunks de um documento específico (usado na ingestion)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
  ON public.knowledge_chunks (document_id);

-- -----------------------------------------------------------------------------
-- RLS: knowledge_chunks
-- Segue a restrição do documento pai (is_restricted no join).
-- Admin vê tudo; service role bypassa.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "knowledge_chunks_read_unrestricted"
    ON public.knowledge_chunks
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.knowledge_documents d
        WHERE d.id = document_id
          AND d.is_restricted = false
          AND auth.role() = 'authenticated'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "knowledge_chunks_admin_all"
    ON public.knowledge_chunks
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- ROLLBACK (referência — não executar em produção sem consenso):
--
--   DROP TABLE IF EXISTS public.knowledge_chunks;
--   DROP TABLE IF EXISTS public.knowledge_documents;
--   -- NÃO dropar a extensão vector — pode ser usada por outras tabelas
-- =============================================================================
```

- [ ] **Step 2.2: Revisar o arquivo salvo**

Confirmar que o arquivo existe:

```powershell
Test-Path "C:\Projects\intellix-squad-hub\supabase\migrations\20260520_knowledge_base_schema.sql"
```

Resultado esperado: `True`

---

## Task 3: Aplicar a migration no Supabase

**Nota:** O projeto usa Supabase hospedado (não local). A migration é aplicada via SQL Editor ou via `supabase db push`.

- [ ] **Step 3.1: Aplicar via SQL Editor**

Copiar o conteúdo completo do arquivo `20260520_knowledge_base_schema.sql` e colar no Supabase SQL Editor do projeto `hynadwlwrscvjubryqlg`. Executar.

Resultado esperado: mensagem de sucesso sem erros. Se houver erro em `CREATE EXTENSION IF NOT EXISTS vector`: pgvector indisponível no plano — parar e avisar Felipe.

---

## Task 4: Verificar a migration aplicada

Rodar cada query de verificação no SQL Editor e confirmar os resultados.

- [ ] **Step 4.1: Confirmar tabelas criadas**

```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('knowledge_documents', 'knowledge_chunks')
ORDER BY table_name;
```

Resultado esperado: 2 linhas — `knowledge_chunks` e `knowledge_documents`, ambas `BASE TABLE`.

- [ ] **Step 4.2: Confirmar colunas de `knowledge_documents`**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'knowledge_documents'
ORDER BY ordinal_position;
```

Resultado esperado (9 colunas):

| column_name   | data_type                   | is_nullable |
|---|---|---|
| id            | uuid                        | NO          |
| doc_number    | integer                     | NO          |
| title         | text                        | NO          |
| version       | text                        | NO          |
| layer         | text                        | NO          |
| is_restricted | boolean                     | NO          |
| full_content  | text                        | NO          |
| metadata      | jsonb                       | NO          |
| created_at    | timestamp with time zone    | NO          |
| updated_at    | timestamp with time zone    | NO          |

- [ ] **Step 4.3: Confirmar colunas de `knowledge_chunks`**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'knowledge_chunks'
ORDER BY ordinal_position;
```

Resultado esperado (7 colunas):

| column_name   | data_type                |
|---|---|
| id            | uuid                     |
| document_id   | uuid                     |
| chunk_index   | integer                  |
| section_title | text                     |
| content       | text                     |
| embedding     | USER-DEFINED (vector)    |
| created_at    | timestamp with time zone |

- [ ] **Step 4.4: Confirmar índice HNSW criado**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'knowledge_chunks'
  AND indexname = 'knowledge_chunks_embedding_hnsw_idx';
```

Resultado esperado: 1 linha com `indexdef` contendo `USING hnsw`.

- [ ] **Step 4.5: Confirmar RLS habilitada em ambas as tabelas**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('knowledge_documents', 'knowledge_chunks');
```

Resultado esperado: ambas as linhas com `rowsecurity = true`.

- [ ] **Step 4.6: Confirmar políticas RLS criadas**

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('knowledge_documents', 'knowledge_chunks')
ORDER BY tablename, policyname;
```

Resultado esperado: 4 políticas:
- `knowledge_chunks` / `knowledge_chunks_admin_all` / ALL
- `knowledge_chunks` / `knowledge_chunks_read_unrestricted` / SELECT
- `knowledge_documents` / `knowledge_documents_admin_all` / ALL
- `knowledge_documents` / `knowledge_documents_read_unrestricted` / SELECT

- [ ] **Step 4.7: Confirmar trigger de updated_at**

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trg_knowledge_documents_updated';
```

Resultado esperado: 1 linha com `event_object_table = knowledge_documents`.

- [ ] **Step 4.8: Confirmar unique constraint em `doc_number`**

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'knowledge_documents'
  AND constraint_type IN ('UNIQUE', 'PRIMARY KEY', 'CHECK');
```

Resultado esperado: 3 constraints — `PRIMARY KEY` (id), `UNIQUE` (doc_number), `CHECK` (layer).

---

## Task 5: Teste funcional — insert + RLS

- [ ] **Step 5.1: Inserir documento de teste (via service role / SQL Editor)**

```sql
INSERT INTO public.knowledge_documents (
  doc_number, title, version, layer, is_restricted, full_content, metadata
) VALUES (
  99,
  'Teste A-1',
  'v0.0',
  'estrategia',
  false,
  '# Documento de teste\n\nConteúdo para validar a migration.',
  '{"audience": ["teste"]}'::jsonb
);
```

Resultado esperado: `INSERT 1`.

- [ ] **Step 5.2: Inserir chunk de teste**

```sql
INSERT INTO public.knowledge_chunks (
  document_id, chunk_index, section_title, content
) VALUES (
  (SELECT id FROM public.knowledge_documents WHERE doc_number = 99),
  0,
  'Conteúdo de teste',
  'Conteúdo para validar a migration do behavior A-1.'
);
-- embedding NULL por enquanto — será preenchido na Fase A-2
```

Resultado esperado: `INSERT 1`.

- [ ] **Step 5.3: Verificar CASCADE DELETE**

```sql
DELETE FROM public.knowledge_documents WHERE doc_number = 99;

SELECT count(*) FROM public.knowledge_chunks
WHERE document_id NOT IN (SELECT id FROM public.knowledge_documents);
```

Resultado esperado: `count = 0` (chunks foram deletados em cascade).

- [ ] **Step 5.4: Testar restrição doc_number único**

```sql
INSERT INTO public.knowledge_documents (
  doc_number, title, version, layer, is_restricted, full_content
) VALUES (
  99, 'Duplicado', 'v1.0', 'oferta', false, 'x'
);
-- deve falhar imediatamente
INSERT INTO public.knowledge_documents (
  doc_number, title, version, layer, is_restricted, full_content
) VALUES (
  99, 'Duplicado 2', 'v1.0', 'oferta', false, 'x'
);
```

Resultado esperado: segundo INSERT falha com `duplicate key value violates unique constraint "knowledge_documents_doc_number_uk"`.

Limpar o registro de teste inserido com sucesso:

```sql
DELETE FROM public.knowledge_documents WHERE doc_number = 99;
```

---

## Task 6: Commit

- [ ] **Step 6.1: Commit da migration**

```powershell
cd C:\Projects\intellix-squad-hub
git add supabase/migrations/20260520_knowledge_base_schema.sql
git commit -m "feat: add knowledge_documents + knowledge_chunks schema with pgvector (A-1)"
```

Resultado esperado: commit criado em `main`.

---

## Checklist de auto-revisão (spec vs plano)

Verificando cobertura do behavior A-1:

| Requisito do behavior | Coberto? |
|---|---|
| `CREATE EXTENSION IF NOT EXISTS vector` | ✅ Task 2, Step 2.1 |
| Tabela `knowledge_documents` com todas as colunas | ✅ Task 2, Step 2.1 |
| Tabela `knowledge_chunks` com `vector(1536)` | ✅ Task 2, Step 2.1 |
| `UNIQUE (doc_number)` | ✅ Task 2, Step 2.1 |
| `UNIQUE (document_id, chunk_index)` | ✅ Task 2, Step 2.1 |
| `ON DELETE CASCADE` em `knowledge_chunks.document_id` | ✅ Task 2, Step 2.1 |
| Índice HNSW com `vector_cosine_ops` | ✅ Task 2, Step 2.1 |
| RLS habilitada em ambas as tabelas | ✅ Task 2, Step 2.1 |
| Autenticados veem apenas `is_restricted = false` | ✅ policy `*_read_unrestricted` |
| Admin vê tudo (`has_role`) | ✅ policy `*_admin_all` |
| Trigger `updated_at` em `knowledge_documents` | ✅ Task 2, Step 2.1 |
| CHECK constraint em `layer` | ✅ Task 2, Step 2.1 |
| `REPLICA IDENTITY FULL` | ✅ Task 2, Step 2.1 |
| Verificação de pré-requisitos (`has_role`, `update_updated_at`) | ✅ Task 1 |
| Teste CASCADE DELETE | ✅ Task 5, Step 5.3 |
| Teste constraint UNIQUE `doc_number` | ✅ Task 5, Step 5.4 |
| ROLLBACK comentado | ✅ Task 2, Step 2.1 |

---

*Plano A-1 · IntelliX Squad Hub · 2026-05-19*

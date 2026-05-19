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

  CONSTRAINT knowledge_documents_pkey             PRIMARY KEY (id),
  CONSTRAINT knowledge_documents_doc_number_uk    UNIQUE (doc_number),
  CONSTRAINT knowledge_documents_layer_check      CHECK (
    layer IN ('estrategia', 'oferta', 'operacao')
  ),
  CONSTRAINT knowledge_documents_content_nonempty CHECK (char_length(full_content) > 0)
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents REPLICA IDENTITY FULL;

-- Índice para listagem por doc_number (UI de /config)
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_doc_number
  ON public.knowledge_documents (doc_number);

-- Trigger updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_knowledge_documents_updated
    BEFORE UPDATE ON public.knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

-- Índice parcial para monitorar chunks sem embedding (orphans da ingestion)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_null_embedding
  ON public.knowledge_chunks (id)
  WHERE embedding IS NULL;

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
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1
        FROM public.knowledge_documents d
        WHERE d.id = document_id
          AND d.is_restricted = false
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

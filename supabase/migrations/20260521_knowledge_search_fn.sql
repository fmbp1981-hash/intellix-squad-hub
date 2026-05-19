-- supabase/migrations/20260521_knowledge_search_fn.sql
-- Provides pgvector cosine similarity search for knowledge-search edge function.
-- Called via supabase.rpc('match_knowledge_chunks', { ... })

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding   vector(1536),
  similarity_threshold float    DEFAULT 0.70,
  match_count       int         DEFAULT 5,
  filter_restricted boolean     DEFAULT true,
  filter_layer      text        DEFAULT NULL
)
RETURNS TABLE (
  chunk_id       uuid,
  document_id    uuid,
  doc_number     integer,
  document_title text,
  section_title  text,
  content        text,
  similarity     float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id                                               AS chunk_id,
    kc.document_id                                      AS document_id,
    kd.doc_number                                       AS doc_number,
    kd.title                                            AS document_title,
    kc.section_title                                    AS section_title,
    kc.content                                          AS content,
    (1 - (kc.embedding <=> query_embedding))::float     AS similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE
    (NOT filter_restricted OR kd.is_restricted = false)
    AND (1 - (kc.embedding <=> query_embedding)) > similarity_threshold
    AND (filter_layer IS NULL OR kd.layer = filter_layer)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Allow authenticated users and service_role to call this function
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(
  vector(1536), float, int, boolean, text
) TO authenticated, service_role;

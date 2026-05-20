# Behavior A-1 · Schema de Base de Conhecimento

> Parte da Fase A — Base de Conhecimento como RAG
> Dependências: nenhuma (primeiro behavior da fase)
> Bloqueia: A-2, A-3, A-4, A-5

---

## Contexto

Hoje os agentes Bia e Carlos têm persona hardcoded em `agent_configs.persona` (texto longo escrito direto na migration). A Base de Conhecimento existe como 11 arquivos `.md` em `docs/base-conhecimento/`, mas não há nenhuma tabela no Supabase que os armazene com embeddings. Atualizar um documento não atualiza os agentes.

Este behavior cria a fundação do sistema RAG: as tabelas `knowledge_documents` e `knowledge_chunks`.

---

## Behavior (Given / When / Then)

**Dado** que o sistema não tem tabelas de Base de Conhecimento
**Quando** Felipe aplica a migration `20260520_knowledge_base_schema.sql`
**Então** existem no schema `public`:

### Tabela `knowledge_documents`

```sql
public.knowledge_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number    int  NOT NULL,           -- 1 a 11 (Doc 01 a Doc 11)
  title         text NOT NULL,           -- "Identidade", "Glossário", etc.
  version       text NOT NULL,           -- "v1.0", "v2.0"
  layer         text NOT NULL            -- "estrategia" | "oferta" | "operacao"
                CHECK (layer IN ('estrategia','oferta','operacao')),
  is_restricted boolean NOT NULL DEFAULT false,  -- true = Doc 09
  full_content  text NOT NULL,           -- markdown completo
  metadata      jsonb NOT NULL DEFAULT '{}',     -- audiência, tags
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_number)
)
```

### Tabela `knowledge_chunks`

```sql
public.knowledge_chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index   int  NOT NULL,           -- ordem do chunk no documento
  section_title text,                   -- título da seção (ex: "Parte 3 - ROI por frente")
  content       text NOT NULL,
  embedding     vector(1536),           -- pgvector text-embedding-3-small
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
)
```

### Índices e extensões

```sql
-- Habilitar pgvector (se não habilitado)
CREATE EXTENSION IF NOT EXISTS vector;

-- Índice HNSW para busca semântica eficiente
CREATE INDEX knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Trigger para updated_at em knowledge_documents
CREATE OR REPLACE FUNCTION update_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_documents_updated_at();
```

### RLS

```sql
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks    ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ler documentos NÃO restritos
CREATE POLICY "knowledge_documents_read_non_restricted"
  ON knowledge_documents FOR SELECT
  USING (auth.role() = 'authenticated' AND is_restricted = false);

-- Admins leem tudo (incluindo Doc 09)
CREATE POLICY "knowledge_documents_admin_all"
  ON knowledge_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Chunks seguem a restrição do documento pai
CREATE POLICY "knowledge_chunks_read_non_restricted"
  ON knowledge_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_documents d
      WHERE d.id = document_id
        AND d.is_restricted = false
        AND auth.role() = 'authenticated'
    )
  );

CREATE POLICY "knowledge_chunks_admin_all"
  ON knowledge_chunks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypassa RLS (edge functions usam service_role)
-- (service_role não precisa de policy explícita — bypassa por padrão)
```

---

## Critérios de aceitação

- [ ] Migration executa sem erro em base limpa
- [ ] `CREATE EXTENSION IF NOT EXISTS vector` não falha se já habilitado
- [ ] Índice HNSW criado em `knowledge_chunks.embedding`
- [ ] RLS habilitada em ambas as tabelas
- [ ] Doc 09 (`is_restricted = true`) NUNCA retornado por policy de usuário autenticado
- [ ] Service role (edge functions) acessa tudo sem restrição
- [ ] Trigger `updated_at` dispara em UPDATE de `knowledge_documents`
- [ ] Constraint `UNIQUE(doc_number)` impede duplicação de documento

---

## Arquivo a criar

```
supabase/migrations/20260520_knowledge_base_schema.sql
```

---

## Decisões técnicas (já tomadas — não questionar)

- **Embedding:** `vector(1536)` — dimensão do `text-embedding-3-small` da OpenAI
- **Índice:** HNSW com `vector_cosine_ops` (similaridade por cosseno)
- **Restrição Doc 09:** `is_restricted = true` — nunca exposto a agente
- **Layer values:** `estrategia` | `oferta` | `operacao` (mapeamento dos docs)
  - estrategia: Docs 01, 02
  - oferta: Docs 03, 04, 05, 06, 07, 08, 09
  - operacao: Docs 10, 11

---

## Mapeamento inicial dos 11 documentos

| doc_number | title | layer | is_restricted |
|---|---|---|---|
| 1 | Identidade | estrategia | false |
| 2 | Glossário | estrategia | false |
| 3 | Frentes Comerciais | oferta | false |
| 4 | Pilares Técnicos | oferta | false |
| 5 | Portfólio | oferta | false |
| 6 | Taxonomia ROI | oferta | false |
| 7 | Objeções Comerciais | oferta | false |
| 8 | Playbook Comercial | oferta | false |
| **9** | **Precificação Interna** | oferta | **true** |
| 10 | Processo de Entrega | operacao | false |
| 11 | Renovação e Retenção | operacao | false |

---

*Behavior A-1 · IntelliX Squad Hub · Fase A · Maio 2026*

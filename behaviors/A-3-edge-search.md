# Behavior A-3 · Edge Function de Busca Semântica

> Parte da Fase A — Base de Conhecimento como RAG
> Dependências: A-1 (schema), A-2 (dados ingestados)
> Bloqueia: A-4 (agentes chamam este endpoint)

---

## Contexto

Com os documentos ingestados (A-2), o próximo passo é permitir que os agentes consultem a Base de Conhecimento via busca semântica. A busca deve:
- Receber uma pergunta em linguagem natural
- Embedar a pergunta com o mesmo modelo usado na ingestion
- Buscar os chunks mais similares via pgvector (cosine similarity)
- Filtrar chunks de documentos restritos para agentes não-admin
- Retornar os top-K chunks com metadados de contexto

Este behavior implementa a edge function `knowledge-search`.

---

## Behavior (Given / When / Then)

**Dado** que chunks foram ingestados (A-2) e a edge function está deployada
**Quando** um agente chama `POST /functions/v1/knowledge-search` com:
```json
{
  "query": "Qual é o processo de entrega da IntelliX?",
  "agent_id": "uuid-da-bia",
  "top_k": 5
}
```
**Então** o sistema:
1. Valida o payload com Zod
2. Embeda a query via OpenAI `text-embedding-3-small`
3. Busca top-K chunks por similaridade de cosseno no pgvector
4. Filtra automaticamente chunks de documentos `is_restricted = true` (via RLS ou query explícita)
5. Retorna array de chunks com score de similaridade

**E quando** o `agent_id` é de um agente (não admin):
**Então** chunks do Doc 09 (Precificação Interna) **NUNCA** aparecem no resultado

**E quando** Felipe (admin) chama diretamente:
**Então** todos os documentos são retornados, incluindo Doc 09

---

## Interface da edge function

### Endpoint
`POST /functions/v1/knowledge-search`

### Autenticação
`Authorization: Bearer <SUPABASE_ANON_KEY>` com `apikey` header
(ou service_role para admin — ambos funcionam)

### Request body (Zod schema)

```typescript
const SearchRequestSchema = z.object({
  query:    z.string().min(3).max(1000),
  agent_id: z.string().uuid().optional(),   // se omitido, trata como não-admin
  top_k:    z.number().int().min(1).max(10).default(5),
  layer:    z.enum(['estrategia', 'oferta', 'operacao']).optional(), // filtro opcional
})
```

### Response body (sucesso)

```json
{
  "success": true,
  "query": "Qual é o processo de entrega da IntelliX?",
  "results": [
    {
      "chunk_id": "uuid",
      "document_id": "uuid",
      "doc_number": 10,
      "document_title": "Processo de Entrega",
      "section_title": "2. Fases do Projeto",
      "content": "...",
      "similarity": 0.91
    }
  ],
  "total_results": 3,
  "elapsed_ms": 180
}
```

### Response body (nenhum resultado relevante)

```json
{
  "success": true,
  "query": "...",
  "results": [],
  "total_results": 0,
  "elapsed_ms": 120
}
```

---

## Query SQL de busca semântica

```sql
SELECT
  kc.id          AS chunk_id,
  kc.document_id,
  kd.doc_number,
  kd.title       AS document_title,
  kc.section_title,
  kc.content,
  1 - (kc.embedding <=> $1::vector) AS similarity
FROM knowledge_chunks kc
JOIN knowledge_documents kd ON kd.id = kc.document_id
WHERE
  kd.is_restricted = false   -- agentes nunca veem Doc 09
  AND 1 - (kc.embedding <=> $1::vector) > 0.70  -- threshold mínimo de relevância
  -- filtro opcional de layer:
  -- AND kd.layer = $3
ORDER BY kc.embedding <=> $1::vector  -- menor distância = mais similar
LIMIT $2;  -- top_k
```

**Nota:** A query usa o operador `<=>` (distância de cosseno do pgvector). `1 - distância` = similaridade (0 a 1). Threshold padrão: 0.70.

---

## Lógica de acesso ao Doc 09 para admin

```typescript
// Se chamado com service_role key OU se user tem role=admin,
// remover o filtro is_restricted = false
const isAdmin = await checkIsAdmin(req, supabase)

const query = isAdmin
  ? SQL_SEARCH_ALL        // sem filtro de restricted
  : SQL_SEARCH_FILTERED   // com is_restricted = false
```

---

## Critérios de aceitação

- [ ] Query com pergunta relevante → retorna até `top_k` chunks com `similarity >= 0.70`
- [ ] Chunks do Doc 09 **nunca** retornados para chamada de agente não-admin
- [ ] Chamada de admin (service_role) → Doc 09 pode ser retornado se relevante
- [ ] Query sem resultados relevantes (similarity < 0.70) → `results: []`, não erro
- [ ] Latência p95 < 500ms (incluindo chamada de embedding)
- [ ] Campo `similarity` entre 0 e 1 no response
- [ ] Payload inválido → 400 com erro Zod
- [ ] Sem autenticação → 401

---

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| OpenAI API indisponível (embedding da query) | 503 com mensagem, não retorna resultados parciais |
| Nenhum chunk ingestado ainda | `results: []` (não erro) |
| `top_k` maior que chunks disponíveis | Retorna o que tiver (sem erro) |
| query muito curta (< 3 chars) | Zod retorna 400 |

---

## Arquivo a criar

```
supabase/functions/knowledge-search/index.ts
```

---

## Decisões técnicas (já tomadas)

- **Modelo de embedding:** `text-embedding-3-small` · 1536 dimensões (mesmo da ingestion)
- **Métrica:** similaridade de cosseno (`<=>` do pgvector)
- **Threshold:** 0.70 de similaridade mínima
- **Top-K padrão:** 5 chunks
- **Doc 09:** filtrado por padrão para não-admins

---

*Behavior A-3 · IntelliX Squad Hub · Fase A · Maio 2026*

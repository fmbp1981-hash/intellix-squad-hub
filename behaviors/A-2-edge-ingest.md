# Behavior A-2 · Edge Function de Ingestion

> Parte da Fase A — Base de Conhecimento como RAG
> Dependências: A-1 (tabelas devem existir)
> Bloqueia: A-3, A-4 (busca só funciona depois da ingestion)

---

## Contexto

Os 11 documentos da Base de Conhecimento existem como arquivos `.md` em `docs/base-conhecimento/`. Para que os agentes possam consultá-los via RAG, eles precisam ser:
1. Carregados no banco em `knowledge_documents`
2. Divididos em chunks de ~500-800 tokens
3. Transformados em embeddings via OpenAI `text-embedding-3-small`
4. Salvos em `knowledge_chunks` com o vetor correspondente

Este behavior implementa a edge function `knowledge-ingest` que executa esse pipeline.

---

## Behavior (Given / When / Then)

**Dado** que o schema A-1 está aplicado e os documentos `.md` existem no repo
**Quando** Felipe chama `POST /functions/v1/knowledge-ingest` com payload:
```json
{
  "doc_number": 1,
  "content": "<markdown completo do documento>",
  "title": "Identidade",
  "version": "v1.0",
  "layer": "estrategia",
  "is_restricted": false,
  "metadata": { "audience": ["todos"] }
}
```
**Então** o sistema:
1. Faz upsert em `knowledge_documents` pelo `doc_number`
2. Deleta todos os `knowledge_chunks` antigos do documento (via CASCADE ou DELETE explícito)
3. Divide o conteúdo em chunks respeitando seções markdown
4. Para cada chunk: gera embedding via OpenAI API
5. Insere todos os chunks em `knowledge_chunks`
6. Retorna JSON com estatísticas da ingestion

**E quando** Felipe chama com `"doc_number": 9` (Precificação Interna):
**Então** o sistema processa normalmente, mas `is_restricted = true` é aplicado —
o documento é ingestado mas a policy de RLS garante que agentes não o vejam na busca.

---

## Interface da edge function

### Endpoint
`POST /functions/v1/knowledge-ingest`

### Autenticação
`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (apenas admin/sistema chama)

### Request body (Zod schema)

```typescript
const IngestRequestSchema = z.object({
  doc_number:    z.number().int().min(1).max(11),
  content:       z.string().min(100),
  title:         z.string().min(1),
  version:       z.string().default('v1.0'),
  layer:         z.enum(['estrategia', 'oferta', 'operacao']),
  is_restricted: z.boolean().default(false),
  metadata:      z.record(z.unknown()).default({}),
})
```

### Response body (sucesso)

```json
{
  "success": true,
  "doc_number": 1,
  "title": "Identidade",
  "chunks_deleted": 12,
  "chunks_created": 14,
  "elapsed_ms": 4200
}
```

### Response body (erro)

```json
{
  "success": false,
  "error": "mensagem descritiva"
}
```

---

## Algoritmo de chunking

### Estratégia: divisão por seções markdown com overlap

```
1. Dividir documento por headings (## e ###)
2. Para cada seção:
   a. Se <= 800 tokens: chunk único
   b. Se > 800 tokens: dividir em sub-chunks de ~600 tokens
      com overlap de ~100 tokens entre sub-chunks adjacentes
3. Seções pequenas (< 50 tokens): fundir com próxima seção
4. Preservar section_title para cada chunk (heading pai)
```

### Estimativa de tokens
Usar contagem aproximada: `Math.ceil(content.length / 4)` para estimar tokens antes de embedar. Implementação simples — não depende de biblioteca externa de tokenização.

### Exemplo de chunking do Doc 01 (Identidade)

```
Seção "## 1. Quem é a IntelliX.AI" → chunk_index=0, section_title="1. Quem é a IntelliX.AI"
Seção "## 2. Posicionamento" → chunk_index=1, section_title="2. Posicionamento"
Seção "## 3. Missão, Visão e Valores" → chunk_index=2, section_title="3. Missão, Visão e Valores"
...
```

---

## Geração de embeddings

```typescript
// Chamar OpenAI via Lovable AI Gateway
const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'text-embedding-3-small',
    input: chunkTexts,   // array de strings (batch de até 100 chunks)
    dimensions: 1536,
  }),
})
```

**Batching:** enviar até 100 chunks por chamada à API de embeddings para eficiência.

---

## Critérios de aceitação

- [ ] Chama com `doc_number` válido → upsert em `knowledge_documents` + delete + reinsert chunks
- [ ] Chamada idempotente: rodar 2x com mesmo payload → resultado igual (chunks_deleted = chunks_created da 1ª chamada)
- [ ] Doc 09 com `is_restricted: true` → é ingestado, `is_restricted = true` persiste no banco
- [ ] Chunks gerados respeitam tamanho 500-800 tokens (verificável via `content.length`)
- [ ] Todos os chunks têm `embedding` não-nulo após ingestion
- [ ] Resposta inclui `chunks_created` e `elapsed_ms`
- [ ] Erro de autenticação (sem service_role) retorna 401
- [ ] Payload inválido retorna 400 com mensagem do Zod

---

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| OpenAI API indisponível | Retorna 503, não persiste chunks parciais (transação) |
| Chunk sem conteúdo | Ignorado silenciosamente (não inserido) |
| doc_number fora do range 1-11 | Zod retorna 400 antes de processar |
| `is_restricted` não enviado | Default `false` (Zod) |
| Timeout Deno (>30s) | Deno edge function tem limite; batching de embeddings mitiga |

---

## Arquivo a criar

```
supabase/functions/knowledge-ingest/index.ts
```

### Estrutura interna da função

```
knowledge-ingest/
  index.ts          ← handler principal
  _shared/          ← reusar cors.ts e auth.ts já existentes no projeto
```

---

## Decisões técnicas (já tomadas)

- **Modelo de embedding:** `text-embedding-3-small` · 1536 dimensões
- **Chunk size:** 500-800 tokens · overlap ~100 tokens
- **Respeitar seções markdown:** sim, via split em headings
- **Reembedding:** idempotente (deleta chunks antigos, recria)
- **Doc 09:** `is_restricted = true` — ingestado mas não exposto a agentes

---

*Behavior A-2 · IntelliX Squad Hub · Fase A · Maio 2026*

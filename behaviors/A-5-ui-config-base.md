# Behavior A-5 · UI de Gestão da Base de Conhecimento em /config

> Parte da Fase A — Base de Conhecimento como RAG
> Dependências: A-1 (schema), A-2 (edge ingest), A-3 (edge search)
> Bloqueia: nada (último behavior da Fase A — camada de UI)

---

## Contexto

Após A-1/A-2/A-3 funcionarem, Felipe precisa de uma interface para:
- Ver o estado atual de cada documento (ingestado? quantos chunks? qual versão?)
- Reingerir um documento específico após atualizar o `.md`
- Confirmar que a Base está funcionando antes de confiar nos agentes

A interface entra como nova tab **"Base de Conhecimento"** em `/config` (conforme P2 — novas configurações entram em `/config`, não em nova rota).

---

## Behavior (Given / When / Then)

**Dado** que Felipe acessa `/config`
**Quando** ele clica na tab "Base de Conhecimento"
**Então** vê uma lista dos 11 documentos com:
- Número (Doc 01 a Doc 11)
- Título
- Versão atual
- Data da última ingestion
- Número de chunks
- Badge de status: `Ingestado` (verde) | `Pendente` (amarelo) | `Restrito` (cinza)

**E quando** ele clica em "Reingerir" em um documento:
**Então** um dialog de confirmação aparece com:
- Nome do documento
- Aviso: "Isso irá apagar os chunks atuais e criar novos."
- Botão confirmar que dispara `POST /functions/v1/knowledge-ingest`
- Loading state durante a operação
- Toast de sucesso com `chunks_created` ao finalizar

**E quando** ele clica em "Reingerir tudo":
**Então** um dialog de confirmação aparece e, ao confirmar:
- Processa docs em sequência (não paralelo — evita rate limit da OpenAI)
- Exibe progress bar por documento
- Toast final com resumo total

---

## Componente principal

### Arquivo a criar
```
src/pages/config/KnowledgeBaseTab.tsx
```

### Arquivo a criar (hook)
```
src/hooks/useKnowledgeBase.ts
```

---

## Estrutura do componente

```tsx
// KnowledgeBaseTab.tsx
export function KnowledgeBaseTab() {
  const { documents, isLoading, reingest, reingestAll } = useKnowledgeBase()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3>Base de Conhecimento</h3>
          <p className="text-muted-foreground text-sm">
            {N} documentos · {totalChunks} trechos indexados
          </p>
        </div>
        <Button variant="outline" onClick={() => setReingestAllDialog(true)}>
          Reingerir tudo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doc</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Versão</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead>Última ingestion</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map(doc => (
            <DocumentRow key={doc.doc_number} doc={doc} onReingest={reingest} />
          ))}
        </TableBody>
      </Table>

      <ReingestAllDialog ... />
    </div>
  )
}
```

---

## Hook `useKnowledgeBase`

```typescript
// src/hooks/useKnowledgeBase.ts

interface KnowledgeDocumentStatus {
  doc_number:    number
  title:         string
  version:       string
  is_restricted: boolean
  chunk_count:   number
  last_ingested: string | null   // ISO date ou null se nunca ingestado
  status:        'ingestado' | 'pendente' | 'restrito'
}

export function useKnowledgeBase() {
  // Query: join knowledge_documents + count(knowledge_chunks)
  // Compara com lista estática dos 11 docs para mostrar "pendente"
  // se doc ainda não foi ingestado
}
```

### Query Supabase para o hook

```typescript
const { data } = await supabase
  .from('knowledge_documents')
  .select(`
    doc_number,
    title,
    version,
    is_restricted,
    updated_at,
    knowledge_chunks(count)
  `)
  .order('doc_number')
```

---

## Mapa estático dos 11 documentos (para mostrar "pendente")

O hook deve manter uma lista estática dos 11 docs esperados. Documentos que existem no banco aparecem como "ingestado"; documentos que estão no estático mas não no banco aparecem como "pendente".

```typescript
const EXPECTED_DOCS = [
  { doc_number: 1,  title: 'Identidade',            is_restricted: false },
  { doc_number: 2,  title: 'Glossário',              is_restricted: false },
  { doc_number: 3,  title: 'Frentes Comerciais',     is_restricted: false },
  { doc_number: 4,  title: 'Pilares Técnicos',       is_restricted: false },
  { doc_number: 5,  title: 'Portfólio',              is_restricted: false },
  { doc_number: 6,  title: 'Taxonomia ROI',          is_restricted: false },
  { doc_number: 7,  title: 'Objeções Comerciais',    is_restricted: false },
  { doc_number: 8,  title: 'Playbook Comercial',     is_restricted: false },
  { doc_number: 9,  title: 'Precificação Interna',   is_restricted: true  },
  { doc_number: 10, title: 'Processo de Entrega',    is_restricted: false },
  { doc_number: 11, title: 'Renovação e Retenção',   is_restricted: false },
]
```

---

## Integração na `ConfigPage`

`ConfigPage` já existe em `src/pages/config/`. A nova tab entra como item no array de tabs:

```tsx
// Adicionar em ConfigPage.tsx (verificar linha de tabs existente)
{ value: 'base', label: 'Base de Conhecimento', component: <KnowledgeBaseTab /> }
```

---

## UI de reingestão de documento único

```tsx
function DocumentRow({ doc, onReingest }) {
  const [dialog, setDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReingest() {
    setLoading(true)
    try {
      // Lê o conteúdo do doc (armazenado em knowledge_documents.full_content)
      // OU Felipe informa o conteúdo via textarea no dialog (MVP)
      await onReingest(doc.doc_number)
      toast.success(`Doc ${doc.doc_number} reingerido com sucesso`)
    } finally {
      setLoading(false)
      setDialog(false)
    }
  }

  return (
    <TableRow>
      <TableCell>Doc {String(doc.doc_number).padStart(2,'0')}</TableCell>
      <TableCell>{doc.title}</TableCell>
      <TableCell>{doc.version}</TableCell>
      <TableCell>{doc.chunk_count ?? 0}</TableCell>
      <TableCell>{doc.last_ingested ? formatDate(doc.last_ingested) : '—'}</TableCell>
      <TableCell><StatusBadge status={doc.status} /></TableCell>
      <TableCell>
        <Button size="sm" variant="ghost" onClick={() => setDialog(true)}
          disabled={doc.is_restricted}>
          Reingerir
        </Button>
      </TableCell>
    </TableRow>
  )
}
```

**Nota sobre Doc 09:** botão "Reingerir" desabilitado via UI (Felipe gerencia manualmente via service_role se necessário). A restrição de acesso é garantida pela RLS; a desabilitação na UI é apenas UX.

---

## Critérios de aceitação

- [ ] Tab "Base de Conhecimento" aparece em `/config` (somente para role=admin)
- [ ] Lista todos os 11 documentos (mesmo os ainda não ingestados, como "pendente")
- [ ] Doc 09 mostra badge "Restrito" e botão "Reingerir" desabilitado
- [ ] Clicar "Reingerir" abre dialog de confirmação
- [ ] Ao confirmar, dispara `knowledge-ingest` e mostra loading
- [ ] Toast de sucesso com número de chunks criados
- [ ] "Reingerir tudo" processa docs em sequência (não paralelo)
- [ ] Tab visível apenas para admin (usar `useIsAdmin` hook existente)

---

## Decisões técnicas

- **Tab em /config** (não nova rota) — segue P2 (Settings → Config)
- **Visível apenas para admin** — `useIsAdmin` hook já existe
- **Reingestão via UI** usa `full_content` já armazenado no banco (não relê o arquivo)
- **Doc 09 desabilitado na UI** (dupla proteção além da RLS)
- **Sem edição inline** — conteúdo sempre vem do arquivo `.md` via ingestion

---

*Behavior A-5 · IntelliX Squad Hub · Fase A · Maio 2026*

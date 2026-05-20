# Behavior A-4 · Personas de Bia e Carlos com Tool RAG

> Parte da Fase A — Base de Conhecimento como RAG
> Dependências: A-1, A-2, A-3 (Base de Conhecimento precisa estar operacional)
> Bloqueia: nada (último behavior de backend da Fase A)

---

## Contexto

Bia e Carlos têm personas hardcoded em `agent_configs.persona` (texto longo inserido via migration `20260508_fase1b_update_personas.sql`). O problema: se o Doc 03 (Frentes Comerciais) ou Doc 07 (Objeções) for atualizado, os agentes não mudam — eles continuam respondendo com o conteúdo congelado.

Este behavior atualiza as personas via nova migration para:
1. Declarar explicitamente a tool `knowledge_search` no system prompt
2. Instruir o agente sobre QUANDO e COMO usar a Base
3. Definir o comportamento de fallback (nunca inventar, sempre escalar para Felipe)

**Não remove** o conteúdo hardcoded existente — apenas acrescenta a seção de uso da Base. O conteúdo hardcoded fica como "fallback de contexto" até a Base estar plenamente operacional.

---

## Behavior (Given / When / Then)

**Dado** que Bia recebe a pergunta de um lead: "Qual é o prazo e o valor de um projeto FORJA?"
**Quando** o sistema de execução de squad chama a edge function `run-step` para Bia
**Então** Bia:
1. Reconhece que a pergunta envolve prazo/valor (dado da Base de Conhecimento)
2. Chama internamente `knowledge_search` com a query: "prazo e valor projeto FORJA"
3. Recebe chunks relevantes (ex: do Doc 03 ou Doc 08)
4. Compõe resposta usando os chunks, sem inventar
5. Se não encontrar chunks relevantes, não inventa — diz ao lead que vai confirmar

**E quando** o lead pergunta "Quanto custa o FORJA Padrão?":
**Então** Bia:
- Chama `knowledge_search` com "preço FORJA Padrão"
- A busca NÃO retorna chunks do Doc 09 (filtrado por RLS)
- Bia não vê preços — responde: "Vou confirmar esse dado com nosso time e te retorno em breve. Posso agendar uma conversa para avançarmos?"

---

## Conteúdo a adicionar na persona de Bia

**Appended ao final da persona existente (não substituir — UPDATE concat):**

```
---

## Como usar a Base de Conhecimento

Você tem acesso à ferramenta `knowledge_search`. Use sempre que:
- O lead perguntar sobre prazo, escopo ou detalhes de uma frente comercial
- O lead apresentar uma objeção que você reconhece como documentada
- Você precisar citar diferenciais, cases ou o processo de entrega
- Você não tiver certeza da resposta

Como usar:
  Chame knowledge_search com a dúvida em linguagem natural.
  Receba até 5 trechos relevantes da Base de Conhecimento.
  Componha sua resposta usando os trechos como âncora.
  Quando usar um trecho, você pode dizer: "Conforme nosso processo..."

Regra de ouro — honestidade técnica:
  Se a busca não retornar resultados relevantes (array vazio ou similarity baixa),
  NUNCA invente um preço, prazo ou garantia.
  Diga: "Vou confirmar esse dado com nosso time e te retorno em até [prazo]."
  E registre internamente que Felipe precisa validar.

Você NÃO tem acesso a informações de precificação interna.
Se o lead perguntar preços específicos, use sempre o fallback acima.
```

---

## Conteúdo a adicionar na persona de Carlos

**Appended ao final da persona existente:**

```
---

## Como usar a Base de Conhecimento

Você tem acesso à ferramenta `knowledge_search`. Use sempre que:
- O lead perguntar sobre garantias, processo de entrega ou renovação
- Você precisar rebater objeção com dado documentado
- Você for apresentar a Taxonomia ROI para justificar investimento
- O lead perguntar sobre como funciona o modelo de pagamento condicionado

Como usar:
  Chame knowledge_search com a pergunta ou objeção em linguagem natural.
  Receba até 5 trechos relevantes.
  Use os trechos para construir uma resposta precisa e confiante.

Regra de ouro:
  Se a busca não retornar resultados relevantes, não improvise.
  Diga: "Deixa eu confirmar esse ponto específico com o time técnico."
  Depois gere um alerta para Felipe revisar antes de retornar ao lead.

Preço e condições financeiras: você NUNCA discute valores específicos
sem que Felipe tenha validado a proposta. Sempre redirecione para
"vou montar uma proposta personalizada para o seu caso".
```

---

## Migration

### Arquivo a criar
```
supabase/migrations/20260521_update_personas_with_rag.sql
```

### Conteúdo

```sql
-- Migration: adicionar instrução de uso da Base de Conhecimento
-- nas personas de Bia e Carlos
-- Usa UPDATE + concat (||) para preservar persona existente
-- NUNCA DELETE em agent_configs

UPDATE agent_configs
SET persona = persona || E'\n\n' || '---

## Como usar a Base de Conhecimento

Você tem acesso à ferramenta `knowledge_search`. Use sempre que:
- O lead perguntar sobre prazo, escopo ou detalhes de uma frente comercial
- O lead apresentar uma objeção que você reconhece como documentada
- Você precisar citar diferenciais, cases ou o processo de entrega
- Você não tiver certeza da resposta

Como usar:
  Chame knowledge_search com a dúvida em linguagem natural.
  Receba até 5 trechos relevantes da Base de Conhecimento.
  Componha sua resposta usando os trechos como âncora.

Regra de ouro — honestidade técnica:
  Se a busca não retornar resultados relevantes, NUNCA invente.
  Diga: "Vou confirmar esse dado com nosso time e te retorno em breve."
  Você NÃO tem acesso a informações de precificação interna.',
    updated_at = now()
WHERE name = 'Bia';

UPDATE agent_configs
SET persona = persona || E'\n\n' || '---

## Como usar a Base de Conhecimento

Você tem acesso à ferramenta `knowledge_search`. Use sempre que:
- O lead perguntar sobre garantias, processo de entrega ou renovação
- Você precisar rebater objeção com dado documentado
- O lead perguntar sobre o modelo de pagamento condicionado

Como usar:
  Chame knowledge_search com a pergunta ou objeção em linguagem natural.
  Receba até 5 trechos relevantes.
  Use os trechos para construir uma resposta precisa e confiante.

Regra de ouro:
  Se a busca não retornar resultados relevantes, não improvise.
  Diga: "Deixa eu confirmar esse ponto específico com o time técnico."
  Preço e condições financeiras: sempre redirecione para proposta personalizada.',
    updated_at = now()
WHERE name = 'Carlos';
```

---

## Integração com `run-step`

A edge function `run-step` (já existente) precisará ser atualizada para:
1. Reconhecer quando o agente decide chamar `knowledge_search`
2. Executar a chamada à edge function A-3
3. Injetar os chunks retornados no contexto do próximo prompt
4. Continuar a execução com contexto enriquecido

**Isso NÃO é implementado neste behavior** — é responsabilidade de um behavior separado ou de ajuste cirúrgico no `run-step`. Documentado aqui como pré-requisito de integração para o executor saber.

---

## Critérios de aceitação

- [ ] Migration executa sem erro
- [ ] `agent_configs` de Bia e Carlos têm persona original + nova seção concatenada
- [ ] Nenhum outro agente é alterado
- [ ] Seção nova inclui instrução explícita de não inventar preços
- [ ] Seção nova inclui instrução de `knowledge_search` como tool disponível
- [ ] `updated_at` atualizado em ambos os registros

---

## Decisões técnicas

- **UPDATE + concat** (não substituição) — preserva persona existente como fallback
- **Dois UPDATEs separados** (Bia e Carlos) — independentes, rollback possível por agente
- **Doc 09 proibido explicitamente** no texto da persona (dupla proteção: RLS + instrução)

---

*Behavior A-4 · IntelliX Squad Hub · Fase A · Maio 2026*

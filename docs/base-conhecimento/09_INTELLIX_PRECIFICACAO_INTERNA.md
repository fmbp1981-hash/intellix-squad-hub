# 09 · IntelliX.AI — Precificação Interna

> **Documento da Base de Conhecimento — Camada 3 (Operação)**
> Composição de custos, margem, fórmulas de cálculo automático e estrutura de descontos
> Versão 1.3 · Maio 2026
>
> ⚠️ **DOCUMENTO ESTRITAMENTE INTERNO — Acesso exclusivo: Felipe Maranhão**
> Agentes de IA (Bia, Carlos, Ágata, Téo, Maya) **não têm acesso** a este documento.
> Não compartilhar com clientes, leads ou parceiros.

---

## Por que este documento existe

Decisões de preço tomadas na intuição ou na pressão de fechamento custam margem, desvalorizam o posicionamento e criam precedentes que se acumulam. Este documento é a régua objetiva para:

- Calcular o custo real de cada entrega antes de propor
- Saber até onde dá para negociar sem comprometer a operação
- Identificar quando um projeto não é viável economicamente
- Estruturar descontos e pacotes promocionais com critério, não improviso

**Regra geral de margem IntelliX:** margem mínima de **30%** sobre custo total em qualquer produto.

---

## Parte 1 — Base de Custo

### 1.1 — Hora de trabalho de Felipe (HH)

| Fase | HH base | Condição de revisão |
|---|---|---|
| **Atual** | **R$ 180/h** | Fase de estruturação (portfólio em construção) |
| **Próxima fase** | **R$ 220/h** | Após 3 projetos FORJA pagos e entregues com KPIs atingidos |
| **Meta 12-18 meses** | **R$ 280/h** | Ao atingir portfólio sólido + 5 cases documentados |

**Regra:** o HH é o custo de referência para todos os cálculos. Nunca propor projeto cujo preço implique HH efetivo abaixo de R$ 150/h.

**HH efetivo** = preço total recebido ÷ horas totais gastas no projeto (incluindo reuniões, revisões e suporte).

### 1.2 — Custos fixos mensais de infraestrutura

| Item | Custo/mês |
|---|---|
| Claude Max 5x (Anthropic) | R$ 500 |
| Google One Pro | R$ 96 |
| ChatGPT Go (OpenAI) | R$ 39 |
| Hetzner VPS CX22 (n8n + Evolution API) | R$ 60 |
| Lovable Pro | R$ 250 |
| Domínios | R$ 30 |
| Supabase (FREE atual) | R$ 0 |
| Vercel (FREE atual) | R$ 0 |
| **Total fixo mensal** | **R$ 975/mês** |

**Escalabilidade:**
- Supabase Pro (quando escalar): + R$ 125/mês
- Vercel Pro (quando escalar): + R$ 100/mês
- Total projetado pós-escala: R$ 1.200/mês

**Rateio por projeto:** para projetos com duração acima de 30 dias, considerar R$ 200-300/mês de custo de infraestrutura proporcional na composição da proposta.

### 1.3 — Custo de LLM por projeto

**Regra:** custo de LLM (tokens, chamadas de API) em projetos de cliente é **custo do cliente**, não da IntelliX.

**Como estruturar no contrato:**
- Projeto é entregue conectado à API do cliente ou com instrução de como criar conta
- IntelliX não subsidia custo de LLM pós-entrega
- Durante o desenvolvimento: IntelliX usa seus próprios créditos (incluídos nos custos fixos acima)

**Exceção:** projetos Evolve que incluem operação ativa de agente IntelliX podem incluir custo de LLM nas mensalidades — avaliar caso a caso e ajustar o preço do plano.

### 1.4 — Custo de parceiro externo

Quando o projeto exige capacidade fora do core IntelliX (design especializado, desenvolvimento mobile, jurídico, etc.):

| Tipo de parceiro | Custo estimado | Como cobrar no projeto |
|---|---|---|
| Desenvolvedor pleno terceirizado | R$ 100-150/h | Incluir no custo + 20% de margem de coordenação |
| Designer UI/UX especializado | R$ 80-120/h | Idem |
| Consultor jurídico (contratos complexos) | R$ 300-500/h | Passar custo ao cliente com aviso prévio |
| Redator especializado (copy, marca) | R$ 80-150/h | Incluir no custo + 20% |

**Regra:** nunca absorver custo de parceiro sem repassar ao cliente.

---

## Parte 2 — Composição de Custo por Frente

### 2.1 — RADAR Express · Preço publicado: R$ 2.900

| Atividade | Horas estimadas |
|---|---|
| Reunião de diagnóstico com cliente | 1,5h |
| Análise e mapeamento de oportunidades | 6h |
| Redação do relatório executivo | 2,5h |
| Preparação da apresentação | 1h |
| Reunião de entrega + Q&A | 1h |
| **Total HH** | **12h** |

| Item | Valor |
|---|---|
| HH Felipe (12h × R$ 180) | R$ 2.160 |
| Infraestrutura proporcional | R$ 80 |
| **Custo total** | **R$ 2.240** |
| **Preço** | **R$ 2.900** |
| **Margem bruta** | **R$ 660 · 23%** |

**Observação estratégica:** margem abaixo de 30% é aceitável no RADAR Express porque é produto de entrada. Cada RADAR Express bem executado gera uma oportunidade de FORJA (ticket 5-8x maior).

---

### 2.2 — RADAR Diagnóstico · Preço: a partir de R$ 9.800

| Atividade | Horas estimadas |
|---|---|
| Reuniões de entrevista (3-5 stakeholders × 45min) | 3,5h |
| Análise por área (4 áreas × 2h) | 8h |
| Cruzamento e priorização de oportunidades | 4h |
| Roadmap de 12 meses | 5h |
| Relatório estratégico completo | 6h |
| Apresentação executiva | 3h |
| **Total HH** | **29,5h** |

| Faixa de preço | HH estimado | Custo HH | Infra | Custo total | Margem |
|---|---|---|---|---|---|
| R$ 9.800 (mínimo) | 29h | R$ 5.220 | R$ 150 | R$ 5.370 | **45%** |
| R$ 12.000 (médio) | 35h | R$ 6.300 | R$ 200 | R$ 6.500 | **46%** |
| R$ 18.000 (máximo) | 50h | R$ 9.000 | R$ 300 | R$ 9.300 | **48%** |

**Critérios para subir na faixa:**
- Acima de 3 áreas: + R$ 1.500 por área adicional
- Faturamento do cliente acima de R$ 5M: faixa R$ 14.000+
- Stakeholders acima de 5: + R$ 800 por entrevista adicional
- Deslocamento presencial fora de Recife: + custo de viagem

---

### 2.3 — RADAR Pulse · Preço publicado: R$ 990/mês

| Atividade | Horas/mês |
|---|---|
| Monitoramento de novidades do setor | 2h |
| Produção do relatório de 2 páginas | 1,5h |
| Preparação da reunião 30min | 0,5h |
| Reunião com cliente | 0,5h |
| **Total HH/mês** | **4,5h** |

| Item | Valor/mês |
|---|---|
| HH Felipe (4,5h × R$ 180) | R$ 810 |
| Infraestrutura proporcional | R$ 30 |
| **Custo total** | **R$ 840** |
| **Preço** | **R$ 990** |
| **Margem bruta** | **R$ 150 · 15%** |

**Observação estratégica:** margem baixa. Pulse é produto de relacionamento e funil — mantém o cliente quente. Não vender Pulse para lead sem histórico.

---

### 2.4 — FORJA MVP · Preço: a partir de R$ 14.000

| Fase | Atividade | Horas estimadas |
|---|---|---|
| Discovery | Briefing técnico aprofundado + arquitetura | 6h |
| Desenvolvimento | Agente principal | 20h |
| Desenvolvimento | Integrações (2 × 6h) | 12h |
| Validação | Testes, ajustes, correções | 6h |
| Entrega | Treinamento da equipe | 3h |
| Entrega | Documentação técnica + operacional | 4h |
| Suporte | Pós-entrega (60 dias) | 5h |
| **Total HH** | **56h** |

| Faixa de preço | HH | Custo HH | Infra | Custo total | Margem |
|---|---|---|---|---|---|
| R$ 14.000 (mínimo) | 55h | R$ 9.900 | R$ 300 | R$ 10.200 | **27%** |
| R$ 18.000 (médio) | 65h | R$ 11.700 | R$ 400 | R$ 12.100 | **33%** |
| R$ 22.000 (máximo) | 75h | R$ 13.500 | R$ 500 | R$ 14.000 | **36%** |

**Critérios para subir na faixa:**
- Integração com ERP/CRM customizado: + R$ 2.000-4.000
- Base de conhecimento extensa (>50 docs): + R$ 1.500
- Múltiplos canais (WhatsApp + web + e-mail): + R$ 2.000

---

### 2.5 — FORJA Solução Completa · Preço: sob consulta

| Fase | Atividade | Horas estimadas |
|---|---|---|
| Discovery | Briefing + arquitetura completa | 15h |
| Desenvolvimento | Agentes principais (3 × 20h) | 60h |
| Desenvolvimento | Sistema web (painel + backend) | 40h |
| Desenvolvimento | Integrações (4 × 8h) | 32h |
| Validação | Testes, ajustes, QA | 15h |
| Entrega | Treinamento | 8h |
| Entrega | Documentação | 10h |
| Suporte | Pós-entrega (60 dias) | 10h |
| **Total HH estimado** | **190h** |

| Faixa de preço | HH | Custo HH | Parceiro | Infra | Custo total | Margem |
|---|---|---|---|---|---|---|
| R$ 38.000 (mínimo) | 130h | R$ 23.400 | — | R$ 600 | R$ 24.000 | **37%** |
| R$ 55.000 (médio) | 170h | R$ 30.600 | R$ 6.000 | R$ 800 | R$ 37.400 | **32%** |
| R$ 80.000 (máximo) | 220h | R$ 39.600 | R$ 12.000 | R$ 1.200 | R$ 52.800 | **34%** |

**Fórmula rápida:**
```
Preço mínimo = (HH estimadas × R$ 180) ÷ 0,60
(÷ 0,60 embute margem 30% + buffer 15% de escopo oculto)
```

---

### 2.6 — FORJA Evolve · Preços publicados: R$ 1.500 / R$ 2.900 / R$ 4.900/mês

| Plano | Atividades | HH/mês | Custo HH | Infra | Custo total | Preço | Margem |
|---|---|---|---|---|---|---|---|
| **Basic R$ 1.500** | Monitoramento + 3h ajustes + reunião 30min | 5h | R$ 900 | R$ 50 | R$ 950 | R$ 1.500 | **37%** |
| **Standard R$ 2.900** | + 6h ajustes + 2h melhorias + reunião 1h | 10h | R$ 1.800 | R$ 100 | R$ 1.900 | R$ 2.900 | **34%** |
| **Premium R$ 4.900** | + 12h ajustes + 4h melhorias + integrações + relatório | 18h | R$ 3.240 | R$ 150 | R$ 3.390 | R$ 4.900 | **31%** |

**Hora avulsa:** R$ 220/h → margem R$ 40/h (18%) — uso ocasional.

**Gatilho de upgrade automático:**
- Basic → Standard: cliente gerou 2+ pedidos fora das 3h por 1 mês
- Standard → Premium: cliente gerou 2+ solicitações de integrações em 2 meses consecutivos

---

### 2.7 — TRILHA · Preços publicados: R$ 1.490 / R$ 2.490 / R$ 4.990/mês

| Plano | Sessões | HH total | Custo HH | Overhead | Custo | Preço | Margem |
|---|---|---|---|---|---|---|---|
| **Starter R$ 1.490** | 2 sessões 60min | 4h | R$ 720 | R$ 50 | R$ 770 | R$ 1.490 | **48%** |
| **Pro R$ 2.490** | 4 sessões 60min | 7h | R$ 1.260 | R$ 80 | R$ 1.340 | R$ 2.490 | **46%** |
| **Executive R$ 4.990** | 8 sessões + hotline | 14h | R$ 2.520 | R$ 100 | R$ 2.620 | R$ 4.990 | **47%** |

**TRILHA Squad:**

| Plano | HH/mês | Custo HH | Custo total | Preço | Margem |
|---|---|---|---|---|---|
| **Squad Starter R$ 1.990** | 5h | R$ 900 | R$ 960 | R$ 1.990 | **52%** |
| **Squad Pro R$ 3.490** | 9h | R$ 1.620 | R$ 1.700 | R$ 3.490 | **51%** |

**Observação:** TRILHA tem as melhores margens (sem infra relevante). Produto de maior eficiência operacional. Priorizar crescimento da carteira TRILHA como base do MRR.

---

### 2.8 — Virada Inteligente · Turma aberta · R$ 897-1.097

#### Estrutura de custo do espaço (Recife)

A IntelliX opera turmas abertas em espaços profissionais em Recife (formato similar ao usado pela Duma e outros operadores de cursos). A estrutura comercial padrão desses espaços é:

> **R$ 2.000 de consumação mínima por evento**, com o coffee break (2 momentos) **incluído** na consumação.

Ou seja: o pacote sala + coffee break é cobrado em valor fixo de R$ 2.000, independente do número exato de participantes (até o limite que o espaço comporta — geralmente 10-15 pessoas).

#### Composição de custo atualizada (base: 8 pessoas, R$ 1.097)

| Item | Custo |
|---|---|
| HH preparação (5h) | R$ 900 |
| HH execução (5h) | R$ 900 |
| Espaço + Coffee (consumação mínima) | R$ 2.000 |
| Material físico (8 kits × R$ 40) | R$ 320 |
| **Custo total da turma** | **R$ 4.120** |
| **Receita (8 × R$ 1.097)** | **R$ 8.776** |
| **Margem bruta** | **R$ 4.656 · 53%** |

**Por tamanho de turma:**

| Turma | Receita | Custo (variável: material) | Margem | Margem em % |
|---|---|---|---|---|
| 6 pessoas (mínimo) | R$ 6.582 | R$ 4.040 | R$ 2.542 | **39%** |
| 8 pessoas (ideal) | R$ 8.776 | R$ 4.120 | R$ 4.656 | **53%** |
| 10 pessoas (máximo) | R$ 10.970 | R$ 4.200 | R$ 6.770 | **62%** |

**Turma mista (4 pre-sell R$ 897 + 4 regular R$ 1.097):**
Receita R$ 7.976 · Custo R$ 4.120 · Margem R$ 3.856 · **48%** ✅

**Pior cenário aceitável (6 pessoas, 4 em pre-sell):**
Receita = (4 × R$ 897) + (2 × R$ 1.097) = R$ 5.782
Custo = R$ 4.040
Margem = R$ 1.742 · **30%** ✅ (no limite mínimo, mas viável)

#### Estratégia de volume — ganho na repetição

A premissa de operar 2-4 turmas por mês transforma a margem percentual menor em volume absoluto de receita relevante:

| Frequência mensal | Margem absoluta/mês (turma ideal 8 pessoas) | Carga horária estimada |
|---|---|---|
| 2 turmas/mês | R$ 9.312/mês | ~25h diretas + overhead |
| 3 turmas/mês | R$ 13.968/mês | ~37h diretas + overhead |
| 4 turmas/mês | R$ 18.624/mês | ~50h diretas + overhead |

**Viabilidade operacional de 4 turmas/mês:**

1 turma por semana (4 semanas) é um ritmo saudável. Ao consolidar o conteúdo padrão, a preparação cai de 5h para 2-3h por turma recorrente, liberando margem de tempo. Estimativa realista:

- 4 turmas × 10h média = 40h diretas em Virada turma
- Reuniões de venda, follow-up, marketing: ~15h
- **Total: ~55h/mês em Virada turma aberta**
- Capacidade de Felipe: ~160h/mês → sobram ~105h para FORJA, RADAR, TRILHA, gestão ✅

**Conclusão:** 4 turmas/mês é plenamente sustentável. Ganho de volume compensa a queda de margem percentual (53% vs 67% anterior) e cria receita recorrente previsível na base do MRR.

#### Sinais para revisão futura

| Gatilho | Ação |
|---|---|
| Espaço aumentar consumação para R$ 2.500+ | Reavaliar preço da turma (R$ 1.097 → R$ 1.197) ou trocar de espaço |
| Atingir 3 turmas/mês consistentemente por 2 meses | Avaliar contrato fixo com o espaço (possível desconto por volume) |
| Demanda exceder capacidade física do espaço (>10 pessoas frequentes) | Buscar espaço maior; ajustar preço se consumação subir |
| Turma de 6 pessoas (margem 39%) virar padrão | Subir preço de tabela ou aumentar inscrição mínima para 7 |

---

### 2.9 — Virada Inteligente In-Company · Preço: sob consulta

> ⚠️ **MUDANÇA EM RELAÇÃO À v1.0:**
> - Virada in-company **não tem mais preço base publicado** ("a partir de R$ 5.900" foi removido)
> - Preço é calculado automaticamente após o cliente preencher o formulário de solicitação
> - **Não há custo de locação de sala** — cliente sempre fornece o espaço em in-company
> - Valor de entrada revisado: R$ 4.200 (mais acessível para captura inicial)
>
> **Diferença vs. turma aberta:** na turma aberta a IntelliX arca com o espaço (R$ 2.000 consumação). No in-company a empresa cliente fornece o próprio espaço — daí a margem manter-se em ~45% mesmo com preço de entrada menor.
>
> **Exceção:** se em algum caso o cliente in-company pedir que a IntelliX cuide também do espaço externo (hotel, espaço de eventos), isso vira **cotação manual fora da fórmula** — não usar o cálculo automático.

#### Premissas de composição (sem sala)

| Item | Lógica de custo |
|---|---|
| HH preparação | Variável por nível de customização e tamanho da turma |
| HH execução | 5h fixos (4h evento + 1h logística no local) |
| Material físico | R$ 40 por pessoa |
| Coffee breaks | R$ 25 por pessoa **apenas se** cliente solicitar IntelliX organizar catering — opcional |
| Logística | R$ 0 em Recife · R$ 800-1.200 viagem regional NE · R$ 1.500-2.500 viagem nacional |
| Sala/espaço | **R$ 0 — cliente fornece sempre** |

#### Cenários de referência

**Cenário 1 — Recife · 10 pessoas · padrão (sem customização extra)**

| Item | Custo |
|---|---|
| HH preparação (5h) | R$ 900 |
| HH execução (5h) | R$ 900 |
| Material (10 × R$ 40) | R$ 400 |
| Coffee (cliente cuida) | R$ 0 |
| Logística | R$ 0 |
| **Custo total** | **R$ 2.200** |
| **Preço sugerido** | **R$ 4.200** |
| **Margem** | **48%** ✅ |

**Cenário 2 — Recife · 15 pessoas · customização média**

| Item | Custo |
|---|---|
| HH preparação (8h — customização do setor) | R$ 1.440 |
| HH execução (5h) | R$ 900 |
| Material (15 × R$ 40) | R$ 600 |
| Coffee (cliente cuida) | R$ 0 |
| Logística | R$ 0 |
| **Custo total** | **R$ 2.940** |
| **Preço sugerido** | **R$ 5.500** |
| **Margem** | **47%** ✅ |

**Cenário 3 — Viagem regional NE · 12 pessoas · customização média**

| Item | Custo |
|---|---|
| HH preparação (8h) | R$ 1.440 |
| HH execução (5h) | R$ 900 |
| Material (12 × R$ 40) | R$ 480 |
| Coffee (cliente cuida) | R$ 0 |
| Logística (passagem + hospedagem 1 noite + translado) | R$ 1.000 |
| **Custo total** | **R$ 3.820** |
| **Preço sugerido** | **R$ 6.900** |
| **Margem** | **45%** ✅ |

**Cenário 4 — Viagem nacional · 20 pessoas · customização alta**

| Item | Custo |
|---|---|
| HH preparação (12h — 100% customizado) | R$ 2.160 |
| HH execução (5h) | R$ 900 |
| Material (20 × R$ 40) | R$ 800 |
| Coffee (cliente cuida) | R$ 0 |
| Logística | R$ 2.200 |
| **Custo total** | **R$ 6.060** |
| **Preço sugerido** | **R$ 11.000** |
| **Margem** | **45%** ✅ |

**Valor mínimo aceitável (entrada de mercado):** R$ 4.200

---

#### Fórmula automática de cálculo (para o formulário)

```
═══════════════════════════════════════════════════════════════
  FÓRMULA — VIRADA IN-COMPANY (cálculo automático)
═══════════════════════════════════════════════════════════════

  ENTRADA (campos do formulário):
  ─────────────────────────────────────────
  N_PESSOAS         → 6 a 25 participantes
  LOCAL             → "recife" | "regional_ne" | "nacional"
  CUSTOMIZACAO      → "padrao" | "media" | "alta"
  COFFEE_INTELLIX   → true | false

  CÁLCULO INTERMEDIÁRIO:
  ─────────────────────────────────────────
  HH_PREP =
    SE CUSTOMIZACAO = "padrao":   5h
    SE CUSTOMIZACAO = "media":    8h
    SE CUSTOMIZACAO = "alta":     12h
    + 0,3h × MAX(0, N_PESSOAS - 10)

  HH_EXEC = 5h

  CUSTO_HH       = (HH_PREP + HH_EXEC) × R$ 180
  CUSTO_MATERIAL = N_PESSOAS × R$ 40
  CUSTO_COFFEE   = SE COFFEE_INTELLIX: N_PESSOAS × R$ 25; SE NÃO: 0
  CUSTO_LOGIST   = SE recife: 0; SE regional_ne: R$ 1.000; SE nacional: R$ 2.200

  CUSTO_TOTAL = CUSTO_HH + CUSTO_MATERIAL + CUSTO_COFFEE + CUSTO_LOGIST

  PREÇO FINAL:
  ─────────────────────────────────────────
  PRECO = CUSTO_TOTAL ÷ 0,55     // margem ~45%

  Arredondar para múltiplo de R$ 100 (para cima).

  VALIDAÇÕES:
  ─────────────────────────────────────────
  SE PRECO < R$ 4.200:  forçar R$ 4.200 (piso de mercado)
  SE N_PESSOAS < 6:     rejeitar — turma mínima é 6
  SE N_PESSOAS > 25:    sinalizar — exige avaliação manual

═══════════════════════════════════════════════════════════════
```

#### Campos do formulário de solicitação

| Campo | Tipo | Obrigatório? |
|---|---|---|
| Nome do solicitante | Texto | ✅ |
| Empresa | Texto | ✅ |
| Cargo | Texto | ✅ |
| WhatsApp/E-mail | Contato | ✅ |
| Cidade do evento | Dropdown (Recife / Outra cidade NE / Outra cidade Brasil) | ✅ |
| Número de participantes | Numérico (6 a 25) | ✅ |
| Setor da empresa | Dropdown | ✅ |
| Nível de customização desejado | Padrão · Customizado para o setor · 100% sob medida | ✅ |
| Quem cuida do coffee break? | Cliente fornece · IntelliX organiza | ✅ |
| Data desejada | 3 sugestões de data | ❌ |
| Observações | Texto livre | ❌ |

**Fluxo:**
1. Cliente preenche e envia
2. Sistema calcula o preço pela fórmula
3. Felipe recebe a notificação com cálculo e revisa em até 24h
4. Felipe ajusta se necessário (cliente estratégico, oportunidade de case, etc.)
5. Proposta personalizada é enviada ao cliente via WhatsApp ou e-mail

**Por que revisão humana antes de enviar:** a fórmula gera o piso. Felipe avalia se o caso justifica preço acima (cliente grande, mercado estratégico, oportunidade). Nunca enviar abaixo do calculado.

---

#### Argumento de venda para Virada in-company baseado em dados de mercado

**Dado de mercado** (Zoox Smart Data, 2024-2025): a resistência cultural é identificada como a principal barreira à adoção de IA em PMEs — manifestada em medo de substituição de empregos, desconfiança na tecnologia, falta de compreensão e receio de mudanças.

**Por que isso fortalece a venda da Virada in-company:** o gestor que compra uma Virada in-company não está comprando um treinamento técnico — está comprando a remoção da principal barreira que impede sua empresa de adotar IA: o fator humano.

**Script para Carlos ao vender Virada in-company:**
> *"O maior obstáculo que empresas do seu porte encontram para adotar IA não é tecnológico — é cultural. As pesquisas são claras: resistência da equipe, medo de substituição, desconfiança. A Virada ataca exatamente isso: em 4 horas, sua equipe sai usando IA na prática, não com medo dela. É o investimento com menor custo e maior impacto comportamental que existe hoje."*

---

## Parte 3 — Pacotes Promocionais e Estrutura de Descontos

> Estrutura **permanente** de pacotes + ofertas **sazonais** + descontos pontuais autorizados. Toda promoção tem regra clara, condição objetiva e prazo definido.

### 3.1 — Princípios de desconto IntelliX

| Princípio | O que significa na prática |
|---|---|
| **Desconto nunca é arbitrário** | Só aplicar o que está escrito aqui — não inventar na hora |
| **Desconto sempre tem contrapartida** | Pagamento à vista, prazo, indicação, volume — sempre algo em troca |
| **Desconto preserva margem mínima** | Após aplicar desconto, margem nunca fica abaixo de 25% |
| **Desconto tem prazo** | Toda oferta tem validade — não existe "esse preço sempre" |
| **Desconto não baixa o preço de tabela** | Preço cheio aparece sempre — desconto é "a partir de" um valor de tabela |

---

### 3.2 — Pacotes Permanentes (sempre disponíveis com gatilho objetivo)

#### P1 · Combo Diagnóstico + Construção

**Condição:** Cliente compra RADAR Diagnóstico **e** contrata FORJA em até 60 dias após a entrega.

**Benefício:** 50% do valor pago no RADAR Diagnóstico vira crédito no FORJA.

**Exemplo:**
- RADAR Diagnóstico: R$ 12.000 → pago integral
- FORJA contratado em 45 dias: R$ 18.000
- Crédito aplicado: R$ 6.000
- Valor efetivo do FORJA: R$ 12.000

**Comunicação:**
> *"Se você seguir para o FORJA em até 60 dias, metade do que pagou no diagnóstico vira crédito no projeto. É o nosso compromisso: o diagnóstico não é um custo separado, é o primeiro passo da construção."*

**Margem combinada:** ~23% (estratégica — cria cliente de alto LTV).

---

#### P2 · Pacote Trilha Anual

**Condição:** Cliente paga TRILHA (qualquer plano) à vista, 12 meses.

**Benefício:** 10% de desconto + 1 sessão bônus de planejamento estratégico (60min) no início do contrato.

**Exemplo TRILHA Pro:**
- Mensal: R$ 2.490 × 12 = R$ 29.880
- À vista anual: R$ 26.892 (economia R$ 2.988)
- + 1 sessão bônus de planejamento

**Margem após desconto:** ~39% (cai 7 p.p. da margem original, mas garante 12 meses de receita).

---

#### P3 · Combo FORJA + Evolve Comprometido

**Condição:** Cliente contrata FORJA **e** se compromete com Evolve por mínimo 6 meses no mesmo contrato.

**Benefício:** 1 mês de Evolve grátis (último mês dos 6) + 5h de banco de horas avulsas para usar nos 6 meses.

**Exemplo FORJA MVP + Evolve Standard:**
- FORJA: R$ 18.000
- Evolve Standard 6 meses normais: R$ 17.400
- Cliente paga: R$ 18.000 + R$ 14.500 (5 meses) = **R$ 32.500**
- Recebe: FORJA + 6 meses Evolve + 5h banco

**Por quê:** atrai cliente ao ciclo FORJA+Evolve completo (maior LTV).

---

#### P4 · Indicação de Cliente Ativo

**Condição:** Cliente ativo da IntelliX indica novo cliente que fecha contrato.

**Benefício para o indicador:**
- Tem produto recorrente (Evolve, TRILHA, Pulse): **1 mês grátis** do plano dele
- Tem só produto one-time (FORJA, RADAR, Virada): **R$ 1.500 de crédito** para uso futuro

**Benefício para o indicado:**
- 10% de desconto na primeira contratação (qualquer frente, exceto preços fixos publicados como Virada turma aberta)

**Limite:** máximo 3 indicações premiadas por cliente por ano.

**Comunicação:**
> *"Se você conhece alguém que pode se beneficiar do que fazemos, conecte a gente. Se rolar, vocês dois ganham."*

---

#### P5 · Cliente Recorrente (segundo projeto)

**Condição:** Cliente que já contratou FORJA contrata segundo projeto FORJA.

**Benefício:** 10% de desconto no segundo FORJA (mantendo margem mínima 25%).

**Alternativa para FORJA Completo:** 1 mês de Evolve Premium grátis em vez do desconto.

**Por quê:** cliente já validou método e entrega — custo de aquisição zero.

---

#### P6 · Pacote Virada Empresarial (turma aberta para empresa)

**Condição:** Empresa compra **3 ou mais vagas** na mesma turma aberta da Virada.

**Benefício:**
- 3 vagas: a 4ª pessoa entra gratuita
- 6 vagas: a 7ª e 8ª pessoa entram gratuitas (lota a turma para a empresa)

**Custo marginal por pessoa adicional:** ~R$ 70 (material + coffee) — valor percebido: R$ 1.097/pessoa.

**Comunicação:**
> *"Trazer sua equipe para a Virada? A partir de 3 vagas, a quarta vai por nossa conta."*

---

#### P7 · Combo Virada In-Company + TRILHA Squad

**Condição:** Empresa contrata Virada in-company **e** TRILHA Squad na mesma proposta.

**Benefício:** 15% de desconto na primeira mensalidade do TRILHA Squad + integração de conteúdo (TRILHA Squad continua os temas iniciados na Virada).

**Lógica:** transformação em jornada — Virada planta a semente, TRILHA Squad mantém evolução. Sustenta MRR pós-Virada.

---

### 3.3 — Ofertas Sazonais (janelas específicas)

#### S1 · Black Friday IA (última semana de novembro)

**Janela:** 5 dias.

**Oferta:**
- RADAR Express: R$ 2.900 → R$ 1.990 (apenas contratação fechada na janela)
- TRILHA Starter: 1º mês com 50% off para novos clientes
- Virada turma aberta: pre-sell vigente vale como Black Friday

**⚠️ Atenção:** RADAR Express a R$ 1.990 gera margem negativa isoladamente — só viável se converter em FORJA. Avaliar saúde do pipeline FORJA antes de lançar.

---

#### S2 · Janela "Início do Ano" (janeiro/fevereiro)

**Janela:** 30 dias úteis a partir do 2º dia útil do ano.

**Oferta:**
- RADAR Diagnóstico: R$ 9.800 → R$ 8.500
- + 30min de planejamento estratégico de bônus

**Justificativa:** janeiro é mês de planejamento. Diagnóstico no início do ano vira execução no Q1/Q2 (gera pipeline FORJA).

---

#### S3 · Lançamento de Nova Frente

**Quando:** quando IntelliX lançar nova frente ou produto.

**Oferta:** 20% de desconto para os primeiros 5 clientes, em troca de:
- Aceitar ser case de referência (com possibilidade de anonimização)
- Permitir uso de logo no portfólio
- Dar testimonial verificado após entrega

**Comunicação:**
> *"Os 5 primeiros clientes do [novo produto] entram com 20% de desconto em troca de virarem nossa referência inicial. É a oportunidade de inaugurar conosco."*

---

#### S4 · Aniversário IntelliX (mês de fundação)

**Janela:** 7 dias.

**Oferta:**
- Qualquer FORJA contratado na janela: 1 mês de Evolve Basic grátis
- TRILHA Pro: assinatura anual com 15% off (em vez dos 10% padrão)

**Justificativa:** ativação de pipeline + marco de marca + ação repetível anualmente.

---

### 3.4 — Descontos Pontuais Autorizados (negociação individual)

Aplicáveis em negociação direta, sem campanha. Sempre com gatilho objetivo.

| Situação | Desconto máximo | Contrapartida obrigatória |
|---|---|---|
| Pagamento 100% à vista (em vez de 3 fases) | 5% | Pagamento na assinatura |
| Cliente aceita ser case documentado completo (com nome, dados, vídeo) | 10% | Autorização escrita de uso institucional |
| Cliente aceita prazo de entrega 30% mais longo (libera agenda) | 5% | Cronograma assinado |
| Múltiplos produtos contratados juntos (FORJA + Evolve + TRILHA) | 8% | Compromisso de 6 meses no recorrente |
| Cliente do segmento prioritário ainda sem case (Consultoria/B2B/Coliving) | 10% | Aceitação como referência do segmento |

**Combinação de descontos:**
- Máximo 2 descontos da tabela na mesma negociação
- Soma total nunca acima de **15%** do valor de tabela
- Sempre manter margem mínima de **25%** após desconto

---

### 3.5 — Validação rápida antes de oferecer desconto

```
DESCONTO PODE SER OFERECIDO SE TODOS OS ITENS SÃO VERDADEIROS:

  [ ] Está previsto neste documento (P1-P7, S1-S4, ou 3.4)
  [ ] Tem contrapartida objetiva
  [ ] Margem final fica acima de 25%
  [ ] Preço pós-desconto não vira "novo preço de tabela"
  [ ] Tem prazo de validade definido
```

Se qualquer item não for verdadeiro: **não oferecer desconto**. Renegociar o escopo em vez disso.

---

## Parte 4 — Regras de Negociação

### 4.1 — O que pode ser negociado

| O que | Como | Limite |
|---|---|---|
| Preço total do FORJA | Reduzir escopo proporcionalmente | Nunca abaixo de R$ 14.000 (MVP) |
| Prazo de pagamento da Fase 3 | Estender de 60 para 90 dias | Máximo 120 dias |
| Inclusão de hora avulsa como bônus | Pacote de horas como bônus de fechamento | Máximo 5h avulsas |
| Pre-sell da Virada turma | Já embutido: R$ 897 vs R$ 1.097 | Sem desconto adicional |
| Primeiro mês de Evolve/TRILHA grátis | Bônus em FORJA acima de R$ 30.000 | Máximo 1 mês Evolve Basic ou TRILHA Starter |

### 4.2 — O que nunca é negociado

| Regra | Motivo |
|---|---|
| Preço abaixo de custo + 20% de margem | Operação insustentável |
| Retirar KPIs do contrato | KPI protege ambas as partes |
| Transferir custo de LLM pós-entrega para IntelliX | Custo escalável indefinido |
| Desconto em troca de "indicação futura" | Indicação futura não compensa desconto hoje |
| Preço diferente para "cliente amigo" sem aplicar P4 oficial | Gera precedente |

### 4.3 — Cálculo do limite mínimo

```
Preço mínimo aceitável = Custo total do projeto ÷ 0,70

Exemplo FORJA MVP com custo R$ 12.000:
  Preço mínimo = R$ 12.000 ÷ 0,70 = R$ 17.143
  → Não aceitar abaixo de R$ 17.000
```

---

## Parte 5 — Análise de Viabilidade

### 5.1 — Checklist pré-proposta

- [ ] Estimativa de horas feita com cuidado
- [ ] Buffer de 15% adicionado
- [ ] HH calculado a R$ 180/h (ou R$ 220 se já na próxima fase)
- [ ] Custo de parceiro externo incluído
- [ ] Custo de infraestrutura proporcional incluído
- [ ] Margem bruta acima de 30%?
- [ ] HH efetivo acima de R$ 150/h?
- [ ] Se margem 20-30%: é estratégico aceitar?
- [ ] Se margem abaixo de 20%: não propor sem ajuste

### 5.2 — Projetos que não devem ser aceitos

| Situação | Decisão |
|---|---|
| Margem abaixo de 20% sem justificativa estratégica | Não aceitar |
| Escopo mal definido com prazo fixo inflexível | Não aceitar |
| Cliente quer pagar 100% só na entrega final | Não aceitar |
| Expertise fora dos 5 pilares sem parceiro identificado | Não aceitar |
| FORJA abaixo de R$ 14.000 | Não aceitar |

### 5.3 — Quando aceitar margem abaixo do padrão

| Situação | Limite inferior |
|---|---|
| Case para segmento-alvo ainda sem case | 20% |
| Cliente com LTV altíssimo | 22% |
| Projeto de alto valor para reputação | 15% — máx 1x/ano |
| Primeiro projeto com parceiro de canal de alto volume | 20% |

**Regra:** margem abaixo do padrão no máximo 2 vezes por semestre.

---

## Parte 6 — Revisão e Evolução

### 6.1 — Gatilhos para revisão

| Gatilho | Ação |
|---|---|
| 3 projetos FORJA pagos e entregues | HH sobe de R$ 180 para R$ 220 |
| 5 cases documentados | Alta de 10-15% em FORJA e RADAR |
| Taxa de fechamento acima de 50% por 2 trimestres | Preço provavelmente baixo |
| 3 recusas seguidas por "preço alto" | Investigar antes de baixar |
| Inflação acumulada acima de 8% no período | Reajuste em todos os recorrentes |

### 6.2 — Reajuste de clientes em recorrência

- Reajuste anual máximo: IPCA + 5%
- Aviso mínimo: 30 dias antes
- Comunicação: mensagem direta de Felipe, não de agente
- Clientes com 12+ meses ativos: reajuste com desconto de fidelidade (menor que IPCA)

### 6.3 — Próxima revisão formal

| Evento | Data esperada |
|---|---|
| 3º projeto FORJA entregue | Q3 2026 |
| 5 cases documentados | Q4 2026 |
| Revisão anual padrão | Maio 2027 |

---

## Parte 7 — Changelog

### v1.3 — Maio 2026

**Adição de argumento comercial baseado em dados de mercado:**

1. ➕ **Nova subseção em 2.9** — "Argumento de venda para Virada in-company baseado em dados de mercado"
   - Dado Zoox Smart Data (2024-2025): resistência cultural como principal barreira à adoção de IA em PMEs
   - Script Carlos Closer para usar ao vender Virada in-company
   - Reforça que o produto vende remoção da barreira humana, não treinamento técnico

---

### v1.2 — Maio 2026

**Mudança crítica de mercado:** ajuste de custo do espaço da Virada turma aberta

1. ✏️ **Espaço + Coffee break** da Virada turma aberta passa a ser tratado como **consumação mínima única de R$ 2.000** (estrutura padrão dos espaços profissionais em Recife — formato similar ao usado pela Duma)
2. ❌ Removida a linha separada "Aluguel de sala R$ 500" e "Coffee breaks R$ 240" da composição
3. ➕ Custo total da turma aberta atualizado de R$ 2.860 → **R$ 4.120** (turma de 8)
4. ⬇️ Margem da turma ideal (8 pessoas) revisada de 67% → **53%**
5. ➕ **Tabela de margem absoluta por frequência mensal** (2, 3 e 4 turmas/mês) — premissa de ganho no volume
6. ⚠️ **Alerta operacional sobre capacidade** — 4 turmas/mês consome ~1/3 da agenda de Felipe; só recomendado quando o conteúdo padrão estiver consolidado
7. ➕ Sinais para revisão futura (espaço subir consumação, capacidade exceder, etc.)
8. 📝 Esclarecimento na 2.9 — diferença in-company (cliente fornece espaço) vs turma aberta (IntelliX arca com a consumação)

### v1.1 — Maio 2026

1. ❌ **Removido Canva Pro** da composição de custos fixos (R$ 1.030 → R$ 975/mês)
2. ✏️ **Virada in-company** passa a ser **sob consulta** — sem preço base publicado
3. ❌ **Removido custo de sala** da composição in-company (cliente sempre fornece)
4. ⬇️ **Preço base in-company revisado** de R$ 5.900 → **R$ 4.200** (entrada de mercado mais acessível)
5. ➕ **Adicionada fórmula automática de cálculo** para o formulário de solicitação in-company
6. ➕ **Nova Parte 3** completa com:
   - 7 pacotes promocionais permanentes (P1-P7)
   - 4 ofertas sazonais (S1-S4)
   - 5 descontos pontuais autorizados em negociação
   - Princípios e regras de validação de desconto

---

*IntelliX.AI · Base de Conhecimento · Documento 09 · Precificação Interna*
*⚠️ Acesso exclusivo: Felipe Maranhão · Versão 1.3 · Maio 2026*
*Próxima revisão: ao atingir 3 projetos FORJA entregues ou mudança de HH base*

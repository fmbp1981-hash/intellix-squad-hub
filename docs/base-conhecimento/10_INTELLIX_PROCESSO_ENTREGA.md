# 10 · IntelliX.AI — Processo de Entrega

> **Documento da Base de Conhecimento — Camada 3 (Operação)**
> Ciclo completo de entrega: do kickoff ao encerramento ou transição para Evolve
> Versão 2.0 · Maio 2026
> ⚠️ Documento interno — Felipe e Ágata

---

## Como usar este documento

Manual operacional de execução de projetos IntelliX. Define 4 processos (O1 a O4) que protegem a margem da operação, a qualidade da entrega e o atingimento dos KPIs contratados.

**Documentos complementares obrigatórios:**
- `03 · Frentes Comerciais` — escopo, SLA e risk reversal por frente
- `08 · Playbook Comercial` — como o cliente chegou até aqui
- `09 · Precificação Interna` — composição de horas, margem e fórmula de change request
- `06 · Taxonomia ROI` — KPIs que serão medidos

---

## Parte 1 — Visão Geral do Ciclo

### 1.1 — Os 4 processos operacionais

```
┌─────────────────────────────────────────────────────────────────┐
│            CICLO DE ENTREGA INTELLIX (pós-contrato)
│
│   O1            O2              O3              O4
│   ONBOARDING    EXECUÇÃO        SUPORTE        CHANGE REQUEST
│                                 INCLUÍDO       (eventual)
│
│   3-5 dias      30-120 dias     60 dias        Conforme
│                                                 mudança
│
│   ↓             ↓               ↓               ↓
│   Kickoff       Construção      Monitoramento   Reescopo
│   Briefing      Sprints         Suporte ativo   Repricing
│   Setup         Validação       Validação       Aditivo
│                 Treinamento     dos KPIs        contratual
│                 Documentação    (Fase 3)
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 — Conexão entre O3 e o pagamento da Fase 3 (CRÍTICO)

Esta é a conexão mais importante do modelo IntelliX e deve estar clara para todos:

```
O contrato FORJA tem 3 fases de pagamento (ver Doc 03):
  Fase 1 = 30% na assinatura       → libera O1
  Fase 2 = 30% na entrega          → libera fim de O2 / início de O3
  Fase 3 = 40% em 60 dias pós-entrega COM KPIs atingidos → cobrada no fim de O3

O período de O3 (60 dias de suporte incluído) coincide com
a janela de validação da Fase 3.

Ou seja: O3 não é apenas "suporte cortês".
O3 é o período em que a IntelliX prova que entregou o resultado
contratado. A nota fiscal final só é emitida no encerramento de O3.
```

**Consequência operacional:**
O O3 não pode ser tratado como "fase secundária". O monitoramento ativo e a coleta de evidências dos KPIs durante esses 60 dias são o que destrava a Fase 3 do faturamento.

### 1.3 — Matriz de responsabilidades

| Fase | Responsável principal | Apoio | Duração |
|---|---|---|---|
| O1 — Onboarding | Felipe | Ágata (briefing técnico) | 3-5 dias úteis |
| O2 — Execução | Felipe | Ágata (gestão de cronograma e comunicação) | Conforme contrato |
| O3 — Suporte incluído | Felipe (técnico) | Ágata (monitoramento e relacionamento) | 60 dias após entrega |
| O4 — Change Request | Felipe (escopo e preço) | Ágata (formalização) | Conforme mudança |

### 1.4 — Gatilhos de início

| Fase | Inicia quando | Bloqueio se faltar |
|---|---|---|
| O1 | Contrato assinado **+** Fase 1 (30%) confirmada na conta | Sem pagamento confirmado, projeto não inicia |
| O2 | Briefing técnico 100% completo **+** acessos liberados | Sem briefing completo, projeto não sai do papel |
| O3 | Sistema em produção **+** treinamento da equipe realizado | Sem treinamento, suporte vira treinamento mal pago |
| O4 | Solicitação formal de mudança fora do escopo | Sem registro formal, mudança não é precificada |

---

## Parte 2 — O1: Onboarding (3-5 dias úteis)

### 2.1 — Reunião de Kickoff

**Quando:** até 2 dias úteis após confirmação do pagamento da Fase 1.

**Participantes obrigatórios:**
- **Pela IntelliX:** Felipe + Ágata
- **Pelo cliente:** decisor que assinou o contrato, ponto de contato único definido, e quem vai usar/operar o sistema no dia a dia

**Ponto de contato único (PCU):**
Definido na reunião. É a pessoa que recebe todas as comunicações da IntelliX e centraliza decisões do lado do cliente. Sem PCU definido, a comunicação se dispersa e o projeto sofre. Se o cliente não nomear, Felipe sugere: *"Quem é a pessoa que decide o dia a dia deste projeto?"*

**Duração:** 60-90 minutos.

**Agenda:**

| Bloco | Tempo | Objetivo |
|---|---|---|
| Reapresentação do diagnóstico | 15 min | Felipe percorre o contrato item a item. Cliente confirma se ainda corresponde ao cenário atual. Ajustes registrados em ata. |
| Escopo e KPIs | 20 min | Revisão dos KPIs da Fase 3 um a um. Cliente confirma a compreensão do que será medido e como. |
| Acessos e integrações | 15 min | Lista de sistemas, credenciais e dados que o cliente vai fornecer. Felipe identifica gaps. |
| Cronograma | 10 min | Datas de entrega de cada sprint fixadas em calendário compartilhado. Pontos de validação do cliente marcados. |
| Comunicação | 10 min | Canal principal (e-mail ou WhatsApp), frequência de updates (semanal), protocolo de urgência. |
| Próximas ações | 10 min | Formulário de briefing técnico enviado durante a reunião. Prazo: 5 dias úteis para preenchimento. |

**Saída obrigatória:**
- Ata da reunião (Ágata redige e envia em 24h)
- Cliente confirma o recebimento da ata por escrito

### 2.2 — Coleta de Briefing Técnico (assíncrona)

Ágata envia formulário ao cliente ao final do kickoff. Prazo: 5 dias úteis.

**Estrutura do formulário:**

*Operação:*
- Quais processos serão afetados pela solução?
- Volume mensal de operação (atendimentos, leads, transações)
- Horários de operação e picos
- Calendário de eventos críticos (sazonalidades, campanhas)

*Sistemas existentes:*
- Ferramentas em uso (CRM, ERP, WhatsApp Business, planilhas)
- Sistemas com os quais a solução vai conversar
- Credenciais de acesso (entregues por canal seguro — nunca por e-mail aberto)
- Restrições conhecidas (sistemas que não podem ser tocados, dados sensíveis)

*Usuários finais:*
- Cargos e número de pessoas que vão usar
- Familiaridade média com tecnologia

*Conteúdo (se houver agente):*
- Base de conhecimento atual: FAQs, scripts, catálogos, políticas
- Tom de voz da marca
- Casos de exceção e protocolo de escalação para humano

**Política de atraso no briefing:**

| Atraso | Ação |
|---|---|
| Até 3 dias úteis | Lembrete cordial via WhatsApp |
| 4 a 7 dias úteis | Reunião síncrona de 30min — Ágata ajuda a preencher |
| Acima de 7 dias úteis | Projeto entra em **estado de espera formal** — cronograma pausa, e qualquer impacto em prazo é responsabilidade do cliente registrada em ata |

A IntelliX não absorve o custo de cronograma atrasado por falta de briefing. Se o atraso comprometer a alocação de Felipe, o projeto pode ser reagendado.

### 2.3 — Setup técnico inicial (paralelo ao briefing)

Felipe executa em 1-2 dias úteis:

- Repositório GitHub criado com estrutura inicial
- Projeto Supabase criado (se aplicável)
- Pasta compartilhada no Google Drive criada e enviada ao cliente
- Ambiente local configurado
- Documento de overview do projeto rascunhado (1 página: contexto, escopo, KPIs, cronograma, riscos identificados na venda)

### 2.4 — Saídas do O1

Para sair do O1 e iniciar o O2, é necessário:

- Ata de kickoff enviada e confirmada pelo cliente
- Briefing técnico 100% completo
- Acessos liberados ou caminho de obtenção mapeado
- Documento de overview compartilhado com o cliente
- Cronograma do O2 publicado e aceito

---

## Parte 3 — O2: Execução (30-120 dias)

### 3.1 — Estrutura de sprints por tipo de projeto

Cada projeto é dividido em sprints de 1 a 2 semanas com validação incremental do cliente ao fim de cada sprint.

#### FORJA MVP — referência: ~60h em 30 dias (ver Doc 09)

| Sprint | Dias | Marcos | Horas | Validação do cliente |
|---|---|---|---|---|
| S1 | 1-7 | Discovery técnico finalizado · Arquitetura aprovada · Agente principal iniciado | ~14h | Revisão da arquitetura proposta |
| S2 | 8-14 | Agente principal funcional · Primeira integração concluída · Documentação inline em andamento | ~16h | Demo do agente em ambiente de testes |
| S3 | 15-21 | Segunda integração concluída · Testes integrados · Documentação operacional | ~16h | Cliente testa o fluxo completo |
| S4 | 22-30 | Ajustes finais · Treinamento da equipe · Go-live em produção | ~14h | Aceite formal de entrega (Fase 2) |

**Total estimado:** ~60h, consistente com a faixa do Doc 09 (55-75h para FORJA MVP médio).

#### FORJA Completo — referência: ~170h em 60-90 dias

| Sprint | Dias | Marcos | Horas | Validação |
|---|---|---|---|---|
| S1 | 1-10 | Discovery completo · Arquitetura validada · Backlog técnico montado | ~20h | Apresentação técnica + aprovação da arquitetura |
| S2-S3 | 11-30 | Agente principal pronto · Sistema web (estrutura) iniciado · Integrações 1 e 2 | ~50h | Demo do agente + walkthrough do painel |
| S4-S5 | 31-50 | Demais agentes + integrações restantes · Painel funcional | ~50h | Demo integrada do sistema completo |
| S6-S7 | 51-70 | Testes integrados · Aceitação técnica · Treinamento da equipe | ~35h | UAT (testes pelo cliente em ambiente de homologação) |
| S8 | 71-90 | Ajustes pós-UAT · Documentação final · Go-live | ~15h | Aceite formal de entrega (Fase 2) |

#### RADAR Express — 7 dias úteis

| Fase | Prazo | Entrega |
|---|---|---|
| Briefing + coleta | 1-2 dias | Reunião de 1,5h com cliente |
| Análise | 3-5 dias | Mapa de oportunidades em rascunho |
| Relatório + apresentação | 6-7 dias | Relatório final + reunião de entrega |

#### RADAR Diagnóstico — 2 a 4 semanas

| Fase | Prazo | Entrega |
|---|---|---|
| Briefing + entrevistas (3-5 stakeholders) | 1ª semana | Dados compilados |
| Análise por área | 2ª semana | Diagnóstico em rascunho |
| Cruzamento + roadmap | 3ª semana | Roadmap de 12 meses |
| Relatório + apresentação | 4ª semana | Relatório final + apresentação executiva |

#### TRILHA — execução mensal contínua

Cada mês é um ciclo. Não há "entrega final" — há ciclos de sessões com revisão trimestral de evolução.

#### Virada — execução pontual

Preparação na semana anterior, execução no dia, follow-up nos 7 dias seguintes (garantia 7 dias).

### 3.2 — Validação por sprint

**Protocolo padrão:**
- Ao fim de cada sprint, Ágata agenda uma janela de validação de 48h úteis para o cliente.
- O cliente testa, dá feedback, aprova ou pede ajustes.

**Se o cliente não responde em 48h:**
- Ágata envia lembrete na 24ª hora.
- Se o silêncio passar de 48h sem justificativa, a sprint é considerada **aprovada por silêncio** e o projeto avança.
- Comunicação ao cliente: *"Como não tivemos retorno até [data/hora], seguimos com a sprint aprovada por silêncio. Se algo precisar de ajuste, registramos como mudança para a próxima sprint."*

Essa regra protege o cronograma e está alinhada com o princípio do Doc 08 (prazo combinado é prazo entregue).

### 3.3 — Comunicação durante a execução

| Tipo | Frequência | Quem | Canal |
|---|---|---|---|
| Update de progresso | Semanal (terça) | Ágata para PCU do cliente | E-mail |
| Reunião de alinhamento | Quinzenal | Felipe + Ágata + PCU | Vídeo, 30min |
| Bloqueio crítico | Imediato | Felipe ou Ágata | WhatsApp |

**Formato do update semanal (template):**
- O que foi entregue nesta semana
- O que está em andamento
- Bloqueios (se houver)
- O que vem na próxima semana
- Decisões necessárias do cliente (se houver)

### 3.4 — Checklist técnico antes de cada liberação

Antes de marcar um sprint como pronto para validação do cliente:

- Código versionado e commitado com mensagens descritivas
- Documentação inline atualizada
- Funcionalidade testada em ambiente próprio (Felipe)
- Cliente foi orientado sobre como testar
- Credenciais sensíveis fora do código (variáveis de ambiente, secrets)
- RLS configurada se o projeto usa Supabase

### 3.5 — Critérios técnicos para "pronto para produção"

Antes do go-live final do O2:

- 100% dos KPIs do contrato têm método de medição definido
- Sistema rodou 24h em ambiente equivalente a produção sem erro crítico
- Logs configurados e acessíveis (Felipe consegue diagnosticar problema futuro)
- Backup automático em operação (se há dados a preservar)
- Documentação técnica e operacional completas
- Equipe do cliente treinada e tendo executado o fluxo pelo menos uma vez

### 3.6 — Aceite formal de entrega (fim do O2)

Documento "Termo de Aceite de Entrega" assinado pelo cliente, contendo:
- Confirmação de que o sistema está em produção
- Confirmação de que a equipe foi treinada
- Data oficial de go-live (marca o início dos 60 dias de O3 e do contador para Fase 3)

Sem este termo assinado, a Fase 2 (30%) não é cobrada e o contador da Fase 3 não inicia.

---

## Parte 4 — O3: Suporte Incluído (60 dias após go-live)

### 4.1 — O que está incluso no O3

O O3 cumpre dois papéis simultâneos:
1. **Garantia de estabilização:** correção de qualquer comportamento divergente do contratado, sem custo adicional
2. **Validação dos KPIs:** período em que os KPIs do contrato são medidos para liberar a Fase 3

### 4.2 — SLA durante o O3

O O3 utiliza o SLA correspondente ao plano Evolve que o cliente eventualmente assinará — mas durante esses 60 dias, **mesmo sem contrato Evolve ativo, o SLA aplicado é equivalente ao Standard:**

| Tipo de demanda | SLA durante O3 |
|---|---|
| Comportamento divergente do escopo (correção) | Resposta em 24h úteis, resolução em até 5 dias úteis |
| Dúvida operacional do cliente | Resposta em 24h úteis |
| Bloqueio total do sistema (sistema fora do ar) | Resposta em até 4h úteis no horário comercial |

> Os percentuais de "disponibilidade garantida" (uptime) não são prometidos formalmente neste momento, porque dependem de infraestrutura de terceiros (Supabase, Vercel, APIs de LLM) sobre as quais a IntelliX não tem controle direto.

### 4.3 — Estrutura de atendimento (2 níveis)

**Nível 1 — Ágata:**
- Recebe a demanda do cliente
- Identifica se é dúvida operacional (resolve direto, usando documentação)
- Se for problema técnico, escala para Felipe

**Nível 2 — Felipe:**
- Investiga e resolve problemas técnicos
- Registra a aprendizagem para alimentar a documentação

> O time IntelliX não tem "Nível 3" formal hoje. Para integração com sistemas de terceiros que apresentem problema externo, Felipe medeia diretamente com o suporte do fornecedor.

### 4.4 — Monitoramento ativo durante o O3

Ágata executa checagem semanal:

- Sistema responde aos endpoints principais
- Logs sem erro crítico nos últimos 7 dias
- Métricas de uso dentro da baseline esperada
- Cliente está usando o sistema (se uso cair a zero, é sinal de alerta)

Se algum sinal sair da baseline, Ágata abre um ticket interno e notifica o cliente antes que vire problema visível.

### 4.5 — Validação dos KPIs e ativação da Fase 3

**Dia 30 do O3:** Ágata envia ao cliente um relatório preliminar de KPIs (como estão os indicadores em metade do período).

**Dia 50 do O3:** Reunião com Felipe + Ágata + cliente para revisar o status dos KPIs. Se algum indicador está abaixo do esperado, identificar a causa:
- Causa é técnica (sistema)? → IntelliX corrige nos 10 dias restantes
- Causa é de uso (equipe do cliente não está adotando)? → Plano de adoção é proposto

**Dia 60 do O3:** Reunião final de validação.

**Decisão da Fase 3:**

| Cenário | Decisão |
|---|---|
| KPIs atingidos | Fase 3 (40%) é cobrada conforme contrato |
| KPIs não atingidos por causa técnica não resolvida | Fase 3 é renegociada (desconto ou postergação) |
| KPIs não atingidos por falta de uso/adoção do cliente | Fase 3 é cobrada integralmente (cliente comprometeu-se em contrato com a operação correta) |
| KPIs parcialmente atingidos | Fase 3 cobrada proporcionalmente, negociada caso a caso |

Esta decisão é sempre formalizada por escrito (e-mail com cópia para o financeiro do cliente) antes da emissão da nota fiscal.

### 4.6 — Encerramento do O3

Ao fim dos 60 dias, três cenários possíveis:

1. **Cliente contrata Evolve** → entra em manutenção contínua (ver Doc 11 — Renovação)
2. **Cliente encerra formalmente** → documentação entregue, acessos transferidos, projeto sai do monitoramento ativo
3. **Cliente não decide** → após mais 15 dias sem decisão, sistema entra em "modo passivo" (sem monitoramento ativo, sem SLA garantido; cliente continua dono do sistema e dos dados)

---

## Parte 5 — O4: Change Request

### 5.1 — Diferença entre ajuste incluso e mudança de escopo

| Está incluso no contrato (sem custo adicional) | É mudança (requer Change Request) |
|---|---|
| Ajustes de configuração dentro do escopo | Nova funcionalidade não prevista no contrato |
| Refinamento de tom/redação do agente | Integração com sistema adicional |
| Correção de bug (sistema não faz o que foi contratado) | Aumento de volume que exige reformulação técnica |
| Pequenas otimizações de performance | Mudança de KPIs ou critério de aceitação |
| Treinamento adicional da mesma equipe | Treinamento de equipe nova |

A linha divisória é: o contrato original previa isso? Se sim, é ajuste. Se não, é mudança.

### 5.2 — Protocolo de Change Request

**Passo 1 — Solicitação formal pelo cliente:**

Ágata envia template ao cliente:

```
Mudança solicitada: [descrição clara do que mudar]
Justificativa: [por que é necessária]
Resultado esperado: [o que se espera obter]
Urgência: [normal / alta]
```

**Passo 2 — Análise pela IntelliX (Felipe, até 48h úteis):**
- Impacto técnico (arquitetura, integrações, dados)
- Horas estimadas (com buffer de 15%)
- Cálculo do preço (ver 5.3)
- Impacto no cronograma atual (se a mudança puder esperar o fim do projeto, melhor; se urgente, replaneja-se a sprint)

**Passo 3 — Proposta de mudança (Ágata para o cliente):**

```
Escopo da mudança: [o que será feito]
Horas estimadas: [X horas]
Investimento adicional: R$ [Y]
Impacto no cronograma: [+ Z dias / sem impacto se feito após go-live]
Impacto nos KPIs: [se a mudança altera algum KPI da Fase 3, ajustar contratualmente]
Validade da proposta: 7 dias
```

**Passo 4 — Aprovação:**
- Cliente aprova por e-mail (ou recusa)
- Se aprovado, Ágata gera aditivo contratual simplificado (1 página)
- Cliente paga 50% antes de iniciar, 50% na entrega da mudança

**Passo 5 — Execução:**
- Felipe executa
- Mudança é validada com o cliente como qualquer outra entrega

### 5.3 — Precificação de mudanças

**Regra alinhada ao Doc 09:**

Para mudanças durante O2 ou O3 (projeto ainda ativo):

```
Preço da mudança = (HH estimadas × R$ 180) ÷ 0,60

÷ 0,60 mantém o mesmo padrão de margem do projeto original:
- 30% margem-alvo
- 10% buffer de escopo oculto
- Cliente já validado, menos atrito de aquisição
```

Para clientes pós-O3 sem Evolve (mudança esporádica):

```
Hora avulsa: R$ 220/h (conforme Doc 03 e Doc 09)
Mínimo 3h para abertura de chamado (R$ 660)
```

Para clientes com Evolve ativo:
- A mudança usa horas do plano se cabe no escopo do plano
- Se excede, hora avulsa a R$ 220/h
- Se a demanda recorrente passar a exigir 2+ mudanças por mês, propor upgrade de plano

### 5.4 — Limite operacional para mudanças durante o projeto

Para evitar projeto que vira "feature creep" sem fim:

- Máximo de 2 Change Requests aprovados durante o O2
- Acima disso, propor encerrar o projeto atual, faturar, e abrir um segundo contrato

Esta regra protege o cronograma e a sanidade da entrega.

---

## Parte 6 — Encerramento Formal

### 6.1 — Critérios para encerrar o projeto

Um projeto está pronto para sair do ciclo de entrega (encerrar O3) quando:

- KPIs do contrato foram validados (atingidos, renegociados ou registrados como não atingidos com justificativa)
- Fase 3 do pagamento foi resolvida (paga, renegociada ou registrada)
- Documentação técnica e operacional 100% entregues
- Equipe do cliente operando o sistema sem demandas críticas
- Acessos transferidos integralmente para o cliente
- Termo de encerramento assinado por ambas as partes

### 6.2 — Transição para Evolve (quando aplicável)

Na semana 8 do O3 (entre os dias 56 e 60), Ágata apresenta proposta de Evolve baseada no perfil de uso observado:

- Cliente com poucas demandas durante o O3 → Evolve Basic
- Cliente com demandas regulares mas sem expansão → Evolve Standard
- Cliente com demanda crescente, planos de expansão ou múltiplos canais → Evolve Premium

A proposta inclui: plano sugerido, valor mensal, comparativo do que muda em relação ao O3 (que era gratuito).

> O processo detalhado de transição e renovação está no Doc 11 — Renovação.

### 6.3 — Encerramento sem Evolve

Se o cliente opta por não contratar Evolve:

- Documentação técnica final entregue em pasta compartilhada (com prazo de 30 dias para o cliente baixar tudo)
- Credenciais transferidas via canal seguro
- E-mail formal de encerramento de suporte
- Termo de encerramento assinado

A IntelliX mantém o cliente na lista de relacionamento para reabordagem futura (ver Doc 11 — Renovação, seção 7).

### 6.4 — Pasta final de entrega ao cliente

Contém:
1. Documentação técnica: arquitetura, banco de dados, integrações, deploy
2. Documentação operacional: como usar, troubleshooting, FAQs
3. Código-fonte: repositório do cliente ou export
4. Backup de dados (se aplicável)
5. Lista de credenciais (em ferramenta de senha, não em planilha aberta)
6. Termo de encerramento assinado

---

## Parte 7 — Métricas de Sucesso

### 7.1 — KPIs do projeto (do contrato)

Medidos durante o O3, formalizados na reunião do dia 60. Cada KPI tem método de medição definido na assinatura do contrato.

### 7.2 — NPS pós-entrega

Enviado ao cliente entre os dias 55 e 60 do O3.

**Pergunta padrão:**
> *"De 0 a 10, quanto você recomendaria a IntelliX para um colega na sua posição?"* + campo aberto para comentário.

**Metas IntelliX:**
- Meta-piso: NPS médio igual ou superior a 8 (alinhado com Doc 11)
- Meta-aspiração: ≥9 em pelo menos metade dos projetos

**Ação em caso de NPS baixo:**
- NPS 7-8 → Ágata pergunta o que faltou para nota máxima; ajusta processo
- NPS ≤ 6 → Felipe liga pessoalmente em 48h, entende a causa, propõe solução

### 7.3 — Conversão em caso de referência

Se o projeto atingiu KPIs **e** NPS ≥ 8, Ágata propõe ao cliente:
- Autorização para usar nome e logo no site
- Testimonial curto (texto ou vídeo de até 1 minuto)
- Reunião de 30 minutos para documentar o caso em formato de estudo

Como contrapartida: o cliente pode receber desconto na renovação ou benefício em produto futuro (negociado caso a caso).

---

## Parte 8 — Regras Operacionais

### 8.1 — Sempre fazer

| Regra | Por quê |
|---|---|
| Confirmar recebimento de qualquer entrega ou dado em até 24h | Cliente fica em paz de que a informação chegou |
| Comunicar atraso com no mínimo 48h de antecedência | Cliente prefere antecipar a se surpreender |
| Registrar toda decisão importante por e-mail | Documentação é a proteção contra ruído de memória |
| Validar com o cliente em cada sprint | Feedback incremental evita surpresa no final |
| Treinar a equipe antes do go-live | Sistema sem time treinado vira abandono em 60 dias |

### 8.2 — Nunca fazer

| Nunca | Por quê |
|---|---|
| Liberar em produção sem aceite formal do cliente | O cliente decide quando está pronto, não a IntelliX |
| Comunicar problema técnico depois de "tentar resolver primeiro" | Cliente prefere saber e ser parte da solução |
| Executar mudança fora de escopo sem Change Request formal | Sem documentação, vira disputa depois |
| Deixar projeto em silêncio por mais de 7 dias | Silêncio é interpretado como abandono |
| Remover documentação ou código após o encerramento | Cliente é dono e pode precisar dos dados meses depois |

---

## Parte 9 — Checklists Rápidos

### O1 — Onboarding
- [ ] Pagamento da Fase 1 confirmado
- [ ] Kickoff realizado e ata enviada
- [ ] PCU do cliente definido
- [ ] Briefing técnico 100% completo
- [ ] Setup técnico inicializado
- [ ] Cronograma do O2 publicado e aceito

### O2 — Execução
- [ ] Sprints planejados com horas estimadas
- [ ] Validação do cliente ao fim de cada sprint
- [ ] Update semanal enviado às terças
- [ ] Checklist técnico antes de cada liberação
- [ ] Treinamento da equipe realizado antes do go-live
- [ ] Termo de aceite de entrega assinado

### O3 — Suporte Incluído (60 dias)
- [ ] SLA do O3 sendo cumprido
- [ ] Monitoramento semanal executado
- [ ] Relatório preliminar de KPIs no dia 30
- [ ] Reunião de status no dia 50
- [ ] Reunião final no dia 60
- [ ] Decisão da Fase 3 formalizada por escrito
- [ ] NPS coletado entre os dias 55 e 60
- [ ] Proposta de Evolve apresentada na semana 8

### O4 — Change Request
- [ ] Solicitação formal recebida do cliente
- [ ] Análise feita em até 48h
- [ ] Proposta enviada com prazo de validade de 7 dias
- [ ] Aditivo contratual gerado se aprovado
- [ ] Pagamento de 50% antes do início
- [ ] Validação com o cliente como entrega normal

---

## Parte 10 — Changelog

### v2.0 — Maio 2026 (revisão completa)

**Correções de inconsistência com outros documentos:**
- SLA refeito conforme padrão real do Doc 03 (sem inventar percentuais de uptime que não podem ser garantidos)
- Horas de FORJA MVP recalculadas para fechar com Doc 09 (~60h em 30 dias)
- Marcos do FORJA Completo detalhados com horas explícitas por sprint
- Change Request alinhado com fórmula do Doc 09 (÷ 0,60 — não inventei nova margem)
- NPS alinhado com Doc 11 (meta-piso ≥ 8)

**Adição de tópico crítico não documentado na v1.0:**
- Conexão explícita entre O3 (60 dias) e Fase 3 do pagamento — agora é a Parte 1.2
- Política de atraso no briefing (3 estágios de resposta + estado de espera formal)
- Decisão da Fase 3 em 4 cenários (KPI atingido, falha técnica, falha de adoção, parcial)
- Limite de 2 Change Requests durante O2 (evita feature creep)
- "Modo passivo" se cliente não decide pós-O3

**Limpezas:**
- Removidas regras que não fazem sentido para operação solo (code reviews, etc.)
- Anglicismos removidos (Cross-sell, Client review, Deliverable)
- Tom revisado para alinhamento com Satya Nadella (anti-defensivo)
- "Felipe lê o contrato em voz alta" → "Felipe percorre o contrato item a item"

---

*IntelliX.AI · Base de Conhecimento · Documento 10 · Processo de Entrega*
*Versão 2.0 · Maio 2026*
*Próxima revisão: após 3 projetos FORJA Completo entregues*

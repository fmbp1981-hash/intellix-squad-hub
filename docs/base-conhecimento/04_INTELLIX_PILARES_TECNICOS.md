# 04 · IntelliX.AI — Pilares Técnicos

> ⚠️ **DOCUMENTO INTERNO — Não usar em comunicação com cliente externo**
>
> Este documento descreve as **capacidades técnicas** da IntelliX para uso interno. Para comunicação externa, traduzir cada capacidade para resultado de negócio conforme **Documento 02 — Glossário**.
>
> Documento da Base de Conhecimento — Camada 2 (Oferta Comercial)
> Versão 1.0 · Maio 2026

---

## 1. Para que serve este documento

A IntelliX vende **4 frentes comerciais** (RADAR, FORJA, TRILHA, Virada). Mas tecnicamente entrega capacidades organizadas em **5 pilares**.

A relação entre eles:

```
O CLIENTE COMPRA          A INTELLIX ENTREGA
(externo)                 (interno)

RADAR.AI         ────►    Diagnóstico nos Pilares 1, 2, 3, 5
FORJA.AI         ────►    Execução nos Pilares 1, 2, 3, 5
TRILHA.AI        ────►    Capacita uso dos Pilares 1, 2
Virada           ────►    Capacita uso dos Pilares 1, 2

PILAR 4 (Presença Digital) é entregue dentro de projetos FORJA
quando o escopo inclui site, landing page ou identidade visual.
```

Este documento serve para:
- Briefing técnico de projetos
- Orientar equipe interna sobre o que sabemos fazer
- Documentar capacidades para propostas (anexo técnico)
- Onboarding de novos colaboradores ou parceiros

**Não deve aparecer em:** site público, posts, propostas comerciais iniciais, comunicação com leads.

---

## 2. Pilar 1 — IA Aplicada a Negócios

### O que é

Capacidade de construir e operar **agentes de IA conversacionais e analíticos** que executam tarefas de negócio com autonomia ou supervisão humana.

### Capacidades

**Agentes conversacionais:**
- Atendimento ao cliente em múltiplos canais (WhatsApp, web chat, e-mail, Instagram)
- SDR Virtual (qualificação de leads, agendamento)
- Suporte interno (FAQ para colaboradores, RH)
- Assistente especializado (jurídico, médico, técnico, financeiro)

**Agentes analíticos:**
- Análise de documentos longos (contratos, relatórios, regulamentos)
- Síntese e extração de informação estruturada
- Categorização e classificação em escala
- Análise de sentimento e padrões em conversas

**Agentes operacionais:**
- Geração de propostas/orçamentos a partir de briefing
- Produção de relatórios automatizados
- Triagem e priorização de demandas
- Pesquisa e curadoria de conteúdo

### Tecnologias internas usadas

LLMs principais (alternados conforme caso): Claude (Anthropic), GPT (OpenAI), Gemini (Google). Frameworks de orquestração de agentes. Bases de conhecimento vetorizadas (RAG). Memória persistente de contexto.

### Tradução para cliente (via Glossário)

| Termo interno | Termo de cliente |
|---|---|
| LLM / GPT / Claude | Inteligência Artificial |
| Agente conversacional | Agente de atendimento · Assistente inteligente |
| RAG | Consulta inteligente à base de conhecimento |
| Prompt engineering | Configuração do agente |

---

## 3. Pilar 2 — Sistemas, Plataformas e Aplicativos

### O que é

Capacidade de construir **sistemas web completos** (frontend + backend + banco de dados) que servem como interface, painel ou aplicativo para o cliente operar sua solução de IA ou seu negócio.

### Capacidades

**Painéis administrativos:**
- Dashboards de gestão e indicadores
- CRMs customizados
- Sistemas de gestão de projetos
- Painéis de operação para equipes

**Aplicações web:**
- Plataformas de cadastro e workflow
- Sistemas de aprovação e fluxo
- Aplicativos de uso interno
- Marketplaces ou catálogos

**Integrações:**
- Conexão com ERPs, CRMs, ferramentas SaaS
- Integrações bidirecionais com WhatsApp Business
- Importação/exportação de dados
- Sincronização entre sistemas

### Tecnologias internas usadas

Frontend: Vite + React + TypeScript + Shadcn/UI + Tailwind. Backend: Supabase (Postgres + Auth + Edge Functions + Realtime). Hospedagem: Vercel. Versionamento: GitHub.

### Tradução para cliente

| Termo interno | Termo de cliente |
|---|---|
| Frontend / Backend | Sistema |
| Supabase / Vercel | Banco de dados seguro · Hospedagem na nuvem |
| Edge Functions | Lógica do sistema |
| RLS (Row Level Security) | Segurança granular de dados |

---

## 4. Pilar 3 — Automação de Processos

### O que é

Capacidade de **eliminar trabalho manual repetitivo** através de fluxos automatizados que conectam sistemas e executam tarefas sem intervenção humana.

### Capacidades

**Fluxos operacionais:**
- Recepção e roteamento de leads
- Triagem de e-mails e mensagens
- Disparos automáticos baseados em gatilhos
- Atualização de planilhas e bases a partir de eventos

**Fluxos comerciais:**
- Onboarding de novos clientes (cadastro, envio de boas-vindas, criação de acesso)
- Sequências de nutrição
- Follow-up automático de propostas
- Notificações por estágio do funil

**Fluxos administrativos:**
- Geração e envio de relatórios periódicos
- Atualização de status entre sistemas
- Backup e arquivamento automatizado
- Conciliação de dados entre fontes

### Tecnologias internas usadas

n8n (self-hosted no VPS Hetzner) como engine principal. Make.com em casos específicos. Webhooks customizados. Cron jobs no Supabase. Evolution API para integrações com WhatsApp.

### Tradução para cliente

| Termo interno | Termo de cliente |
|---|---|
| n8n / Make / Workflow | Fluxo de trabalho automatizado |
| Webhook | Comunicação entre sistemas |
| Cron job | Execução agendada |
| Evolution API | Integração com WhatsApp |

---

## 5. Pilar 4 — Presença Digital

### O que é

Capacidade de construir e operar a **presença digital institucional** do cliente: site, landing pages, identidade visual e estrutura de conteúdo.

### Capacidades

**Sites institucionais:**
- Site de 1 a 10 páginas com identidade própria
- CMS para o cliente atualizar conteúdo
- Integração com formulários e CRM
- Otimização para mecanismos de busca (SEO técnico básico)

**Landing pages:**
- Páginas de conversão para campanhas específicas
- A/B testing simples
- Integração com analytics e pixel
- Formulários conectados ao CRM ou WhatsApp

**Identidade visual:**
- Tradução de marca para sistema visual web
- Componentes de design consistentes
- Mobile-first sempre

### Tecnologias internas usadas

Vite + React para sites com interatividade. Lovable para prototipação acelerada. Tailwind + Shadcn para sistema de design. Hospedagem Vercel.

### Tradução para cliente

| Termo interno | Termo de cliente |
|---|---|
| Landing page | Página de conversão |
| CMS | Painel para atualizar o site |
| SEO técnico | Otimização para Google |
| Mobile-first | Funciona perfeitamente no celular |

### Observação importante

Pilar 4 **não é vendido como frente independente**. É sempre componente dentro de um projeto FORJA quando o escopo inclui presença digital. Cliente que quer "só site" geralmente não é cliente IntelliX (existem opções mais baratas no mercado para isso, e não é onde a IntelliX entrega seu maior diferencial).

---

## 6. Pilar 5 — Soluções Sob Medida

### O que é

Capacidade de combinar **dois ou mais pilares anteriores** para entregar uma solução complexa única para o cliente. É onde a IntelliX entrega seu maior valor.

### Características de uma Solução Sob Medida

- Combina pelo menos 2 pilares (ex: Agente IA + Sistema de gestão + Automação)
- Tem KPIs específicos do negócio do cliente
- Exige discovery profundo antes do desenvolvimento
- Resulta em propriedade intelectual exclusiva do cliente
- Geralmente vira **case anonimizado** para a IntelliX

### Exemplos reais de Soluções Sob Medida

Documentados no **Documento 05 — Portfólio:**

- **GIG (Grupo Cavendish):** Pilares 1 + 2 + 3 → Sistema de governança corporativa com agente analítico
- **Prospect Pulse (XPAG Brasil):** Pilares 1 + 3 → SDR Virtual com automação de pipeline
- **Virada Inteligente (Yolo Coliving):** Pilar 1 isoladamente, mas em formato de produto educacional

### Por que este pilar existe separado

Sem este pilar, ficaríamos limitados a "vender produtos" (chatbot, painel, automação). Com ele, vendemos **transformação operacional** — que é onde está o maior ROI para o cliente e a maior margem para a IntelliX.

---

## 7. Matriz Pilar × Frente Comercial

| Pilar Técnico | RADAR.AI | FORJA.AI | TRILHA.AI | Virada |
|---|---|---|---|---|
| 1 · IA Aplicada | Diagnóstico de oportunidades | Construção de agentes | Capacita uso individual | Capacita uso em grupo |
| 2 · Sistemas | Diagnóstico de tech stack | Construção de painéis | — | — |
| 3 · Automação | Diagnóstico de processos | Construção de fluxos | — | — |
| 4 · Presença Digital | Diagnóstico de presença | Construção dentro de projeto | — | — |
| 5 · Soluções Sob Medida | Diagnóstico completo | **Núcleo do FORJA Completo** | — | — |

---

## 8. Critérios para Definir Pilar Aplicável

Quando um lead chega com um problema, o time interno aplica esta sequência:

**Pergunta 1:** O problema envolve conversa, análise ou geração de conteúdo?
→ Sim: **Pilar 1** (IA Aplicada) é o núcleo

**Pergunta 2:** O problema exige interface (painel, dashboard, app)?
→ Sim: **Pilar 2** (Sistemas) entra na composição

**Pergunta 3:** O problema envolve processo repetitivo entre sistemas?
→ Sim: **Pilar 3** (Automação) entra na composição

**Pergunta 4:** O cliente também precisa de site ou landing page?
→ Sim: **Pilar 4** (Presença Digital) é incluído no FORJA

**Pergunta 5:** A solução combina 2 ou mais pilares de forma única?
→ Sim: É uma **Solução Sob Medida** (Pilar 5) — proposta personalizada obrigatória

---

## 9. O Que NÃO Fazemos (não está em nenhum pilar)

Para evitar projetos fora do core:

- **Aplicativos mobile nativos** (iOS/Android) — usamos web mobile-first
- **Sistemas embarcados ou IoT** — não é nossa especialidade
- **Trading bots ou aplicações financeiras reguladas** — risco jurídico alto
- **Computer vision em larga escala** — capacidade ainda em formação
- **Modelos próprios de ML treinados do zero** — usamos LLMs prontos
- **Infraestrutura on-premise** — operamos 100% em nuvem

Quando lead pede algo fora destes pilares, indicamos parceiro ou recusamos polidamente.

---

## 10. Estrutura de Time Técnico (atual e projetada)

### Hoje (maio 2026)

**Time IntelliX.AI** opera com:
- Felipe Maranhão (operação principal — todos os pilares)
- Squad de agentes IA orquestrados pela Ágata (gestão operacional)
- Parceiros pontuais quando necessário (jurídico, contabilidade, design específico)

### Projeção (12-18 meses)

- 1 desenvolvedor pleno terceirizado para FORJA Completo
- 1 designer parceiro para Pilar 4
- Estrutura mantém-se enxuta intencionalmente (maior margem, menor custo fixo)

---

## 11. Aprovação para Comunicar Capacidades

Toda capacidade descrita aqui deve ser comunicada externamente **apenas** após passar por:

1. **Tradução via Glossário** (Documento 02)
2. **Validação de fit com Frente Comercial** (Documento 03)
3. **Verificação de que temos case ou expertise documentada**

Se o time interno não consegue dar exemplo concreto de uma capacidade, **não comunicar externamente como diferencial** — é capacidade em desenvolvimento, não capacidade entregue.

---

*IntelliX.AI · Base de Conhecimento · Documento 04 · Pilares Técnicos*
*⚠️ Documento interno · Versão 1.0 · Maio 2026*
*Atualização: revisar quando adicionar/remover capacidade técnica*

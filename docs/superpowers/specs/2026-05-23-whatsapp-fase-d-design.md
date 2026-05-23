# Fase D — WhatsApp Inbound + Config Multi-Provider
**Data:** 2026-05-23  
**Projeto:** intellix-squad-hub (OpenSquad Platform)  
**Status:** Design aprovado — aguarda implementação

---

## 1. Contexto

O sistema já possui `send-whatsapp` (outbound) e `whatsapp-provider.ts`, mas:
- Tabela `whatsapp_configs` não existe no banco
- Não há webhook inbound
- Não há UI de configuração
- Não há roteamento de mensagens para agentes

Esta fase implementa o canal WhatsApp completo: configuração multi-provider via UI, recepção de mensagens (inbound) e roteamento automático pelo funil comercial.

---

## 2. Fluxo Inbound Aprovado

```
Lead envia WA
     ↓
Bia — SDR (BANT qualification) — autônoma
  → Lead não qualificado: Bia continua
  → Lead qualificado: passa para Carlos
     ↓
Carlos — Estrategista Pre-Sales — autônomo
  → Aprofunda contexto async
  → Monta proposta pré-liminar
  → Follow-up D+1, D+3, D+5, D+10
  → Agenda reunião com Felipe
  → Reunião agendada: notifica Felipe
  → Sem resposta D+10: status "Proposta em espera", notifica Felipe
     ↓
Felipe — assume manualmente
  → Conduz reunião e fecha negócio
```

**Regra de handoff Bia → Carlos:** Bia define `lead.status = 'qualified'` e `lead.assigned_agent = 'carlos'` após confirmar BANT.  
**Regra de handoff Carlos → Felipe:** Carlos cria notificação no sistema com resumo do lead + link para o deal no CRM.

---

## 3. Providers Suportados

### 3.1 Evolution API
| Campo | Descrição |
|---|---|
| `instance_url` | URL base da Evolution API (ex: `https://evolution.intellixai.com.br`) |
| `api_key` | API Key da instância |
| `instance_name` | Nome da instância (ex: `WA-Pessoal`) |

**Webhook inbound:** A Evolution API envia `POST` para a URL cadastrada com payload JSON.  
**Send outbound:** `POST {instance_url}/message/sendText/{instance_name}` com `{ number, text }` e header `apikey`.

### 3.2 WhatsApp Business API (Meta)
| Campo | Descrição |
|---|---|
| `phone_number_id` | ID do número no Meta Business |
| `access_token` | Token de acesso permanente (Meta) |
| `verify_token` | Token definido pelo usuário para validar o webhook no Meta |

**Webhook inbound:** Meta envia `GET` para verificação (handshake) e `POST` para mensagens.  
**Send outbound:** `POST https://graph.facebook.com/v19.0/{phone_number_id}/messages` com Bearer token.

---

## 4. Schema — `whatsapp_configs`

```sql
CREATE TABLE public.whatsapp_configs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text        NOT NULL CHECK (provider IN ('evolution', 'whatsapp_business')),
  display_name    text        NOT NULL DEFAULT '',
  -- Evolution API
  instance_url    text,
  api_key         text,
  instance_name   text,
  -- WhatsApp Business (Meta)
  phone_number_id text,
  access_token    text,
  verify_token    text,
  -- Common
  active          boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- RLS: apenas admin lê/escreve
-- Constraint: no máximo 1 linha com active = true (enforced via trigger ou check)
```

**Observação:** campos de credencial ficam em texto plain no banco (protegidos por RLS + service_role). Não usar Supabase Vault nesta fase — complexidade desnecessária para sistema single-tenant com acesso apenas via admin.

---

## 5. Schema — `whatsapp_conversations`

Tabela para rastrear estado da conversa de cada lead:

```sql
CREATE TABLE public.whatsapp_conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid        REFERENCES leads(id) ON DELETE CASCADE,
  phone           text        NOT NULL,        -- número do lead
  current_agent   text        NOT NULL DEFAULT 'bia' CHECK (current_agent IN ('bia', 'carlos', 'felipe')),
  status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'closed')),
  history         jsonb       NOT NULL DEFAULT '[]', -- [{role, content, ts}]
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone)
);
```

---

## 6. Edge Functions

### 6.1 `whatsapp-inbound` (nova)

**Responsabilidades:**
1. Receber webhook de ambos os providers
2. Para WhatsApp Business: responder ao handshake GET de verificação
3. Validar autenticidade da requisição (verify_token / secret header)
4. Extrair `phone` + `text` da mensagem
5. Criar/localizar lead em `leads` por phone
6. Criar/localizar conversa em `whatsapp_conversations`
7. Rotear para o agente correto (`current_agent`)
8. Invocar `llm-invoke` com a persona do agente + histórico + mensagem
9. Enviar resposta via `whatsapp-provider.ts`
10. Persistir turno no `history` da conversa

**Roteamento:**
- `current_agent = 'bia'`: usa persona da Bia, detecta BANT completo → promove para `carlos`
- `current_agent = 'carlos'`: usa persona do Carlos, detecta reunião agendada → notifica Felipe e fecha conversa
- `current_agent = 'felipe'`: não processa automaticamente — Felipe responde manualmente

**Mecanismo de handoff (como o agente sinaliza a troca):**  
O `llm-invoke` é chamado com instrução adicional no system prompt: o agente deve encerrar sua resposta com um marcador estruturado quando decidir fazer handoff. Exemplo: `[ACTION:handoff_to_carlos]` ou `[ACTION:notify_felipe reason="reunião agendada"]`. A edge function lê o texto da resposta, extrai o marcador via regex, executa a ação (atualiza `current_agent`, cria notificação) e remove o marcador antes de enviar a mensagem ao lead.

### 6.2 `whatsapp-provider.ts` (atualizar)

Refatorar para suportar ambos os providers:
- Ler `active = true` de `whatsapp_configs`
- Despachar para `sendViaEvolution()` ou `sendViaWhatsAppBusiness()` conforme `provider`

### 6.3 `send-whatsapp` (sem mudança de interface)

Já usa `whatsapp-provider.ts` — funciona automaticamente após refatorar o provider.

---

## 7. UI — Tab WhatsApp em `/config`

**Localização:** `/config` → nova tab "WhatsApp" (visível apenas para admin).

**Componentes:**
- `WhatsAppTab.tsx` — container da tab
- `WhatsAppProviderForm.tsx` — formulário com dropdown + campos dinâmicos

**Comportamento:**
- Dropdown `<Select>` com opções: "Evolution API" e "WhatsApp Business (Meta)"
- Troca de provider limpa os campos e exibe os corretos para o provider selecionado
- Campo Webhook URL: read-only, gerado automaticamente, com botão "Copiar"
- Botão "Testar conexão": testa `send-whatsapp` enviando mensagem de teste para número hardcoded de teste (ou número configurável)
- Botão "Salvar": upsert na tabela `whatsapp_configs` via Supabase client

---

## 8. O que está FORA do escopo desta fase

- Multi-instância (mais de uma config ativa simultaneamente)
- Histórico de conversas visível na UI (somente no banco)
- Transferência de conversa entre agentes via UI manual
- Suporte a mídias (áudio, imagem) — apenas texto
- LGPD / opt-out de leads — não implementar agora

---

## 9. Arquivos a criar / modificar

```
supabase/migrations/
  20260523_whatsapp_config_and_conversations.sql   ← tabelas D-1

supabase/functions/
  whatsapp-inbound/
    index.ts                                        ← edge fn inbound D-2
  _shared/
    whatsapp-provider.ts                            ← atualizar multi-provider

src/pages/config/
  WhatsAppTab.tsx                                   ← nova tab
  WhatsAppProviderForm.tsx                          ← formulário provider

src/pages/config/ConfigPage.tsx                     ← adicionar tab WhatsApp
```

---

## 10. Critério de sucesso

1. Salvar configuração Evolution API na UI → `send-whatsapp` envia mensagem real
2. Mensagem recebida no WhatsApp → lead criado em `leads`, Bia responde automaticamente
3. Bia qualifica lead (BANT) → Carlos assume e envia proposta pré-liminar
4. Carlos agenda reunião → notificação aparece no sistema para Felipe
5. Trocar para WhatsApp Business na UI → outbound funciona com a nova API

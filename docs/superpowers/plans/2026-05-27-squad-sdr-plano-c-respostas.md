# Squad SDR Autônomo — Plano C: Agente 7 (Respostas + Agendamento)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o Agente 7 — monitoramento de respostas WhatsApp de prospects prospectados, classificação de intenção, geração de rascunho de resposta e aprovação 1-clique pelo operador para fechar o loop até a reunião agendada.

**Pré-requisito:** Planos A e B concluídos (`outreach_leads` com status `sent`, `outreach_messages` enviadas).

**Architecture:** A função `whatsapp-inbound` já existe e recebe webhooks da Evolution API. O Agente 7 estende essa função: quando um número que bateu com um `outreach_lead` responde, a mensagem é roteada para a nova edge fn `sdr-responder` (GPT-4o classifica intenção + gera rascunho + salva em `outreach_responses`). O operador recebe notificação via sistema de notificações existente e aprova com 1 clique. Para agendamento: links Calendly por segmento configurados na tabela `icp_segments` (coluna `calendly_link`) — sem API externa, só inserção do link na mensagem de confirmação.

**Tech Stack:** Supabase Edge Functions Deno · OpenAI GPT-4o · Evolution API (webhook já wired em `whatsapp-inbound`) · Sistema de notificações existente (`notification-dispatcher`) · React + shadcn/ui

---

## File Structure

```
supabase/
  migrations/
    20260527_outreach_responses.sql     # CRIAR — tabela outreach_responses + coluna calendly_link
  functions/
    sdr-responder/
      index.ts                          # CRIAR — Agente 7: classificação + rascunho de resposta
    whatsapp-inbound/
      index.ts                          # MODIFICAR — roteamento de resposta de prospect SDR

src/
  pages/pipeline/
    OutreachResponsesPanel.tsx          # CRIAR — inbox de respostas com aprovação 1-clique
  hooks/
    useOutreachResponses.ts             # CRIAR — queries para outreach_responses
```

---

## Task 1: Migration — outreach_responses + calendly_link

**Files:**
- Create: `supabase/migrations/20260527_outreach_responses.sql`

- [ ] **Passo 1: Criar migration**

```sql
-- supabase/migrations/20260527_outreach_responses.sql

-- Coluna de Calendly por segmento ICP
ALTER TABLE icp_segments
  ADD COLUMN IF NOT EXISTS calendly_link TEXT;

-- Respostas recebidas de prospects
CREATE TABLE IF NOT EXISTS outreach_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  inbound_message TEXT NOT NULL,               -- texto recebido do prospect
  intent TEXT NOT NULL DEFAULT 'unknown'
    CHECK (intent IN ('interest', 'doubt', 'objection', 'disinterest', 'unknown')),
  intent_confidence INTEGER DEFAULT 0 CHECK (intent_confidence BETWEEN 0 AND 100),
  draft_reply TEXT,                            -- rascunho gerado pelo Agente 7
  approved_reply TEXT,                         -- texto final após edição do operador
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'sent', 'ignored')),
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE outreach_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_responses_select" ON outreach_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "outreach_responses_insert" ON outreach_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "outreach_responses_update" ON outreach_responses FOR UPDATE TO authenticated USING (true);
```

- [ ] **Passo 2: Aplicar via Management API**

```bash
curl -X POST \
  https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{"query": "..."}'
```

- [ ] **Passo 3: Popular links Calendly nos segmentos**

```sql
-- Ajustar com os links reais do Calendly/Cal.com antes de rodar
UPDATE icp_segments SET calendly_link = 'https://calendly.com/intellixai/demo-clinicas'    WHERE name = 'clinicas';
UPDATE icp_segments SET calendly_link = 'https://calendly.com/intellixai/demo-imobiliarias' WHERE name = 'imobiliarias';
UPDATE icp_segments SET calendly_link = 'https://calendly.com/intellixai/demo-ecommerce'    WHERE name = 'ecommerce';
UPDATE icp_segments SET calendly_link = 'https://calendly.com/intellixai/demo-geral'        WHERE name = 'contabilidade';
UPDATE icp_segments SET calendly_link = 'https://calendly.com/intellixai/demo-geral'        WHERE name = 'construtoras';
UPDATE icp_segments SET calendly_link = 'https://calendly.com/intellixai/demo-geral'        WHERE name = 'servicos_locais';
```

- [ ] **Passo 4: Commit**

```bash
git add supabase/migrations/20260527_outreach_responses.sql
git commit -m "feat: add outreach_responses table and calendly_link to icp_segments"
```

---

## Task 2: Edge Function — Agente 7 (sdr-responder)

**Files:**
- Create: `supabase/functions/sdr-responder/index.ts`

Recebe o número do prospect e a mensagem inbound, classifica intenção via GPT-4o, gera rascunho de resposta usando o briefing do lead, e salva em `outreach_responses`. Cria notificação para o operador via `notification-dispatcher`.

- [ ] **Passo 1: Criar edge function**

```typescript
// supabase/functions/sdr-responder/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const RESPONDER_SYSTEM = `Você é o Agente 7 do Squad SDR da IntelliX.AI — Assistente de Resposta e Agendamento.

Sua função: analisar a resposta de um prospect e preparar o retorno ideal para o operador aprovar com 1 clique.

INTENÇÕES POSSÍVEIS:
- interest: demonstrou interesse, quer saber mais, fez pergunta positiva
- doubt: dúvida específica sobre o produto/processo
- objection: resistência, cético, "já tentamos antes", preço, etc.
- disinterest: "não tenho interesse", "não é o momento", etc.
- unknown: mensagem ambígua ou incompleta

REGRAS:
1. O rascunho deve ser curto (máx 4 frases) e humano.
2. Para 'interest': inclua o link do Calendly como CTA direto.
3. Para 'doubt': responda a dúvida com dado concreto do briefing. Não inclua Calendly.
4. Para 'objection': use o contra-argumento do briefing. Termine com CTA suave.
5. Para 'disinterest': agradeça brevemente, ofereça retomar em 30 dias. Sem pressão.
6. Para 'unknown': peça confirmação educada em uma frase.

Responda APENAS com JSON válido.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json() as {
      lead_id: string;
      inbound_message: string;
    };
    const { lead_id, inbound_message } = body;

    // Buscar lead + briefing + segmento (para calendly_link)
    const { data: lead, error } = await db
      .from('outreach_leads')
      .select('*, lead_briefings(*), icp_segments(display_name, calendly_link)')
      .eq('id', lead_id)
      .single();
    if (error || !lead) return jsonResponse({ error: 'Lead not found' }, 404);

    const briefing = lead.lead_briefings;
    const calendlyLink = lead.icp_segments?.calendly_link ?? 'https://calendly.com/intellixai/demo-geral';

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: RESPONDER_SYSTEM },
        {
          role: 'user',
          content: `
Empresa: ${lead.company_name}
Segmento: ${lead.icp_segments?.display_name ?? 'desconhecido'}
Ângulo de venda enviado: ${briefing?.sales_angle ?? 'não disponível'}
Objeção provável: ${briefing?.probable_objection ?? 'não identificada'}
Contra-argumento: ${briefing?.objection_counter ?? 'não disponível'}
Link Calendly: ${calendlyLink}

Mensagem recebida do prospect:
"${inbound_message}"

Retorne JSON:
{
  "intent": "interest | doubt | objection | disinterest | unknown",
  "intent_confidence": 0-100,
  "draft_reply": "rascunho da resposta"
}`.trim(),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content ?? '{}') as {
      intent: string;
      intent_confidence: number;
      draft_reply: string;
    };

    // Salvar resposta
    const { data: response, error: resErr } = await db
      .from('outreach_responses')
      .insert({
        lead_id,
        inbound_message,
        intent: result.intent,
        intent_confidence: result.intent_confidence,
        draft_reply: result.draft_reply,
        status: 'pending',
      })
      .select('id')
      .single();
    if (resErr) throw resErr;

    // Atualizar status do lead
    await db.from('outreach_leads').update({ status: 'replied' }).eq('id', lead_id);

    // Criar notificação para o operador via sistema existente
    await db.from('notifications').insert({
      type: 'sdr_response',
      title: `${lead.company_name} respondeu`,
      body: `Intenção: ${result.intent} (${result.intent_confidence}%). Clique para aprovar a resposta.`,
      data: { response_id: response?.id, lead_id },
      is_read: false,
    });

    return jsonResponse({ success: true, intent: result.intent, response_id: response?.id });
  } catch (err) {
    console.error('[sdr-responder]', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
```

- [ ] **Passo 2: Deploy**

```bash
supabase functions deploy sdr-responder --project-ref hynadwlwrscvjubryqlg
```

- [ ] **Passo 3: Commit**

```bash
git add supabase/functions/sdr-responder/index.ts
git commit -m "feat: add sdr-responder edge function (Agente 7)"
```

---

## Task 3: Modificar whatsapp-inbound — roteamento SDR

**Files:**
- Modify: `supabase/functions/whatsapp-inbound/index.ts`

Adicionar checagem: se o número do remetente existe em `outreach_leads.contact_value` com status `sent`, rotear para `sdr-responder` em vez do fluxo normal Bia/Carlos.

- [ ] **Passo 1: Ler o arquivo atual completo antes de modificar**

```bash
cat supabase/functions/whatsapp-inbound/index.ts
```

Identificar onde a mensagem inbound é processada após ser extraída (logo após `detectProvider` ou equivalente).

- [ ] **Passo 2: Adicionar roteamento SDR (inserir logo após extração da mensagem)**

```typescript
// Inserir no início do handler POST, após extrair `{ phone, text }` da mensagem:

// ── Verificar se é resposta de prospect SDR ─────────────────────────────────
const normalizedPhone = phone.replace(/\D/g, '');
const { data: sdrLead } = await adminClient()
  .from('outreach_leads')
  .select('id, status')
  .or(`contact_value.eq.${phone},contact_value.eq.${normalizedPhone},contact_value.eq.+${normalizedPhone}`)
  .in('status', ['sent', 'replied'])
  .maybeSingle();

if (sdrLead) {
  // Rotear para o Agente 7 — não processar pelo fluxo normal Bia/Carlos
  await fetch(`${FUNCTIONS_URL}/sdr-responder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ lead_id: sdrLead.id, inbound_message: text }),
  });
  return new Response('OK', { headers: corsHeaders });
}
// ── Fluxo normal Bia/Carlos continua abaixo ──────────────────────────────────
```

- [ ] **Passo 3: Deploy com o roteamento atualizado**

```bash
supabase functions deploy whatsapp-inbound --project-ref hynadwlwrscvjubryqlg
```

- [ ] **Passo 4: Commit**

```bash
git add supabase/functions/whatsapp-inbound/index.ts
git commit -m "feat: route SDR prospect replies to sdr-responder in whatsapp-inbound"
```

---

## Task 4: Hook + UI — Inbox de Respostas

**Files:**
- Create: `src/hooks/useOutreachResponses.ts`
- Create: `src/pages/pipeline/OutreachResponsesPanel.tsx`
- Modify: `src/pages/pipeline/OutreachLeadsTab.tsx` — adicionar painel de respostas pendentes

- [ ] **Passo 1: Hook de respostas**

```typescript
// src/hooks/useOutreachResponses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OutreachResponse {
  id: string;
  lead_id: string;
  inbound_message: string;
  intent: 'interest' | 'doubt' | 'objection' | 'disinterest' | 'unknown';
  intent_confidence: number;
  draft_reply: string | null;
  approved_reply: string | null;
  status: 'pending' | 'approved' | 'sent' | 'ignored';
  received_at: string;
  outreach_leads?: { company_name: string; contact_value: string; contact_channel: string };
}

export function usePendingResponses() {
  return useQuery({
    queryKey: ['outreach_responses', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_responses')
        .select('*, outreach_leads(company_name, contact_value, contact_channel)')
        .eq('status', 'pending')
        .order('received_at', { ascending: false });
      if (error) throw error;
      return data as OutreachResponse[];
    },
    refetchInterval: 30_000, // Poll a cada 30s para novas respostas
  });
}

export function useApproveResponse() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      response_id,
      approved_reply,
      lead_contact,
      channel,
    }: {
      response_id: string;
      approved_reply: string;
      lead_contact: string;
      channel: string;
    }) => {
      // Enviar via canal
      if (channel === 'whatsapp') {
        await supabase.functions.invoke('send-whatsapp', {
          body: { to: lead_contact, message: approved_reply },
        });
      } else if (channel === 'email') {
        await supabase.functions.invoke('send-email', {
          body: { to: lead_contact, subject: 'Resposta IntelliX.AI', body: approved_reply },
        });
      }
      // Marcar como sent
      await supabase.from('outreach_responses').update({
        approved_reply,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', response_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_responses'] });
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
      toast({ title: 'Resposta enviada!' });
    },
    onError: (err) => {
      toast({ title: 'Erro ao enviar', description: String(err), variant: 'destructive' });
    },
  });
}

export function useIgnoreResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (response_id: string) => {
      await supabase.from('outreach_responses').update({ status: 'ignored' }).eq('id', response_id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach_responses'] }),
  });
}
```

- [ ] **Passo 2: Criar painel de respostas**

```tsx
// src/pages/pipeline/OutreachResponsesPanel.tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Check, X, Clock } from 'lucide-react';
import { usePendingResponses, useApproveResponse, useIgnoreResponse } from '@/hooks/useOutreachResponses';

const INTENT_LABELS = {
  interest: { label: 'Interesse', color: 'default' },
  doubt: { label: 'Dúvida', color: 'outline' },
  objection: { label: 'Objeção', color: 'destructive' },
  disinterest: { label: 'Desinteresse', color: 'secondary' },
  unknown: { label: 'Indefinido', color: 'outline' },
} as const;

export function OutreachResponsesPanel() {
  const { data: responses = [], isLoading } = usePendingResponses();
  const approveResponse = useApproveResponse();
  const ignoreResponse = useIgnoreResponse();
  const [editMap, setEditMap] = useState<Record<string, string>>({});

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando respostas...</div>;
  if (!responses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">Nenhuma resposta pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="w-4 h-4" />
        {responses.length} resposta(s) aguardando aprovação
      </div>

      {responses.map((r) => {
        const intentInfo = INTENT_LABELS[r.intent];
        const currentText = editMap[r.id] ?? r.draft_reply ?? '';
        const lead = r.outreach_leads;

        return (
          <Card key={r.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{lead?.company_name ?? 'Lead'}</CardTitle>
                <Badge variant={intentInfo.color as 'default' | 'secondary' | 'outline' | 'destructive'}>
                  {intentInfo.label} · {r.intent_confidence}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground italic">
                "{r.inbound_message}"
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={currentText}
                onChange={(e) => setEditMap((m) => ({ ...m, [r.id]: e.target.value }))}
                rows={3}
                className="text-sm"
                placeholder="Rascunho de resposta..."
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => ignoreResponse.mutate(r.id)}
                  disabled={ignoreResponse.isPending}
                >
                  <X className="w-3 h-3 mr-1" />
                  Ignorar
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    approveResponse.mutate({
                      response_id: r.id,
                      approved_reply: currentText,
                      lead_contact: lead?.contact_value ?? '',
                      channel: lead?.contact_channel ?? 'whatsapp',
                    })
                  }
                  disabled={approveResponse.isPending || !currentText.trim()}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aprovar e Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Passo 3: Adicionar aba "Respostas" na OutreachLeadsTab**

```tsx
// Em OutreachLeadsTab.tsx, adicionar tab interna:
import { OutreachResponsesPanel } from './OutreachResponsesPanel';
import { usePendingResponses } from '@/hooks/useOutreachResponses';

// Na seção de tabs da OutreachLeadsTab:
const { data: pending = [] } = usePendingResponses();

// Adicionar tab:
<TabsTrigger value="responses">
  Respostas {pending.length > 0 && <Badge className="ml-1 h-4 text-xs">{pending.length}</Badge>}
</TabsTrigger>
<TabsContent value="responses">
  <OutreachResponsesPanel />
</TabsContent>
```

- [ ] **Passo 4: Commit**

```bash
git add src/hooks/useOutreachResponses.ts \
        src/pages/pipeline/OutreachResponsesPanel.tsx \
        src/pages/pipeline/OutreachLeadsTab.tsx
git commit -m "feat: add OutreachResponsesPanel — 1-click response approval (Agente 7)"
```

---

## Self-Review

**Cobertura (Agente 7):**
- [x] Canais monitorados: WhatsApp via `whatsapp-inbound` ✅ | Email/LinkedIn (futuro — sem webhook hoje)
- [x] Classificação de intenção: 5 categorias + confidence score ✅
- [x] Fluxo por intenção: interest → Calendly | doubt → resposta briefing | objection → contra-arg | disinterest → arquivo | unknown → confirmação ✅
- [x] Aprovação 1-clique: botão "Aprovar e Enviar" com edição inline ✅
- [x] Calendly por segmento: `icp_segments.calendly_link` ✅ (sem API, só link na mensagem)
- [x] Notificação ao operador: via tabela `notifications` existente ✅
- [x] Lead status `replied` após resposta recebida ✅
- [x] Poll em tempo real: `refetchInterval: 30s` no hook ✅

**Simplificações do MVP:**
- Email/LinkedIn: sem webhook de respostas hoje. Operador precisa colar a resposta manualmente na UI se chegar por esses canais.
- Calendly API: não integrado — só link inserido na mensagem. Reunião confirmada manualmente.
- Follow-up automático em 7 dias: adiado para fase futura (tarefa de job scheduler).

---

*Plano C salvo — 2026-05-27 | intellix-squad-hub*

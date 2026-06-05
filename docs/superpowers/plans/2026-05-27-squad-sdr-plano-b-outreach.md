# Squad SDR Autônomo — Plano B: Agentes 5 e 6 + UI de Aprovação (Copywriting + Envio)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os Agentes 5 (Gestor de Canal + Copywriter) e 6 (Revisor de Humanização), a tabela `outreach_messages`, e a UI de aprovação 1-clique que permite ao operador revisar e disparar mensagens via WhatsApp/email.

**Pré-requisito:** Plano A concluído (`outreach_leads`, `lead_briefings`, `sdr-analyst` funcionando).

**Architecture:** Edge function `sdr-copywriter` lê o briefing e gera mensagem por canal/segmento usando GPT-4o com few-shot examples. Edge function `sdr-humanizer` aplica checklist e devolve score 0-10 + sugestões. UI adiciona coluna de aprovação no `OutreachLeadsTab` existente com botão "Aprovar e Enviar" que chama `send-whatsapp` ou `send-email` (ambos já deployados).

**Tech Stack:** Supabase Edge Functions Deno · OpenAI GPT-4o · Evolution API (WhatsApp, já wired) · Resend (email, já wired) · React + shadcn/ui

---

## File Structure

```
supabase/
  migrations/
    20260527_outreach_messages.sql    # CRIAR — tabela outreach_messages
  functions/
    sdr-copywriter/
      index.ts                        # CRIAR — Agente 5: gera copy por canal/segmento
    sdr-humanizer/
      index.ts                        # CRIAR — Agente 6: score de humanização + rewrite

src/
  pages/pipeline/
    OutreachApprovalCard.tsx          # CRIAR — card de aprovação com mensagem + botões
  hooks/
    useOutreachMessages.ts            # CRIAR — queries para outreach_messages
```

---

## Task 1: Migration — Tabela outreach_messages

**Files:**
- Create: `supabase/migrations/20260527_outreach_messages.sql`

- [ ] **Passo 1: Criar migration**

```sql
-- supabase/migrations/20260527_outreach_messages.sql

CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'linkedin', 'instagram')),
  message_text TEXT NOT NULL,
  humanization_score INTEGER NOT NULL DEFAULT 0 CHECK (humanization_score BETWEEN 0 AND 10),
  humanizer_issues JSONB DEFAULT '[]'::jsonb,   -- lista de problemas encontrados pelo Agente 6
  humanizer_suggestions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  approved_by TEXT,                              -- uid do operador que aprovou
  model_used TEXT NOT NULL DEFAULT 'gpt-4o',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)                                -- uma mensagem ativa por lead
);

ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_messages_select" ON outreach_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "outreach_messages_insert" ON outreach_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "outreach_messages_update" ON outreach_messages FOR UPDATE TO authenticated USING (true);
```

- [ ] **Passo 2: Aplicar via Management API**

```bash
curl -X POST \
  https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{"query": "..."}'
```

- [ ] **Passo 3: Commit**

```bash
git add supabase/migrations/20260527_outreach_messages.sql
git commit -m "feat: add outreach_messages table"
```

---

## Task 2: Edge Function — Agente 5 (sdr-copywriter)

**Files:**
- Create: `supabase/functions/sdr-copywriter/index.ts`

- [ ] **Passo 1: Criar edge function**

```typescript
// supabase/functions/sdr-copywriter/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

// Few-shot examples por canal
const FEW_SHOT_WHATSAPP = `
EXEMPLO (clínica, WhatsApp):
---
Vi que a Clínica Sorriso tem ótimas avaliações no Google, mas alguns pacientes mencionaram dificuldade para agendar fora do horário comercial.

Montei um fluxo rápido mostrando como seria um agendamento automático 24h para vocês: [link do vídeo]

Faz sentido eu mostrar isso funcionando ao vivo?
---

EXEMPLO (imobiliária, WhatsApp):
---
Analisei o site da Imóveis Premium e percebi que os leads chegam pelo formulário mas ficam esperando resposta por horas — o que faz o comprador desistir e ir para o concorrente.

Desenhei um fluxo de qualificação automática que responde em segundos: [link]

Vale 20 minutos para ver ao vivo?
---`;

const FEW_SHOT_LINKEDIN = `
EXEMPLO (B2B, LinkedIn):
---
Oi [Nome], vi que a [Empresa] está crescendo o time comercial — vi 3 vagas de SDR abertas no LinkedIn.

Antes de contratar, vale ver como outras empresas do segmento de vocês estão usando automação para multiplicar a capacidade do time atual sem aumentar o headcount.

Posso mostrar um caso concreto em 20 minutos?
---`;

const SYSTEM_PROMPT = `Você é o Agente 5 do Squad SDR da IntelliX.AI — Gestor de Canal e Copywriter de Outreach.

REGRAS ABSOLUTAS:
1. NUNCA comece com apresentação da IntelliX.AI. Comece sempre pela dor do prospect.
2. Faça referência específica e verificável ao negócio do lead (nome, algo observado).
3. Entregue valor imediato — inclua o placeholder [link do vídeo] onde o vídeo será inserido.
4. CTA de baixo atrito — não peça compromisso. "Vale 20 minutos?" é melhor que "Podemos agendar?"
5. Sem listas, sem formatação corporativa em canais informais.
6. Tom alinhado ao canal e segmento fornecidos.
7. Máximo 5 frases no total.

Responda APENAS com o texto da mensagem, sem explicações adicionais.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await requireAdmin(authHeader, db);

    const { lead_id } = await req.json() as { lead_id: string };

    // Buscar lead + briefing
    const { data: lead, error } = await db
      .from('outreach_leads')
      .select('*, icp_segments(*), lead_briefings(*)')
      .eq('id', lead_id)
      .single();
    if (error || !lead) return jsonResponse({ error: 'Lead not found' }, 404);

    const briefing = lead.lead_briefings;
    if (!briefing) return jsonResponse({ error: 'Briefing not generated yet — run sdr-analyst first' }, 400);

    const channel = briefing.ideal_channel as string;
    const fewShot = channel === 'linkedin' ? FEW_SHOT_LINKEDIN : FEW_SHOT_WHATSAPP;

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${fewShot}\n\nAgora escreva a mensagem para:\n\nEmpresa: ${lead.company_name}\nSegmento: ${lead.icp_segments?.display_name}\nDor principal: ${briefing.main_pain}\nÂngulo de venda: ${briefing.sales_angle}\nTom: ${briefing.recommended_tone}\nCanal: ${channel}` },
      ],
      temperature: 0.7,
    });

    const messageText = completion.choices[0].message.content?.trim() ?? '';

    // Salvar mensagem como draft
    const { error: msgErr } = await db.from('outreach_messages').upsert({
      lead_id,
      channel,
      message_text: messageText,
      status: 'draft',
      model_used: 'gpt-4o',
    }, { onConflict: 'lead_id' });
    if (msgErr) throw msgErr;

    // Atualizar status do lead
    await db.from('outreach_leads').update({ status: 'pending_approval' }).eq('id', lead_id);

    return jsonResponse({ success: true, message: messageText, channel });
  } catch (err) {
    console.error('[sdr-copywriter]', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
```

- [ ] **Passo 2: Deploy e smoke test**

```bash
supabase functions deploy sdr-copywriter --project-ref hynadwlwrscvjubryqlg

curl -X POST \
  https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/sdr-copywriter \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"lead_id": "<uuid-com-briefing>"}'
```

Esperado: `{"success": true, "message": "...", "channel": "whatsapp"}`.

- [ ] **Passo 3: Commit**

```bash
git add supabase/functions/sdr-copywriter/index.ts
git commit -m "feat: add sdr-copywriter edge function (Agente 5)"
```

---

## Task 3: Edge Function — Agente 6 (sdr-humanizer)

**Files:**
- Create: `supabase/functions/sdr-humanizer/index.ts`

- [ ] **Passo 1: Criar edge function**

```typescript
// supabase/functions/sdr-humanizer/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

// Palavras-gatilho corporativas que delatam IA
const AI_TELLS = [
  'alavancar', 'potencializar', 'robustecer', 'otimizar', 'maximizar',
  'expertise', 'soluções inovadoras', 'podemos ajudar', 'somos especialistas',
  'transformação digital', 'impulsionar', 'estratégia personalizada',
];

const HUMANIZER_PROMPT = `Você é o Agente 6 do Squad SDR da IntelliX.AI — Revisor de Humanização.

Analise a mensagem e retorne JSON com:
- score: 0-10 (10 = parece escrito por humano, 0 = obviamente gerado por IA)
- issues: lista de problemas encontrados
- suggestions: lista de melhorias específicas
- rewritten: versão reescrita com score >= 8 (OBRIGATÓRIO se score < 8)

CRITÉRIOS DE AVALIAÇÃO:
- Abre pela dor do prospect (não pela empresa)? (+2 pontos)
- Contém referência específica e verificável ao negócio? (+2 pontos)
- Tom alinhado ao canal? (+1 ponto)
- Sem listas em canais informais? (+1 ponto)
- Passa no "teste do WhatsApp" (um humano mandaria assim a um colega)? (+2 pontos)
- Sem palavras-gatilho corporativas? (+1 ponto)
- CTA de baixo atrito? (+1 ponto)

Responda APENAS com JSON válido.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await requireAdmin(authHeader, db);

    const { lead_id } = await req.json() as { lead_id: string };

    const { data: msg, error } = await db
      .from('outreach_messages')
      .select('*, outreach_leads!inner(company_name, contact_channel)')
      .eq('lead_id', lead_id)
      .single();
    if (error || !msg) return jsonResponse({ error: 'Message not found — run sdr-copywriter first' }, 404);

    // Pre-check: detectar AI tells antes de chamar GPT
    const lowerMsg = msg.message_text.toLowerCase();
    const detectedTells = AI_TELLS.filter((t) => lowerMsg.includes(t));

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: HUMANIZER_PROMPT },
        { role: 'user', content: `Canal: ${msg.channel}\nEmpresa do lead: ${msg.outreach_leads.company_name}\n\nMensagem para avaliar:\n"${msg.message_text}"${detectedTells.length > 0 ? `\n\nAI-tells detectados automaticamente: ${detectedTells.join(', ')}` : ''}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0].message.content ?? '{}') as {
      score: number;
      issues: string[];
      suggestions: string[];
      rewritten?: string;
    };

    // Se score >= 8, manter mensagem original; se < 8, usar reescrita
    const finalMessage = result.score >= 8 ? msg.message_text : (result.rewritten ?? msg.message_text);

    await db.from('outreach_messages').update({
      message_text: finalMessage,
      humanization_score: result.score,
      humanizer_issues: result.issues,
      humanizer_suggestions: result.suggestions,
    }).eq('lead_id', lead_id);

    return jsonResponse({ score: result.score, issues: result.issues, rewritten: result.score < 8 });
  } catch (err) {
    console.error('[sdr-humanizer]', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
```

- [ ] **Passo 2: Deploy e smoke test**

```bash
supabase functions deploy sdr-humanizer --project-ref hynadwlwrscvjubryqlg
```

- [ ] **Passo 3: Commit**

```bash
git add supabase/functions/sdr-humanizer/index.ts
git commit -m "feat: add sdr-humanizer edge function (Agente 6)"
```

---

## Task 4: UI de Aprovação 1-Clique

**Files:**
- Create: `src/pages/pipeline/OutreachApprovalCard.tsx`
- Modify: `src/pages/pipeline/OutreachLeadsTab.tsx` — integrar o card
- Modify: `src/hooks/useOutreachMessages.ts` — CRIAR (faltou no Plano A)

- [ ] **Passo 1: Hook para mensagens**

```typescript
// src/hooks/useOutreachMessages.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useGenerateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead_id: string) => {
      // Pipeline: copywriter → humanizer
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };

      const copyRes = await supabase.functions.invoke('sdr-copywriter', { body: { lead_id } });
      if (copyRes.error) throw copyRes.error;

      const humanRes = await supabase.functions.invoke('sdr-humanizer', { body: { lead_id } });
      if (humanRes.error) throw humanRes.error;

      return humanRes.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
    },
  });
}

export function useApproveAndSend() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ lead_id, channel, message }: {
      lead_id: string;
      channel: string;
      message: string;
    }) => {
      // Buscar lead para pegar contact_value
      const { data: lead } = await supabase
        .from('outreach_leads')
        .select('contact_value, company_name')
        .eq('id', lead_id)
        .single();
      if (!lead) throw new Error('Lead not found');

      // Enviar via canal correto
      if (channel === 'whatsapp') {
        await supabase.functions.invoke('send-whatsapp', {
          body: { to: lead.contact_value, message },
        });
      } else if (channel === 'email') {
        await supabase.functions.invoke('send-email', {
          body: { to: lead.contact_value, subject: `IntelliX.AI para ${lead.company_name}`, body: message },
        });
      }

      // Marcar mensagem como enviada
      await supabase.from('outreach_messages').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('lead_id', lead_id);

      // Atualizar status do lead
      await supabase.from('outreach_leads').update({ status: 'sent' }).eq('id', lead_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
      toast({ title: 'Mensagem enviada!' });
    },
    onError: (err) => {
      toast({ title: 'Erro ao enviar', description: String(err), variant: 'destructive' });
    },
  });
}
```

- [ ] **Passo 2: Card de aprovação**

```tsx
// src/pages/pipeline/OutreachApprovalCard.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit, Send, RefreshCw } from 'lucide-react';
import { useApproveAndSend, useGenerateMessage } from '@/hooks/useOutreachMessages';
import type { OutreachLead } from '@/types/outreach';

interface Props {
  lead: OutreachLead & {
    outreach_messages?: {
      channel: string;
      message_text: string;
      humanization_score: number;
      status: string;
    };
  };
}

export function OutreachApprovalCard({ lead }: Props) {
  const msg = lead.outreach_messages;
  const [editedText, setEditedText] = useState(msg?.message_text ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const generateMessage = useGenerateMessage();
  const approveAndSend = useApproveAndSend();

  if (!msg) {
    return (
      <Card>
        <CardContent className="pt-4">
          <Button
            onClick={() => generateMessage.mutate(lead.id)}
            disabled={generateMessage.isPending}
            size="sm"
          >
            {generateMessage.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
            Gerar mensagem
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Mensagem para {lead.company_name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Canal: {msg.channel}
            </Badge>
            <Badge
              variant={msg.humanization_score >= 8 ? 'default' : 'destructive'}
              className="text-xs"
            >
              Score: {msg.humanization_score}/10
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={6}
            className="text-sm"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-3">{editedText}</p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing((v) => !v)}
          >
            <Edit className="w-3 h-3 mr-1" />
            {isEditing ? 'Visualizar' : 'Editar'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateMessage.mutate(lead.id)}
            disabled={generateMessage.isPending}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${generateMessage.isPending ? 'animate-spin' : ''}`} />
            Regerar
          </Button>
          <Button
            size="sm"
            onClick={() => approveAndSend.mutate({
              lead_id: lead.id,
              channel: msg.channel,
              message: editedText,
            })}
            disabled={approveAndSend.isPending || msg.status === 'sent'}
            className="ml-auto"
          >
            {msg.status === 'sent' ? (
              <><CheckCircle className="w-3 h-3 mr-1" /> Enviada</>
            ) : (
              <><Send className="w-3 h-3 mr-1" /> Aprovar e Enviar</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Passo 3: Integrar na OutreachLeadsTab**

No `OutreachLeadsTab.tsx` criado no Plano A, adicionar `OutreachApprovalCard` no modal/dialog de detalhe do lead:

```tsx
// Adicionar dentro do Dialog de briefing, após os dados do briefing:
{selectedLead?.status === 'pending_approval' || selectedLead?.status === 'briefed' ? (
  <OutreachApprovalCard lead={selectedLead} />
) : null}
```

- [ ] **Passo 4: Commit**

```bash
git add supabase/functions/sdr-copywriter/ supabase/functions/sdr-humanizer/ \
        src/hooks/useOutreachMessages.ts src/pages/pipeline/OutreachApprovalCard.tsx \
        src/pages/pipeline/OutreachLeadsTab.tsx
git commit -m "feat: add outreach approval UI with 1-click send (Agentes 5+6)"
```

---

## Self-Review

**Cobertura (Agentes 5 e 6):**
- [x] Agente 5 — matriz canais por segmento: configurada via `briefing.ideal_channel` (herdado do Agente 2) ✅
- [x] Agente 5 — estrutura padrão de mensagem: few-shot examples por canal ✅
- [x] Agente 5 — exemplo WhatsApp clínica: incluído no few-shot ✅
- [x] Agente 6 — checklist de revisão: 8 critérios implementados no prompt ✅
- [x] Agente 6 — sinais de alerta: AI_TELLS list + detecção pré-GPT ✅
- [x] Agente 6 — score >= 8: auto-reescrita abaixo de 8 ✅
- [x] UI — aprovação 1-clique: botão "Aprovar e Enviar" ✅
- [x] UI — edição antes de enviar: Textarea editável ✅
- [x] Envio WhatsApp: via `send-whatsapp` existente ✅
- [x] Envio Email: via `send-email` existente ✅

**Próximo:** Plano C (Agente 7 — respostas + Calendly)

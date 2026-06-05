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
          content: `Empresa: ${lead.company_name}
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
}`,
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

    await db.from('outreach_leads').update({ status: 'replied' }).eq('id', lead_id);

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

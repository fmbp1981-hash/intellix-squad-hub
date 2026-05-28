import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

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

    const { data: lead, error } = await db
      .from('outreach_leads')
      .select('*, icp_segments(*), lead_briefings(*)')
      .eq('id', lead_id)
      .single();
    if (error || !lead) return jsonResponse({ error: 'Lead not found' }, 404);

    const briefing = Array.isArray(lead.lead_briefings)
      ? lead.lead_briefings[0]
      : lead.lead_briefings;
    if (!briefing) return jsonResponse({ error: 'Briefing not generated yet — run sdr-analyst first' }, 400);

    const channel = briefing.ideal_channel as string;
    const fewShot = channel === 'linkedin' ? FEW_SHOT_LINKEDIN : FEW_SHOT_WHATSAPP;

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${fewShot}\n\nAgora escreva a mensagem para:\n\nEmpresa: ${lead.company_name}\nSegmento: ${(lead.icp_segments as { display_name?: string } | null)?.display_name ?? ''}\nDor principal: ${briefing.main_pain}\nÂngulo de venda: ${briefing.sales_angle}\nTom: ${briefing.recommended_tone}\nCanal: ${channel}`,
        },
      ],
      temperature: 0.7,
    });

    const messageText = completion.choices[0].message.content?.trim() ?? '';

    const { error: msgErr } = await db.from('outreach_messages').upsert({
      lead_id,
      channel,
      message_text: messageText,
      status: 'draft',
      model_used: 'gpt-4o',
    }, { onConflict: 'lead_id' });
    if (msgErr) throw msgErr;

    await db.from('outreach_leads').update({ status: 'pending_approval' }).eq('id', lead_id);

    return jsonResponse({ success: true, message: messageText, channel });
  } catch (err) {
    console.error('[sdr-copywriter]', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

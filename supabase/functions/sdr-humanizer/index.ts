import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

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
    const authResult = await requireAdmin(req);
    if ('error' in authResult) return authResult.error;
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { lead_id } = await req.json() as { lead_id: string };

    const { data: msg, error } = await db
      .from('outreach_messages')
      .select('*, outreach_leads!inner(company_name, contact_channel)')
      .eq('lead_id', lead_id)
      .single();
    if (error || !msg) return jsonResponse({ error: 'Message not found — run sdr-copywriter first' }, 404);

    const lowerMsg = (msg.message_text as string).toLowerCase();
    const detectedTells = AI_TELLS.filter((t) => lowerMsg.includes(t));

    const outreachLead = msg.outreach_leads as { company_name: string; contact_channel: string };

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: HUMANIZER_PROMPT },
        {
          role: 'user',
          content: `Canal: ${msg.channel}\nEmpresa do lead: ${outreachLead.company_name}\n\nMensagem para avaliar:\n"${msg.message_text}"${detectedTells.length > 0 ? `\n\nAI-tells detectados automaticamente: ${detectedTells.join(', ')}` : ''}`,
        },
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

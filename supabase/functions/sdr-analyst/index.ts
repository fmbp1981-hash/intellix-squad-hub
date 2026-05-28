import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const ANALYST_SYSTEM_PROMPT = `Você é o Agente 2 do Squad SDR da IntelliX.AI — Analista de Contexto.
Sua função: analisar o contexto público de uma empresa e gerar um briefing de uma página que alimentará os agentes de copywriting e resposta.

REGRAS ABSOLUTAS:
- Baseie-se APENAS nas informações fornecidas no contexto. Nunca invente dados.
- O briefing deve ser direto, sem enrolação, em português brasileiro.
- Identifique a dor com precisão cirúrgica — não genérica.
- O ângulo de venda deve ser uma frase de impacto de até 15 palavras.
- A objeção provável deve ser a mais realista, não a mais fácil de rebater.

Responda SOMENTE com JSON válido no formato especificado.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await requireAdmin(authHeader, db);

    const { lead_id } = await req.json() as { lead_id: string };

    const { data: lead, error: leadErr } = await db
      .from('outreach_leads')
      .select('*, icp_segments(*)')
      .eq('id', lead_id)
      .single();
    if (leadErr || !lead) return jsonResponse({ error: 'Lead not found' }, 404);

    await db.from('outreach_leads').update({ status: 'analyzing' }).eq('id', lead_id);

    const context = await collectPublicContext(lead);
    const userPrompt = buildAnalystPrompt(lead, context);

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: ANALYST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const briefingData = JSON.parse(completion.choices[0].message.content ?? '{}') as {
      main_pain: string;
      intellix_solution: string;
      sales_angle: string;
      recommended_tone: 'formal' | 'descontraido' | 'tecnico';
      probable_objection: string;
      objection_counter: string;
      ideal_channel: string;
    };

    const { error: briefErr } = await db.from('lead_briefings').upsert({
      lead_id,
      company_name: lead.company_name,
      segment: lead.icp_segments?.display_name ?? lead.icp_segments?.name ?? 'desconhecido',
      main_pain: briefingData.main_pain,
      intellix_solution: briefingData.intellix_solution,
      sales_angle: briefingData.sales_angle,
      recommended_tone: briefingData.recommended_tone,
      probable_objection: briefingData.probable_objection,
      objection_counter: briefingData.objection_counter,
      ideal_channel: briefingData.ideal_channel,
      sources_analyzed: context.sources_analyzed,
      raw_context: context.raw,
      model_used: 'gpt-4o',
    }, { onConflict: 'lead_id' });
    if (briefErr) throw briefErr;

    await db.from('outreach_leads').update({ status: 'briefed' }).eq('id', lead_id);

    return jsonResponse({ success: true, briefing: briefingData });
  } catch (err) {
    console.error('[sdr-analyst]', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

interface LeadContext {
  sources_analyzed: string[];
  raw: Record<string, unknown>;
  website_text?: string;
}

async function collectPublicContext(lead: {
  company_name: string;
  website_url?: string | null;
  icp_segments?: { pain_description: string } | null;
}): Promise<LeadContext> {
  const context: LeadContext = { sources_analyzed: [], raw: {} };

  if (lead.website_url) {
    try {
      const res = await fetch(lead.website_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IntelliX-SDR-Bot/1.0)' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const html = await res.text();
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000);
        context.website_text = text;
        context.sources_analyzed.push('site');
        context.raw.website = text;
      }
    } catch (_e) {
      // Site inacessível — não é erro fatal
    }
  }

  return context;
}

function buildAnalystPrompt(
  lead: {
    company_name: string;
    probable_pain?: string | null;
    contact_channel: string;
    icp_segments?: { display_name: string; pain_description: string } | null;
  },
  context: LeadContext
): string {
  return `Analise a empresa abaixo e gere o briefing de prospecção.

EMPRESA: ${lead.company_name}
SEGMENTO: ${lead.icp_segments?.display_name ?? 'não identificado'}
CANAL DE CONTATO: ${lead.contact_channel}
DOR PROVÁVEL DO SEGMENTO: ${lead.icp_segments?.pain_description ?? lead.probable_pain ?? 'não identificada'}

CONTEXTO COLETADO:
${context.website_text ? `Site institucional (primeiros 3000 caracteres):\n${context.website_text}` : 'Site não disponível'}

Gere o briefing no JSON:
{
  "main_pain": "dor principal identificada (1-2 frases concretas)",
  "intellix_solution": "produto ou serviço IntelliX que resolve (ex: Agente de Atendimento 24h)",
  "sales_angle": "frase de impacto de até 15 palavras",
  "recommended_tone": "formal | descontraido | tecnico",
  "probable_objection": "objeção mais provável do decisor",
  "objection_counter": "como rebater com prova concreta da IntelliX",
  "ideal_channel": "${lead.contact_channel}"
}`.trim();
}

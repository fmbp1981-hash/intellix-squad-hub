import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const SEGMENT_PALETTE: Record<string, string> = {
  clinicas: 'azul (#1E88E5) e branco, transmite confiança e saúde',
  imobiliarias: 'azul escuro (#1A237E) e dourado (#FFC107), transmite solidez e prestígio',
  ecommerce: 'laranja (#FF6D00) e branco, transmite energia e conversão',
  contabilidade: 'verde escuro (#2E7D32) e branco, transmite segurança e crescimento',
  construtoras: 'cinza chumbo (#37474F) e vermelho tijolo (#B71C1C), transmite solidez',
  servicos_locais: 'teal (#00695C) e branco, transmite confiabilidade e proximidade',
};

const PRD_SYSTEM_PROMPT = `Você é um arquiteto de produto especialista em landing pages de alta conversão para pequenas e médias empresas brasileiras.
Sua tarefa: gerar um PRD (Product Requirements Document) detalhado para uma landing page a ser construída pelo Lovable (gerador de app React).

REGRAS:
- O PRD deve ser em português brasileiro.
- Deve incluir o conteúdo textual de cada seção (headlines, subtítulos, textos dos cards).
- Deve ser específico para o negócio descrito — sem textos genéricos ou placeholders como "Lorem ipsum".
- Máximo de 600 palavras.
- Formato: texto corrido descritivo. Sem markdown, sem listas com traços.

Responda APENAS com o texto do PRD, sem explicações adicionais.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get('Authorization') ?? '';
  const isServiceRole = auth === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isServiceRole) {
    const { requireAdmin } = await import('../_shared/auth.ts');
    const authResult = await requireAdmin(req);
    if ('error' in authResult) return authResult.error;
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { lead_id } = await req.json() as { lead_id: string };

    const { data: lead, error: leadErr } = await db
      .from('outreach_leads')
      .select('*, icp_segments(*), lead_briefings(*)')
      .eq('id', lead_id)
      .single();
    if (leadErr || !lead) return jsonResponse({ error: 'Lead not found' }, 404);

    const briefing = Array.isArray(lead.lead_briefings)
      ? lead.lead_briefings[0]
      : lead.lead_briefings;
    if (!briefing) {
      return jsonResponse({ error: 'Briefing not found — run sdr-analyst first' }, 400);
    }

    const siteAuditScore: number = (briefing as { site_audit_score?: number }).site_audit_score ?? 100;
    const needsRedesign = siteAuditScore < 60 || !lead.website_url;
    if (!needsRedesign) {
      return jsonResponse({
        skipped: true,
        reason: `site_audit_score=${siteAuditScore} — redesign not needed`,
      });
    }

    const segmentName = (lead.icp_segments as { name: string } | null)?.name ?? 'servicos_locais';
    const palette = SEGMENT_PALETTE[segmentName] ?? SEGMENT_PALETTE['servicos_locais'];

    const prdPrompt = buildPrdPrompt(lead, briefing, palette);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: PRD_SYSTEM_PROMPT },
        { role: 'user', content: prdPrompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    });

    const prdText = completion.choices[0].message.content?.trim() ?? '';
    const lovableUrl = buildLovableUrl(prdText);

    const redesignSignals: string[] = Array.isArray(
      (briefing as { redesign_signals?: unknown }).redesign_signals,
    )
      ? (briefing as { redesign_signals: string[] }).redesign_signals
      : [];

    const { error: propErr } = await db.from('site_proposals').upsert(
      {
        lead_id,
        prd_text: prdText,
        lovable_url: lovableUrl,
        redesign_signals: redesignSignals,
        site_audit_score: siteAuditScore,
        status: 'ready',
      },
      { onConflict: 'lead_id' },
    );
    if (propErr) throw propErr;

    return jsonResponse({ success: true, lovable_url: lovableUrl, site_audit_score: siteAuditScore });
  } catch (err) {
    console.error('[sdr-site-builder]', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function buildPrdPrompt(
  lead: { company_name: string; website_url?: string | null },
  briefing: {
    main_pain: string;
    recommended_tone: string;
    segment: string;
  },
  palette: string,
): string {
  return `Crie um PRD completo para a landing page da empresa "${lead.company_name}", do segmento ${briefing.segment}.

CONTEXTO INTERNO (usar para embasar o conteúdo, não mencionar no site):
- Dor identificada: ${briefing.main_pain}
- Tom de comunicação: ${briefing.recommended_tone}
- Site atual: ${lead.website_url ? `existe mas precisa de redesign (${lead.website_url})` : 'não existe — criar do zero'}

ESTRUTURA OBRIGATÓRIA DA LANDING PAGE:
Seção 1 — Hero: headline impactante com no máximo 8 palavras e subtítulo com no máximo 20 palavras. Botão CTA "Fale conosco pelo WhatsApp".
Seção 2 — Serviços: 3 cards, cada um com título (3-4 palavras) e descrição de 2 frases realistas para o segmento.
Seção 3 — Prova social: 2 depoimentos fictícios mas realistas de clientes satisfeitos, com nome e cargo.
Seção 4 — Sobre nós: 3 frases sobre a empresa, transmitindo experiência e comprometimento.
Seção 5 — Contato: formulário com campos nome, telefone e mensagem. Botão WhatsApp flutuante no canto inferior direito.
Rodapé: endereço fictício em São Paulo, links para Instagram e WhatsApp.

DESIGN:
Paleta de cores: ${palette}.
Tipografia: fonte Inter ou Poppins.
Mobile-first, totalmente responsivo.
Estilo moderno, limpo e profissional. Sem animações excessivas.

Gere o PRD completo com todo o conteúdo textual de cada seção já definido.`.trim();
}

function buildLovableUrl(prdText: string): string {
  const encoded = encodeURIComponent(prdText);
  return `https://lovable.dev/?autosubmit=true#prompt=${encoded}`;
}

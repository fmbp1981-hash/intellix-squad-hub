import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SEGMENTS_ROTATION = ['clinicas', 'imobiliarias', 'ecommerce', 'contabilidade', 'construtoras', 'servicos_locais'];
const LOCATIONS = ['São Paulo SP', 'Rio de Janeiro RJ', 'Belo Horizonte MG', 'Curitiba PR', 'Porto Alegre RS'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Allow only service-role or internal calls
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const body = await req.json().catch(() => ({})) as {
    segment_name?: string;
    location?: string;
    limit?: number;
    analyst_top_n?: number;
  };

  const dayOfWeek = new Date().getDay(); // 0=Sun, rotate segments by day
  const segment_name = body.segment_name ?? SEGMENTS_ROTATION[dayOfWeek % SEGMENTS_ROTATION.length];
  const location = body.location ?? LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const limit = body.limit ?? 20;
  const analyst_top_n = body.analyst_top_n ?? 5;

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const fnBase = `${SUPABASE_URL}/functions/v1`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // Step 1: Prospector — find new leads
  let prospected = 0;
  try {
    const prospRes = await fetch(`${fnBase}/sdr-prospector`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ segment_name, location, limit }),
    });
    const prospData = await prospRes.json() as { inserted?: number; total_found?: number };
    prospected = prospData.inserted ?? 0;
    console.log(`[sdr-daily] prospected ${prospected}/${prospData.total_found ?? 0} from ${segment_name} @ ${location}`);
  } catch (e) {
    console.error('[sdr-daily] prospector error:', e);
  }

  // Step 2: Analyst — brief top N freshest unanalyzed leads
  const { data: hotLeads } = await db
    .from('outreach_leads')
    .select('id')
    .eq('status', 'prospected')
    .order('qualification_score', { ascending: false })
    .limit(analyst_top_n);

  let analyzed = 0;
  for (const lead of hotLeads ?? []) {
    try {
      await fetch(`${fnBase}/sdr-analyst`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lead_id: lead.id }),
      });
      analyzed++;
      // Small delay to avoid OpenAI rate limit
      await new Promise((r) => setTimeout(r, 1200));
    } catch (e) {
      console.error(`[sdr-daily] analyst error for lead ${lead.id}:`, e);
    }
  }

  console.log(`[sdr-daily] analyzed ${analyzed} leads`);

  // Step 3: Site Builder — gerar PRD Lovable para leads briefados com site fraco
  const { data: briefedLeads } = await db
    .from('outreach_leads')
    .select('id, lead_briefings(site_audit_score)')
    .eq('status', 'briefed')
    .order('created_at', { ascending: false })
    .limit(analyst_top_n);

  let siteBuilt = 0;
  for (const lead of briefedLeads ?? []) {
    const briefings = lead.lead_briefings as Array<{ site_audit_score: number | null }> | null;
    const auditScore = Array.isArray(briefings) ? (briefings[0]?.site_audit_score ?? 0) : 0;
    if (auditScore >= 60) continue;

    try {
      await fetch(`${fnBase}/sdr-site-builder`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lead_id: lead.id }),
      });
      siteBuilt++;
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`[sdr-daily] site-builder error for lead ${lead.id}:`, e);
    }
  }

  console.log(`[sdr-daily] site proposals generated: ${siteBuilt}`);
  return jsonResponse({ prospected, analyzed, siteBuilt, segment_name, location });
});

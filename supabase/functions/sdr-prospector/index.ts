import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import {
  searchPlacesByQuery,
  getPlaceDetails,
  type GooglePlaceResult,
} from '../_shared/google-places.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')!;
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';
const EVOLUTION_API_KEY_ENV = Deno.env.get('EVOLUTION_API_KEY') ?? '';

const SEGMENT_QUERY_MAP: Record<string, string> = {
  clinicas: 'clínicas e consultórios médicos',
  imobiliarias: 'imobiliárias corretores imóveis',
  ecommerce: 'e-commerce loja online',
  contabilidade: 'escritório de contabilidade',
  construtoras: 'construtoras incorporadoras',
  servicos_locais: 'prestadores serviços locais',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await requireAdmin(authHeader, db);

    if (!GOOGLE_API_KEY) return jsonResponse({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500);

    const body = await req.json() as {
      segment_name: string;
      location: string;
      limit?: number;
    };

    const { segment_name, location, limit = 20 } = body;
    if (!location?.trim()) return jsonResponse({ error: 'location is required' }, 400);

    const { data: segment, error: segErr } = await db
      .from('icp_segments')
      .select('id, pain_description, qualification_signals')
      .eq('name', segment_name)
      .single();
    if (segErr || !segment) return jsonResponse({ error: `Segment '${segment_name}' not found` }, 400);

    const queryBase = SEGMENT_QUERY_MAP[segment_name] ?? segment_name;
    const searchQuery = `${queryBase} em ${location}`;

    const places = await searchPlacesByQuery({ query: searchQuery, apiKey: GOOGLE_API_KEY, limit });
    if (!places.length) return jsonResponse({ inserted: 0, total_found: 0 });

    const detailsResults = await Promise.all(
      places.map((p) => p.place_id ? getPlaceDetails(p.place_id, GOOGLE_API_KEY) : Promise.resolve(null))
    );
    const detailed = detailsResults.filter((d): d is GooglePlaceResult => d !== null);

    const whatsappMap = new Map<string, boolean>();
    const phones = detailed
      .map((d) => (d.international_phone_number ?? d.formatted_phone_number ?? '').replace(/\D/g, ''))
      .filter(Boolean);

    if (phones.length > 0 && EVOLUTION_API_URL && EVOLUTION_API_KEY_ENV) {
      try {
        const evRes = await fetch(`${EVOLUTION_API_URL}/chat/whatsappNumbers/WA-Pessoal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY_ENV },
          body: JSON.stringify({ numbers: phones }),
        });
        if (evRes.ok) {
          const evData = await evRes.json() as Array<{ number: string; exists: boolean }>;
          if (Array.isArray(evData)) {
            evData.forEach((r) => whatsappMap.set(r.number, r.exists === true));
          }
        }
      } catch (_e) {
        // Falha silenciosa — assumir sem dados de WhatsApp
      }
    }

    const rows = detailed
      .filter((d) => d.business_status !== 'CLOSED_PERMANENTLY')
      .map((d) => {
        const rawPhone = d.international_phone_number ?? d.formatted_phone_number ?? '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const hasWhatsApp = whatsappMap.get(cleanPhone) ?? true;

        return {
          company_name: d.name ?? 'Empresa não identificada',
          segment_id: segment.id,
          contact_channel: hasWhatsApp && cleanPhone ? 'whatsapp' : d.website ? 'email' : 'whatsapp',
          contact_value: hasWhatsApp && cleanPhone ? rawPhone : d.website ?? rawPhone,
          source: 'apify_maps' as const,
          google_place_id: d.place_id ?? null,
          website_url: d.website ?? null,
          probable_pain: segment.pain_description,
          qualification_score: scorePlace(d),
          heat_score: 0,
          status: 'prospected' as const,
          raw_places_data: d as unknown as Record<string, unknown>,
        };
      });

    const { data: inserted, error: insErr } = await db
      .from('outreach_leads')
      .upsert(rows, { onConflict: 'google_place_id', ignoreDuplicates: true })
      .select('id');
    if (insErr) throw insErr;

    return jsonResponse({ inserted: inserted?.length ?? 0, total_found: detailed.length });
  } catch (err) {
    console.error('[sdr-prospector]', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function scorePlace(place: GooglePlaceResult): number {
  let score = 40;
  if (!place.website) score += 20;
  if ((place.user_ratings_total ?? 0) > 50) score += 10;
  if ((place.rating ?? 5) < 4.0) score += 15;
  if (place.business_status === 'OPERATIONAL') score += 10;
  return Math.min(100, score);
}

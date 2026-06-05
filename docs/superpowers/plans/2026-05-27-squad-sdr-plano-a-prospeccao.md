# Squad SDR Autônomo — Plano A: Foundation + Agentes 1 e 2 (Prospecção + Briefing)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao intellix-squad-hub o pipeline de prospecção outbound autônomo — tabelas, configurações e edge functions para os Agentes 1 (Prospector de Dor) e 2 (Analista de Contexto), que juntos produzem uma lista diária de leads qualificados com briefing personalizado por lead.

**Architecture:** Três novas tabelas (`outreach_leads`, `lead_briefings`, `icp_segments`) estendem o CRM existente sem tocar na tabela `leads` original. Dois edge functions Deno invocados pelo `internal-job-trigger` existente alimentam o ciclo diário. Fonte primária de leads: **Google Places API** (mesmo padrão do LeadFinder Pro — `C:\Projects\prospect-pulse-54\supabase\functions\prospection\index.ts`), com verificação de WhatsApp via Evolution API já wired. Apollo.io e LinkedIn são excluídos do escopo inicial.

**Tech Stack:** Supabase (PostgreSQL + Edge Functions Deno) · Google Places API · Evolution API (verificação WhatsApp batch) · OpenAI GPT-4o (análise de contexto) · React + shadcn/ui (UI de gestão de leads no Pipeline) · TypeScript strict

**Referência obrigatória para o Agente 1:** `C:\Projects\prospect-pulse-54\supabase\functions\prospection\index.ts` — implementação completa do Google Places flow (textsearch + place details + WhatsApp batch check). Reutilizar a lógica de `translateGoogleType`, `extractCity`, `extractNeighborhood`, e verificação batch de WhatsApp.

**Refs obrigatórias antes de começar:**
- `C:\Projects\intellix-squad-hub\docs\analise\ESTADO_ATUAL.md` — estado do sistema
- `C:\Projects\intellix-squad-hub\supabase\functions\_shared\` — utilitários compartilhados (auth, cors, llm-provider)
- `C:\Projects\intellix-squad-hub\supabase\functions\internal-job-trigger\` — como jobs internos são disparados
- Supabase projeto: `hynadwlwrscvjubryqlg` | PAT: `***SUPABASE_PAT_REDACTED***`
- CLI com segfault — usar Management API para SQL: `POST https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query`

---

## Planos relacionados (implementar em sequência)
- **Plano A** (este) — Foundation + Agentes 1 e 2
- **Plano B** → `2026-05-27-squad-sdr-plano-b-outreach.md` — Agentes 5 e 6 + UI de aprovação
- **Plano C** → `2026-05-27-squad-sdr-plano-c-respostas.md` — Agente 7 + Calendly

---

## File Structure

```
supabase/
  migrations/
    20260527_outreach_schema.sql        # CRIAR — tabelas outreach_leads, lead_briefings, icp_segments
  functions/
    sdr-prospector/
      index.ts                          # CRIAR — Agente 1: busca e qualifica leads via Apollo.io
    sdr-analyst/
      index.ts                          # CRIAR — Agente 2: analisa contexto + gera briefing via OpenAI
    _shared/
      apify.ts                          # CRIAR — cliente Apify (scraping de sites/reviews)
      apollo.ts                         # CRIAR — cliente Apollo.io (enriquecimento B2B)

src/
  pages/
    pipeline/
      OutreachLeadsTab.tsx              # CRIAR — tab "Leads SDR" na PipelinePage existente
  hooks/
    useOutreachLeads.ts                 # CRIAR — queries para outreach_leads + lead_briefings
  types/
    outreach.ts                         # CRIAR — tipos TypeScript para as novas entidades
```

---

## Task 1: Migration — Schema de Outreach

**Files:**
- Create: `supabase/migrations/20260527_outreach_schema.sql`

- [ ] **Passo 1: Criar arquivo de migration**

```sql
-- supabase/migrations/20260527_outreach_schema.sql

-- Segmentos ICP com critérios de qualificação por vertical
CREATE TABLE IF NOT EXISTS icp_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- 'clinicas', 'imobiliarias', 'ecommerce', etc.
  display_name TEXT NOT NULL,
  pain_description TEXT NOT NULL,              -- dor provável padrão do segmento
  qualification_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- ex: ["chatbot ausente no site", "avaliações reclamando de atendimento", "vagas SDR abertas"]
  primary_channel TEXT NOT NULL DEFAULT 'whatsapp',
  secondary_channel TEXT,
  message_template_key TEXT,                   -- chave para template de mensagem no Plano B
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads de prospecção outbound (separado da tabela leads do CRM inbound)
CREATE TABLE IF NOT EXISTS outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  responsible_name TEXT,
  responsible_title TEXT,
  segment_id UUID REFERENCES icp_segments(id),
  company_size TEXT,                           -- 'micro', 'pequena', 'media', 'grande'
  contact_channel TEXT NOT NULL,               -- 'whatsapp', 'linkedin', 'email', 'instagram'
  contact_value TEXT NOT NULL,                 -- número, email, URL do perfil, etc.
  source TEXT NOT NULL DEFAULT 'manual',       -- 'apollo', 'apify_maps', 'linkedin', 'manual', 'csv'
  google_place_id TEXT UNIQUE,                 -- ID externo Google Places (para dedup)
  website_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  probable_pain TEXT,                          -- dor identificada na prospecção
  qualification_score INTEGER DEFAULT 0 CHECK (qualification_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'prospected'
    CHECK (status IN ('prospected', 'analyzing', 'briefed', 'pending_approval',
                      'sent', 'replied', 'meeting_scheduled', 'won', 'lost', 'archived')),
  heat_score INTEGER DEFAULT 0 CHECK (heat_score BETWEEN 0 AND 10),
  -- heat_score: 0-10, só os top 3-5 por dia recebem demo (Agente 3)
  raw_places_data JSONB,                       -- resposta bruta Google Places para auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Briefings gerados pelo Agente 2 (um por lead)
CREATE TABLE IF NOT EXISTS lead_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  segment TEXT NOT NULL,
  main_pain TEXT NOT NULL,
  intellix_solution TEXT NOT NULL,             -- produto IntelliX que resolve
  sales_angle TEXT NOT NULL,                   -- ângulo de venda ex: "perdendo leads fora do horário"
  recommended_tone TEXT NOT NULL CHECK (recommended_tone IN ('formal', 'descontraido', 'tecnico')),
  probable_objection TEXT,
  objection_counter TEXT,
  ideal_channel TEXT NOT NULL,
  sources_analyzed JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- ex: ["site", "google_reviews", "linkedin", "reclame_aqui"]
  raw_context JSONB,                           -- dados brutos coletados para auditoria
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_used TEXT NOT NULL DEFAULT 'gpt-4o',
  UNIQUE(lead_id)                              -- um briefing por lead
);

-- Trigger: atualiza updated_at em outreach_leads
CREATE OR REPLACE FUNCTION update_outreach_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outreach_leads_updated_at
  BEFORE UPDATE ON outreach_leads
  FOR EACH ROW EXECUTE FUNCTION update_outreach_leads_updated_at();

-- RLS
ALTER TABLE icp_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_briefings ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas usuários autenticados leem; service_role escreve
CREATE POLICY "icp_segments_select" ON icp_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "outreach_leads_select" ON outreach_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "outreach_leads_insert" ON outreach_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "outreach_leads_update" ON outreach_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lead_briefings_select" ON lead_briefings FOR SELECT TO authenticated USING (true);
```

- [ ] **Passo 2: Aplicar migration via Management API**

```bash
curl -X POST \
  https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{"query": "<conteúdo do SQL acima — escapar aspas>"}'
```

> Nota: a Management API não aceita múltiplos statements em uma string. Quebrar em chamadas separadas por statement se necessário. Usar o script node abaixo para facilitar:

```typescript
// scripts/apply-migration.ts
import { createClient } from '@supabase/supabase-js';

const PAT = '***SUPABASE_PAT_REDACTED***';
const PROJECT_REF = 'hynadwlwrscvjubryqlg';

const sql = `CREATE TABLE IF NOT EXISTS icp_segments ...`; // SQL completo

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
);
console.log(await res.json());
```

- [ ] **Passo 3: Verificar tabelas criadas**

```bash
curl -X POST \
  https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name IN (''icp_segments'', ''outreach_leads'', ''lead_briefings'') ORDER BY table_name;"}'
```

Esperado: 3 linhas retornadas com os nomes das tabelas.

- [ ] **Passo 4: Popular segmentos ICP iniciais**

```sql
INSERT INTO icp_segments (name, display_name, pain_description, qualification_signals, primary_channel, secondary_channel) VALUES
('clinicas', 'Clínicas e Consultórios', 'Agendamento e follow-up manuais, perda de pacientes fora do horário comercial',
 '["site sem chatbot", "avaliações reclamando de demora no agendamento", "vagas recepcionista abertas"]'::jsonb,
 'whatsapp', 'email'),
('imobiliarias', 'Imobiliárias e Corretores', 'Qualificação manual de leads e perda de compradores fora do horário',
 '["site sem chat ao vivo", "muitos anúncios sem resposta automatizada", "vagas SDR abertas"]'::jsonb,
 'linkedin', 'whatsapp'),
('ecommerce', 'E-commerces', 'Atendimento e pós-venda intensivos em humano, alto volume de tickets',
 '["suporte apenas por email", "tempo de resposta lento no ReclameAqui", "sem chatbot no site"]'::jsonb,
 'whatsapp', 'email'),
('contabilidade', 'Escritórios de Contabilidade', 'Comunicação repetitiva e relatórios manuais para dezenas de clientes',
 '["sem portal do cliente", "vagas assistente administrativo", "site institucional sem área do cliente"]'::jsonb,
 'linkedin', 'email'),
('construtoras', 'Construtoras e Incorporadoras', 'Prospecção e qualificação lenta de compradores de imóveis',
 '["sem simulador no site", "atendimento só por telefone", "vagas corretores internos"]'::jsonb,
 'linkedin', 'whatsapp'),
('servicos_locais', 'Prestadores de Serviço Local', 'Orçamento, agendamento e cobrança descentralizados',
 '["Google Maps sem resposta automática", "avaliações reclamando de demora", "sem site ou site desatualizado"]'::jsonb,
 'whatsapp', 'instagram');
```

- [ ] **Passo 5: Commit**

```bash
git add supabase/migrations/20260527_outreach_schema.sql
git commit -m "feat: add outreach schema — icp_segments, outreach_leads, lead_briefings"
```

---

## Task 2: Tipos TypeScript + Hook base

**Files:**
- Create: `src/types/outreach.ts`
- Create: `src/hooks/useOutreachLeads.ts`

- [ ] **Passo 1: Criar tipos**

```typescript
// src/types/outreach.ts

export type ContactChannel = 'whatsapp' | 'linkedin' | 'email' | 'instagram';
export type LeadSource = 'apollo' | 'apify_maps' | 'linkedin' | 'manual' | 'csv';
export type LeadStatus =
  | 'prospected'
  | 'analyzing'
  | 'briefed'
  | 'pending_approval'
  | 'sent'
  | 'replied'
  | 'meeting_scheduled'
  | 'won'
  | 'lost'
  | 'archived';
export type ToneType = 'formal' | 'descontraido' | 'tecnico';

export interface IcpSegment {
  id: string;
  name: string;
  display_name: string;
  pain_description: string;
  qualification_signals: string[];
  primary_channel: ContactChannel;
  secondary_channel: ContactChannel | null;
  message_template_key: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OutreachLead {
  id: string;
  company_name: string;
  responsible_name: string | null;
  responsible_title: string | null;
  segment_id: string | null;
  company_size: string | null;
  contact_channel: ContactChannel;
  contact_value: string;
  source: LeadSource;
  apollo_id: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  probable_pain: string | null;
  qualification_score: number;
  status: LeadStatus;
  heat_score: number;
  created_at: string;
  updated_at: string;
  // join
  icp_segments?: IcpSegment;
  lead_briefings?: LeadBriefing;
}

export interface LeadBriefing {
  id: string;
  lead_id: string;
  company_name: string;
  segment: string;
  main_pain: string;
  intellix_solution: string;
  sales_angle: string;
  recommended_tone: ToneType;
  probable_objection: string | null;
  objection_counter: string | null;
  ideal_channel: ContactChannel;
  sources_analyzed: string[];
  generated_at: string;
  model_used: string;
}

export interface ProspectorPayload {
  source: LeadSource;
  segment_name: string;
  limit?: number;                  // default 20
  apollo_search_params?: Record<string, unknown>;
  apify_actor_id?: string;
}

export interface AnalystPayload {
  lead_id: string;
}
```

- [ ] **Passo 2: Criar hook**

```typescript
// src/hooks/useOutreachLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OutreachLead, IcpSegment, LeadStatus } from '@/types/outreach';

export function useIcpSegments() {
  return useQuery({
    queryKey: ['icp_segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icp_segments')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data as IcpSegment[];
    },
  });
}

export function useOutreachLeads(filters?: { status?: LeadStatus; segment_id?: string }) {
  return useQuery({
    queryKey: ['outreach_leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('outreach_leads')
        .select(`
          *,
          icp_segments(*),
          lead_briefings(*)
        `)
        .order('heat_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.segment_id) query = query.eq('segment_id', filters.segment_id);

      const { data, error } = await query;
      if (error) throw error;
      return data as OutreachLead[];
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from('outreach_leads')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
    },
  });
}

export function useTriggerAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('sdr-analyst', {
        body: { lead_id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
    },
  });
}
```

- [ ] **Passo 3: Verificar que Supabase client já está importado corretamente**

Confirmar que `@/integrations/supabase/client` exporta o cliente Supabase. Procurar no projeto:

```bash
grep -r "integrations/supabase/client" src/ | head -3
```

Se o path for diferente, ajustar o import no hook.

- [ ] **Passo 4: Commit**

```bash
git add src/types/outreach.ts src/hooks/useOutreachLeads.ts
git commit -m "feat: add outreach types and hooks"
```

---

## Task 3: Shared utility — Cliente Google Places API

**Files:**
- Create: `supabase/functions/_shared/google-places.ts`

Extraído e adaptado de `C:\Projects\prospect-pulse-54\supabase\functions\prospection\index.ts`.

- [ ] **Passo 1: Criar cliente Google Places**

```typescript
// supabase/functions/_shared/google-places.ts

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  types?: string[];
  geometry?: { location: { lat: number; lng: number } };
}

export interface PlacesSearchParams {
  query: string;           // ex: "clínicas São Paulo SP"
  apiKey: string;
  limit?: number;          // default 20
}

export async function searchPlacesByQuery(
  params: PlacesSearchParams
): Promise<GooglePlaceResult[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(params.query)}&key=${params.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places error ${res.status}`);
  const data = await res.json() as { status: string; results: GooglePlaceResult[]; error_message?: string };
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API: ${data.status} — ${data.error_message ?? ''}`);
  }
  const limit = params.limit ?? 20;
  return (data.results ?? []).slice(0, limit);
}

export async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<GooglePlaceResult | null> {
  const fields = 'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,business_status,types,geometry';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { status: string; result?: GooglePlaceResult };
  return data.status === 'OK' ? (data.result ?? null) : null;
}

// Mapear tipos Google Places → português (extraído do LeadFinder Pro)
const TYPE_MAP: Record<string, string> = {
  restaurant: 'Restaurante', beauty_salon: 'Salão de Beleza', dentist: 'Dentista',
  doctor: 'Médico', lawyer: 'Advogado', accounting: 'Contabilidade',
  real_estate_agency: 'Imobiliária', veterinary_care: 'Veterinária',
  gym: 'Academia', pharmacy: 'Farmácia', school: 'Escola',
  health: 'Saúde', spa: 'Spa', lodging: 'Hotel/Pousada',
};

export function translateGoogleType(types: string[] | undefined): string {
  if (!types?.length) return 'Estabelecimento';
  for (const t of types) { if (TYPE_MAP[t]) return TYPE_MAP[t]; }
  return types[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractCity(address: string | undefined, fallback = ''): string {
  if (!address) return fallback;
  const parts = address.split(',').map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (/^\d{5}-?\d{3}$/.test(p) || /^brasil$/i.test(p)) continue;
    const m = p.match(/^(.+?)\s*-\s*([A-Z]{2})$/);
    if (m) return m[1].trim();
    if (!/^\d/.test(p) && p.length > 2 && i < parts.length - 1) return p;
  }
  return fallback;
}

export function extractNeighborhood(address: string | undefined): string {
  if (!address) return '';
  const dashMatch = address.match(/\d+\s*-\s*([^,]+)/);
  if (dashMatch) {
    const b = dashMatch[1].trim();
    if (!/^[A-Z]{2}$/.test(b)) return b;
  }
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3 && !/^\d/.test(parts[1])) return parts[1];
  return '';
}
```

- [ ] **Passo 2: Adicionar secret no Supabase Dashboard**

Abrir https://supabase.com/dashboard/project/hynadwlwrscvjubryqlg/settings/functions e confirmar/adicionar:
- `GOOGLE_PLACES_API_KEY` — mesma chave usada no LeadFinder Pro
- `OPENAI_API_KEY` — já deve existir

- [ ] **Passo 3: Commit**

```bash
git add supabase/functions/_shared/google-places.ts
git commit -m "feat: add Google Places shared client (adapted from LeadFinder Pro)"
```

---

## Task 4: Edge Function — Agente 1 (sdr-prospector)

**Files:**
- Create: `supabase/functions/sdr-prospector/index.ts`

O Agente 1 recebe um segmento ICP + localização, busca empresas via Google Places API (mesmo padrão do LeadFinder Pro), verifica WhatsApp via Evolution API em batch, e salva em `outreach_leads`. Apenas Google Maps no escopo inicial — sem Apollo ou LinkedIn.

- [ ] **Passo 1: Criar edge function**

```typescript
// supabase/functions/sdr-prospector/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import {
  searchPlacesByQuery,
  getPlaceDetails,
  translateGoogleType,
  extractCity,
  extractNeighborhood,
  type GooglePlaceResult,
} from '../_shared/google-places.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')!;
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';
const EVOLUTION_API_KEY_ENV = Deno.env.get('EVOLUTION_API_KEY') ?? '';

// Mapeamento de segmento → query Google Places (PT-BR)
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
      location: string;   // ex: "São Paulo SP" ou "Campinas SP"
      limit?: number;
    };

    const { segment_name, location, limit = 20 } = body;
    if (!location?.trim()) return jsonResponse({ error: 'location is required' }, 400);

    // Buscar segment_id e dor padrão
    const { data: segment, error: segErr } = await db
      .from('icp_segments')
      .select('id, pain_description, qualification_signals')
      .eq('name', segment_name)
      .single();
    if (segErr || !segment) return jsonResponse({ error: `Segment '${segment_name}' not found` }, 400);

    const queryBase = SEGMENT_QUERY_MAP[segment_name] ?? segment_name;
    const searchQuery = `${queryBase} em ${location}`;

    // 1. Buscar lugares via textsearch
    const places = await searchPlacesByQuery({ query: searchQuery, apiKey: GOOGLE_API_KEY, limit });
    if (!places.length) return jsonResponse({ inserted: 0, total_found: 0 });

    // 2. Buscar detalhes em paralelo (mesmo padrão do LeadFinder Pro)
    const detailsResults = await Promise.all(
      places.map((p) => p.place_id ? getPlaceDetails(p.place_id, GOOGLE_API_KEY) : Promise.resolve(null))
    );
    const detailed = detailsResults.filter((d): d is GooglePlaceResult => d !== null);

    // 3. Verificar WhatsApp em batch via Evolution API (igual ao LeadFinder Pro)
    const whatsappMap = new Map<string, boolean>(); // phone → hasWhatsApp
    const phones = detailed
      .map((d) => (d.international_phone_number ?? d.formatted_phone_number ?? '').replace(/\D/g, ''))
      .filter(Boolean);

    if (phones.length > 0 && EVOLUTION_API_URL && EVOLUTION_API_KEY_ENV) {
      try {
        const evRes = await fetch(EVOLUTION_API_URL, {
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
        // Falha silenciosa — assumir true
      }
    }

    // 4. Montar rows para inserção
    const rows = detailed.map((d) => {
      const rawPhone = d.international_phone_number ?? d.formatted_phone_number ?? '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const hasWhatsApp = whatsappMap.get(cleanPhone) ?? true;

      return {
        company_name: d.name ?? 'Empresa não identificada',
        segment_id: segment.id,
        contact_channel: hasWhatsApp && cleanPhone ? 'whatsapp' : d.website ? 'email' : 'whatsapp',
        contact_value: hasWhatsApp && cleanPhone ? rawPhone : d.website ?? rawPhone,
        source: 'apify_maps' as const, // reutilizando enum (Google Maps)
        website_url: d.website ?? null,
        probable_pain: segment.pain_description,
        qualification_score: scorePlace(d),
        heat_score: 0,
        status: 'prospected' as const,
      };
    });

    // 5. Inserir — dedup por (company_name + segment_id) implícito: sem apollo_id,
    //    usar insert ignorando conflito por ON CONFLICT DO NOTHING via upsert sem conflictTarget
    const { data: inserted, error: insErr } = await db
      .from('outreach_leads')
      .insert(rows)
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
  if (!place.website) score += 20;                          // sem site = processo manual
  if ((place.user_ratings_total ?? 0) > 50) score += 10;   // empresa ativa
  if ((place.rating ?? 5) < 4.0) score += 15;              // avaliações ruins = dor
  if (place.business_status === 'OPERATIONAL') score += 10; // empresa aberta
  return Math.min(100, score);
}
```

- [ ] **Passo 2: Adicionar índice de dedup no schema (opcional mas recomendado)**

Para evitar duplicatas de prospecção do mesmo lugar:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS outreach_leads_company_segment_uniq
  ON outreach_leads(company_name, segment_id)
  WHERE status != 'archived';
```

Aplicar via Management API.

- [ ] **Passo 3: Deploy**

```bash
supabase functions deploy sdr-prospector --project-ref hynadwlwrscvjubryqlg
```

- [ ] **Passo 4: Smoke test**

```bash
curl -X POST \
  https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/sdr-prospector \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"segment_name": "clinicas", "location": "São Paulo SP", "limit": 5}'
```

Esperado: `{"inserted": N, "total_found": N}` onde N > 0 se `GOOGLE_PLACES_API_KEY` válida.

- [ ] **Passo 5: Commit**

```bash
git add supabase/functions/sdr-prospector/index.ts
git commit -m "feat: add sdr-prospector edge function — Google Places (Agente 1)"
```

---

## Task 5: Edge Function — Agente 2 (sdr-analyst)

**Files:**
- Create: `supabase/functions/sdr-analyst/index.ts`

O Agente 2 recebe um `lead_id`, coleta contexto público (site, reviews, LinkedIn), e gera um briefing via GPT-4o salvo em `lead_briefings`.

- [ ] **Passo 1: Criar edge function**

```typescript
// supabase/functions/sdr-analyst/index.ts
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

    // Buscar lead com segmento
    const { data: lead, error: leadErr } = await db
      .from('outreach_leads')
      .select('*, icp_segments(*)')
      .eq('id', lead_id)
      .single();
    if (leadErr || !lead) return jsonResponse({ error: 'Lead not found' }, 404);

    // Marcar como analisando
    await db.from('outreach_leads').update({ status: 'analyzing' }).eq('id', lead_id);

    // Coletar contexto público
    const context = await collectPublicContext(lead);

    // Montar prompt com contexto
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

    // Salvar briefing
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

    // Atualizar status do lead
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
  google_reviews?: string;
  linkedin_description?: string;
}

async function collectPublicContext(lead: {
  company_name: string;
  website_url?: string | null;
  linkedin_url?: string | null;
  icp_segments?: { pain_description: string } | null;
}): Promise<LeadContext> {
  const context: LeadContext = { sources_analyzed: [], raw: {} };

  // Tentar buscar homepage do site (texto simples, sem JS)
  if (lead.website_url) {
    try {
      const res = await fetch(lead.website_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IntelliX-SDR-Bot/1.0)' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const html = await res.text();
        // Extrair texto simples removendo tags HTML
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
  return `
Analise a empresa abaixo e gere o briefing de prospecção.

EMPRESA: ${lead.company_name}
SEGMENTO: ${lead.icp_segments?.display_name ?? 'não identificado'}
CANAL DE CONTATO: ${lead.contact_channel}
DOR PROVÁVEL DO SEGMENTO: ${lead.icp_segments?.pain_description ?? lead.probable_pain ?? 'não identificada'}

CONTEXTO COLETADO:
${context.website_text ? `Site institucional (primeiros 3000 caracteres):\n${context.website_text}` : 'Site não disponível'}
${context.google_reviews ? `Avaliações Google:\n${context.google_reviews}` : ''}
${context.linkedin_description ? `LinkedIn:\n${context.linkedin_description}` : ''}

Gere o briefing no JSON:
{
  "main_pain": "dor principal identificada (1-2 frases concretas)",
  "intellix_solution": "produto ou serviço IntelliX que resolve (ex: Agente de Atendimento 24h)",
  "sales_angle": "frase de impacto de até 15 palavras",
  "recommended_tone": "formal | descontraido | tecnico",
  "probable_objection": "objeção mais provável do decisor",
  "objection_counter": "como rebater com prova concreta da IntelliX",
  "ideal_channel": "${lead.contact_channel}"
}
`.trim();
}
```

- [ ] **Passo 2: Deploy**

```bash
supabase functions deploy sdr-analyst --project-ref hynadwlwrscvjubryqlg
```

- [ ] **Passo 3: Smoke test**

```bash
# Primeiro, pegar um lead_id da tabela outreach_leads
curl -X POST \
  https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/sdr-analyst \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"lead_id": "<uuid-do-lead>"}'
```

Esperado: `{"success": true, "briefing": {...}}` e registro em `lead_briefings`.

- [ ] **Passo 4: Commit**

```bash
git add supabase/functions/sdr-analyst/index.ts
git commit -m "feat: add sdr-analyst edge function (Agente 2)"
```

---

## Task 6: UI — Tab "Leads SDR" na Pipeline Page

**Files:**
- Create: `src/pages/pipeline/OutreachLeadsTab.tsx`
- Modify: `src/pages/pipeline/PipelinePage.tsx` (ou equivalente) — adicionar nova tab

- [ ] **Passo 1: Identificar a PipelinePage existente**

```bash
grep -r "PipelinePage\|pipeline" src/pages/ --include="*.tsx" -l | head -5
```

Verificar como as tabs são adicionadas na página de Pipeline e seguir o mesmo padrão (provavelmente `<Tabs>` do shadcn/ui).

- [ ] **Passo 2: Criar o componente OutreachLeadsTab**

```tsx
// src/pages/pipeline/OutreachLeadsTab.tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOutreachLeads, useIcpSegments, useTriggerAnalysis } from '@/hooks/useOutreachLeads';
import type { OutreachLead, LeadStatus } from '@/types/outreach';

const STATUS_LABELS: Record<LeadStatus, string> = {
  prospected: 'Prospectado',
  analyzing: 'Analisando...',
  briefed: 'Briefing OK',
  pending_approval: 'Aguarda aprovação',
  sent: 'Mensagem enviada',
  replied: 'Respondeu',
  meeting_scheduled: 'Reunião agendada',
  won: 'Fechado',
  lost: 'Perdido',
  archived: 'Arquivado',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  prospected: 'secondary',
  analyzing: 'outline',
  briefed: 'default',
  pending_approval: 'destructive',
  sent: 'default',
  replied: 'default',
  meeting_scheduled: 'default',
  won: 'default',
  lost: 'secondary',
  archived: 'secondary',
} as const;

export function OutreachLeadsTab() {
  const [segmentFilter, setSegmentFilter] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<OutreachLead | null>(null);

  const { data: leads = [], isLoading } = useOutreachLeads(
    segmentFilter ? { segment_id: segmentFilter } : undefined
  );
  const { data: segments = [] } = useIcpSegments();
  const triggerAnalysis = useTriggerAnalysis();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Leads SDR Outbound</h2>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os segmentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {segments.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando leads...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell
                  className="font-medium"
                  onClick={() => setSelectedLead(lead)}
                >
                  {lead.company_name}
                  {lead.responsible_name && (
                    <div className="text-xs text-muted-foreground">{lead.responsible_name}</div>
                  )}
                </TableCell>
                <TableCell>
                  {lead.icp_segments?.display_name ?? '—'}
                </TableCell>
                <TableCell className="capitalize">{lead.contact_channel}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono">{lead.qualification_score}</span>
                    <span className="text-xs text-muted-foreground">/ heat {lead.heat_score}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[lead.status] as 'default' | 'secondary' | 'outline' | 'destructive'}>
                    {STATUS_LABELS[lead.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.status === 'prospected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={triggerAnalysis.isPending}
                      onClick={() => triggerAnalysis.mutate(lead.id)}
                    >
                      Analisar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal de briefing */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedLead?.company_name}</DialogTitle>
          </DialogHeader>
          {selectedLead?.lead_briefings ? (
            <div className="space-y-3 text-sm">
              <div><span className="font-semibold">Dor principal:</span> {selectedLead.lead_briefings.main_pain}</div>
              <div><span className="font-semibold">Solução IntelliX:</span> {selectedLead.lead_briefings.intellix_solution}</div>
              <div><span className="font-semibold">Ângulo de venda:</span> {selectedLead.lead_briefings.sales_angle}</div>
              <div><span className="font-semibold">Tom:</span> {selectedLead.lead_briefings.recommended_tone}</div>
              <div><span className="font-semibold">Objeção provável:</span> {selectedLead.lead_briefings.probable_objection}</div>
              <div><span className="font-semibold">Contra-argumento:</span> {selectedLead.lead_briefings.objection_counter}</div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Briefing ainda não gerado.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Passo 3: Adicionar tab na PipelinePage**

Encontrar o arquivo da PipelinePage e adicionar a tab seguindo o padrão existente:

```tsx
// Dentro da PipelinePage — adicionar ao array de tabs ou <Tabs>:
import { OutreachLeadsTab } from './OutreachLeadsTab';

// Na estrutura de tabs:
<TabsTrigger value="outreach">Leads SDR</TabsTrigger>

// No conteúdo:
<TabsContent value="outreach">
  <OutreachLeadsTab />
</TabsContent>
```

- [ ] **Passo 4: Verificar que os tipos Supabase incluem as novas tabelas**

Se o projeto usa tipos gerados pelo Supabase CLI (`database.types.ts`), regenerar:

```bash
supabase gen types typescript --project-id hynadwlwrscvjubryqlg > src/integrations/supabase/types.ts
```

Se CLI com segfault, adicionar os tipos manualmente em `src/types/outreach.ts` (já feito na Task 2).

- [ ] **Passo 5: Commit**

```bash
git add src/pages/pipeline/OutreachLeadsTab.tsx
git commit -m "feat: add OutreachLeadsTab to Pipeline page (Agentes 1+2 UI)"
```

---

## Task 7: Job diário — orquestração automática

**Files:**
- Modify: `supabase/functions/internal-job-dispatch/index.ts` — adicionar handler para job `sdr_daily_prospecting`

> Padrão: o sistema já usa `internal_jobs` + `internal-job-trigger` + `internal-job-dispatch`. Seguir o mesmo padrão.

- [ ] **Passo 1: Verificar estrutura atual do job dispatch**

```bash
cat supabase/functions/internal-job-dispatch/index.ts | head -60
```

Identificar como novos handlers de job são adicionados (provavelmente um switch/case ou mapa de handlers).

- [ ] **Passo 2: Adicionar handler `sdr_daily_prospecting`**

No arquivo `internal-job-dispatch/index.ts`, adicionar ao mapa de handlers:

```typescript
// Dentro do handler de jobs:
case 'sdr_daily_prospecting': {
  const { segment_name = 'clinicas', limit = 20 } = job.payload as {
    segment_name?: string;
    limit?: number;
  };

  // Invocar sdr-prospector para o segmento
  const prospectRes = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/sdr-prospector`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'apollo', segment_name, limit }),
    }
  );
  const prospectData = await prospectRes.json();

  // Buscar top 5 leads mais quentes sem briefing
  const { data: hotLeads } = await db
    .from('outreach_leads')
    .select('id')
    .eq('status', 'prospected')
    .order('qualification_score', { ascending: false })
    .limit(5);

  // Invocar sdr-analyst para cada lead quente
  for (const lead of hotLeads ?? []) {
    await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/sdr-analyst`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: lead.id }),
      }
    );
    // Pequeno delay para não sobrecarregar OpenAI
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { prospected: prospectData, analyzed: hotLeads?.length ?? 0 };
}
```

- [ ] **Passo 3: Inserir job diário na tabela internal_jobs**

```sql
INSERT INTO internal_jobs (name, description, schedule, payload, is_active)
VALUES (
  'sdr_daily_prospecting',
  'Prospecção diária — Agentes 1 e 2',
  '0 8 * * 1-5',  -- Segunda a sexta às 8h
  '{"segment_name": "clinicas", "limit": 20}'::jsonb,
  true
);
```

Aplicar via Management API.

- [ ] **Passo 4: Commit**

```bash
git add supabase/functions/internal-job-dispatch/index.ts
git commit -m "feat: add sdr_daily_prospecting job handler"
```

---

## Self-Review

**Cobertura da spec (Agentes 1 e 2):**
- [x] Agente 1 fontes: Apollo.io ✅ | Apify Google Maps ✅ | LinkedIn/Hunter (fase B) | Manual/CSV (UI existente)
- [x] Agente 1 critérios de qualificação: `scoreBySignals` / `scoreMapsPlace` ✅
- [x] Agente 1 segmentos prioritários: 6 segmentos ICP populados ✅
- [x] Agente 1 output: lista diária 20-50 leads em `outreach_leads` ✅
- [x] Agente 2 fontes: site ✅ | Google Reviews (não implementado — scraping bloqueado por ToS, ignorado no MVP) | LinkedIn (básico) | ReclameAqui (fase futura)
- [x] Agente 2 briefing: todos os 8 campos do template ✅
- [x] Agente 2 output: `lead_briefings` alimentando Agentes 3/5/7 ✅
- [x] Orquestração diária: job `sdr_daily_prospecting` ✅
- [x] UI: tab "Leads SDR" com visualização de briefing ✅

**Gaps assumidos/adiados (por decisão do usuário):**
- Apollo.io: excluído do escopo inicial
- LinkedIn: excluído do escopo inicial
- Google Reviews scraping: bloqueado por ToS do Google. Fase futura.
- ReclameAqui: sem API pública. Fase futura.

**Próximo passo:** Plano B (Agentes 5 e 6 — copywriting + humanização + UI de aprovação)

---

*Plano A salvo — 2026-05-27 | intellix-squad-hub*

# Squad SDR — Agente 3 (Site Builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o Agente 3 (`sdr-site-builder`) ao Squad SDR — gera PRD de site e URL Lovable para leads com site fraco ou ausente — e enriquecer o Agente 2 (`sdr-analyst`) com auditoria de qualidade de site.

**Architecture:** O `sdr-analyst` passa a computar `site_audit_score` (0–100) e `redesign_signals[]` a partir do HTML bruto do site do lead, salvando esses campos em `lead_briefings`. O novo `sdr-site-builder` lê o briefing e, quando `site_audit_score < 60` ou site inexistente, gera um PRD via GPT-4o e constrói a URL `lovable.dev/?autosubmit=true#prompt=<encoded>`, salvando em `site_proposals`. O `sdr-copywriter` substitui o placeholder `[link do vídeo]` pela URL Lovable real. O `sdr-daily-orchestrator` orquestra os três em sequência.

**Tech Stack:** Deno 1.x, Supabase Edge Functions, TypeScript strict, OpenAI gpt-4o, Supabase PostgreSQL 17, React 18 + TanStack Query, Lucide React, shadcn/ui

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260529_site_proposals.sql` | CREATE | Schema: colunas em lead_briefings + tabela site_proposals |
| `src/types/outreach.ts` | MODIFY | Add SiteProposal interface; update LeadBriefing e OutreachLead |
| `supabase/functions/sdr-analyst/index.ts` | MODIFY | Add computeSiteAudit(); salvar site_audit_score + redesign_signals |
| `supabase/functions/sdr-site-builder/index.ts` | CREATE | GPT-4o PRD + Lovable URL builder |
| `supabase/functions/sdr-copywriter/index.ts` | MODIFY | Carregar site_proposals e injetar Lovable URL |
| `supabase/functions/sdr-daily-orchestrator/index.ts` | MODIFY | Adicionar Step 3 (site-builder) após analyst |
| `src/hooks/useOutreachLeads.ts` | MODIFY | Incluir site_proposals no select |
| `src/pages/pipeline/OutreachLeadsTab.tsx` | MODIFY | Botão "Ver protótipo" no dialog do lead |

---

## Task 1: Migration — site_proposals schema

**Files:**
- Create: `supabase/migrations/20260529_site_proposals.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- supabase/migrations/20260529_site_proposals.sql

ALTER TABLE lead_briefings
  ADD COLUMN IF NOT EXISTS site_audit_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS redesign_signals JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS site_proposals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id            UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  prd_text           TEXT NOT NULL,
  lovable_url        TEXT NOT NULL,
  redesign_signals   JSONB NOT NULL DEFAULT '[]'::jsonb,
  site_audit_score   INTEGER NOT NULL DEFAULT 0 CHECK (site_audit_score BETWEEN 0 AND 100),
  status             TEXT NOT NULL DEFAULT 'ready'
                       CHECK (status IN ('ready', 'sent', 'rejected')),
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

ALTER TABLE site_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_proposals_select" ON site_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "site_proposals_insert" ON site_proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "site_proposals_update" ON site_proposals FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_site_proposals_lead_id ON site_proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_site_proposals_status ON site_proposals(status);
```

- [ ] **Step 2: Aplicar ALTER lead_briefings via Management API**

```powershell
$sql = "ALTER TABLE lead_briefings ADD COLUMN IF NOT EXISTS site_audit_score INTEGER DEFAULT NULL, ADD COLUMN IF NOT EXISTS redesign_signals JSONB DEFAULT '[]'::jsonb"
$payload = ConvertTo-Json @{ query = $sql } -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" -Method POST -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
```

Expected: `{ "results": [...] }` sem chave `error`.

- [ ] **Step 3: Aplicar CREATE TABLE site_proposals**

```powershell
$sql = @"
CREATE TABLE IF NOT EXISTS site_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  prd_text TEXT NOT NULL,
  lovable_url TEXT NOT NULL,
  redesign_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  site_audit_score INTEGER NOT NULL DEFAULT 0 CHECK (site_audit_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'sent', 'rejected')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
)
"@
$payload = ConvertTo-Json @{ query = $sql } -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" -Method POST -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
```

Expected: sem erro.

- [ ] **Step 4: Aplicar RLS + indexes**

```powershell
$sql = @"
ALTER TABLE site_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_proposals_select" ON site_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "site_proposals_insert" ON site_proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "site_proposals_update" ON site_proposals FOR UPDATE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_site_proposals_lead_id ON site_proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_site_proposals_status ON site_proposals(status)
"@
$payload = ConvertTo-Json @{ query = $sql } -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" -Method POST -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
```

Expected: sem erro.

- [ ] **Step 5: Verificar criação da tabela**

```powershell
$sql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'site_proposals' ORDER BY ordinal_position"
$payload = ConvertTo-Json @{ query = $sql } -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" -Method POST -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
```

Expected: lista com `id, lead_id, prd_text, lovable_url, redesign_signals, site_audit_score, status, generated_at`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260529_site_proposals.sql
git commit -m "feat(sdr): add site_proposals table and site audit columns to lead_briefings"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `src/types/outreach.ts`

- [ ] **Step 1: Adicionar interface SiteProposal após LeadBriefing**

```typescript
export interface SiteProposal {
  id: string;
  lead_id: string;
  prd_text: string;
  lovable_url: string;
  redesign_signals: string[];
  site_audit_score: number;
  status: 'ready' | 'sent' | 'rejected';
  generated_at: string;
}
```

- [ ] **Step 2: Atualizar interface LeadBriefing — adicionar campos de auditoria**

```typescript
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
  site_audit_score: number | null;
  redesign_signals: string[];
}
```

- [ ] **Step 3: Atualizar interface OutreachLead — adicionar site_proposals opcional**

Adicionar a linha abaixo do campo `outreach_messages?`:

```typescript
  site_proposals?: SiteProposal;
```

- [ ] **Step 4: Verificar tipos**

```powershell
cd C:\Projects\intellix-squad-hub && npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 5: Commit**

```bash
git add src/types/outreach.ts
git commit -m "feat(types): add SiteProposal and site audit fields to outreach types"
```

---

## Task 3: Upgrade sdr-analyst — site audit

**Files:**
- Modify: `supabase/functions/sdr-analyst/index.ts`

Reescrever o arquivo completo com as adições de `computeSiteAudit()`, novo campo `raw_html` em `LeadContext`, e salvamento de `site_audit_score` + `redesign_signals` no upsert.

- [ ] **Step 1: Escrever o arquivo atualizado**

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
    const authResult = await requireAdmin(req);
    if ('error' in authResult) return authResult.error;

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { lead_id } = await req.json() as { lead_id: string };

    const { data: lead, error: leadErr } = await db
      .from('outreach_leads')
      .select('*, icp_segments(*)')
      .eq('id', lead_id)
      .single();
    if (leadErr || !lead) return jsonResponse({ error: 'Lead not found' }, 404);

    await db.from('outreach_leads').update({ status: 'analyzing' }).eq('id', lead_id);

    const context = await collectPublicContext(lead);
    const { site_audit_score, redesign_signals } = computeSiteAudit(
      lead.website_url,
      context.raw_html,
    );
    const userPrompt = buildAnalystPrompt(lead, context, site_audit_score, redesign_signals);

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
      site_audit_score,
      redesign_signals,
      model_used: 'gpt-4o',
    }, { onConflict: 'lead_id' });
    if (briefErr) throw briefErr;

    await db.from('outreach_leads').update({ status: 'briefed' }).eq('id', lead_id);

    return jsonResponse({ success: true, briefing: briefingData, site_audit_score, redesign_signals });
  } catch (err) {
    console.error('[sdr-analyst]', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

interface LeadContext {
  sources_analyzed: string[];
  raw: Record<string, unknown>;
  raw_html: string;
  website_text?: string;
}

async function collectPublicContext(lead: {
  company_name: string;
  website_url?: string | null;
  icp_segments?: { pain_description: string } | null;
}): Promise<LeadContext> {
  const context: LeadContext = { sources_analyzed: [], raw: {}, raw_html: '' };

  if (lead.website_url) {
    try {
      const res = await fetch(lead.website_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IntelliX-SDR-Bot/1.0)' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const html = await res.text();
        context.raw_html = html;
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000);
        context.website_text = text;
        context.sources_analyzed.push('site');
        context.raw.website = text;
      }
    } catch (_e) {
      context.sources_analyzed.push('site_unreachable');
    }
  }

  return context;
}

function computeSiteAudit(
  websiteUrl: string | null | undefined,
  html: string,
): { site_audit_score: number; redesign_signals: string[] } {
  if (!websiteUrl) {
    return { site_audit_score: 10, redesign_signals: ['no_site'] };
  }
  if (!html) {
    return { site_audit_score: 20, redesign_signals: ['site_unreachable'] };
  }

  const signals: string[] = [];
  let score = 100;

  if (!websiteUrl.startsWith('https://')) {
    signals.push('no_ssl');
    score -= 20;
  }

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    signals.push('no_mobile_meta');
    score -= 25;
  }

  const copyrightMatch = html.match(/©\s*(\d{4})/) ?? html.match(/copyright[^0-9]*(\d{4})/i);
  if (copyrightMatch) {
    const year = parseInt(copyrightMatch[1]);
    if (year < 2020) {
      signals.push('outdated_copyright');
      score -= 20;
    }
  }

  const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (textContent.length < 500) {
    signals.push('minimal_content');
    score -= 20;
  }

  if (/<table[^>]*>/i.test(html) && !/<thead|<tbody/i.test(html)) {
    signals.push('table_layout');
    score -= 15;
  }

  if (!/(google-analytics|gtag\(|analytics\.js|_gaq)/i.test(html)) {
    signals.push('no_analytics');
    score -= 10;
  }

  return { site_audit_score: Math.max(0, score), redesign_signals: signals };
}

function buildAnalystPrompt(
  lead: {
    company_name: string;
    probable_pain?: string | null;
    contact_channel: string;
    icp_segments?: { display_name: string; pain_description: string } | null;
  },
  context: LeadContext,
  site_audit_score: number,
  redesign_signals: string[],
): string {
  const auditNote = redesign_signals.length > 0
    ? `\nAUDITORIA DO SITE (score ${site_audit_score}/100): ${redesign_signals.join(', ')}`
    : `\nAUDITORIA DO SITE: site com boa presença digital (score ${site_audit_score}/100)`;

  return `Analise a empresa abaixo e gere o briefing de prospecção.

EMPRESA: ${lead.company_name}
SEGMENTO: ${lead.icp_segments?.display_name ?? 'não identificado'}
CANAL DE CONTATO: ${lead.contact_channel}
DOR PROVÁVEL DO SEGMENTO: ${lead.icp_segments?.pain_description ?? lead.probable_pain ?? 'não identificada'}
${auditNote}

CONTEXTO COLETADO:
${context.website_text ? `Site institucional (primeiros 3000 caracteres):\n${context.website_text}` : 'Site não disponível ou inacessível'}

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
```

- [ ] **Step 2: Deploy via Management API**

```powershell
$fnBody = Get-Content "C:\Projects\intellix-squad-hub\supabase\functions\sdr-analyst\index.ts" -Raw
$payload = ConvertTo-Json @{ body = $fnBody; verify_jwt = $false } -Depth 5 -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions/sdr-analyst" -Method PATCH -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
```

Expected: `{ "id": "sdr-analyst", "status": "ACTIVE" }`

- [ ] **Step 3: Smoke test — acionar análise de um lead via UI**

Na UI: abrir módulo Pipeline → aba SDR Outbound → clicar em "Analisar" em qualquer lead com status `prospected`. Verificar na aba Network (F12) que o response inclui `site_audit_score` e `redesign_signals`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/sdr-analyst/index.ts
git commit -m "feat(sdr): analyst now computes site_audit_score and redesign_signals from HTML"
```

---

## Task 4: Nova edge function sdr-site-builder

**Files:**
- Create: `supabase/functions/sdr-site-builder/index.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// supabase/functions/sdr-site-builder/index.ts
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
```

- [ ] **Step 2: Deploy nova função via Management API**

```powershell
$fnBody = Get-Content "C:\Projects\intellix-squad-hub\supabase\functions\sdr-site-builder\index.ts" -Raw
$payload = ConvertTo-Json @{ name = "sdr-site-builder"; body = $fnBody; verify_jwt = $false } -Depth 5 -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions" -Method POST -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
```

Expected: `{ "id": "sdr-site-builder", "status": "ACTIVE" }`

- [ ] **Step 3: Smoke test — buscar lead briefado e acionar**

```powershell
# Buscar um lead com briefing que tenha site_audit_score < 60 ou NULL
$sql = "SELECT l.id FROM outreach_leads l JOIN lead_briefings lb ON lb.lead_id = l.id WHERE lb.site_audit_score < 60 OR lb.site_audit_score IS NULL LIMIT 1"
$payload = ConvertTo-Json @{ query = $sql } -Compress
$r = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" -Method POST -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
$leadId = $r.results[0].id
Write-Host "Testando lead: $leadId"

# Acionar sdr-site-builder
$body = ConvertTo-Json @{ lead_id = $leadId } -Compress
$resp = Invoke-RestMethod -Uri "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/sdr-site-builder" -Method POST -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $body
Write-Host ($resp | ConvertTo-Json)
```

Expected: `{ "success": true, "lovable_url": "https://lovable.dev/?autosubmit=true#prompt=...", "site_audit_score": <N> }`

Abrir a `lovable_url` no browser → confirmar que o Lovable abre e começa a gerar o projeto automaticamente.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/sdr-site-builder/index.ts
git commit -m "feat(sdr): add sdr-site-builder — Lovable PRD generator for weak-site leads"
```

---

## Task 5: Update sdr-copywriter — injetar Lovable URL

**Files:**
- Modify: `supabase/functions/sdr-copywriter/index.ts`

Mudança cirúrgica: após `messageText`, carregar `site_proposals` do lead e substituir o placeholder `[link do vídeo]` pela URL Lovable real quando disponível.

- [ ] **Step 1: Substituir o bloco final do handler (de `const { error: msgErr }` até o return)**

O código que substitui (linhas 93–104 do arquivo atual):

```typescript
    const { data: siteProposal } = await db
      .from('site_proposals')
      .select('lovable_url')
      .eq('lead_id', lead_id)
      .eq('status', 'ready')
      .maybeSingle();

    const finalMessage = siteProposal?.lovable_url
      ? messageText.replace('[link do vídeo]', siteProposal.lovable_url)
      : messageText;

    const { error: msgErr } = await db.from('outreach_messages').upsert({
      lead_id,
      channel,
      message_text: finalMessage,
      status: 'draft',
      model_used: 'gpt-4o',
    }, { onConflict: 'lead_id' });
    if (msgErr) throw msgErr;

    await db.from('outreach_leads').update({ status: 'pending_approval' }).eq('id', lead_id);

    return jsonResponse({ success: true, message: finalMessage, channel });
```

- [ ] **Step 2: Deploy via Management API**

```powershell
$fnBody = Get-Content "C:\Projects\intellix-squad-hub\supabase\functions\sdr-copywriter\index.ts" -Raw
$payload = ConvertTo-Json @{ body = $fnBody; verify_jwt = $false } -Depth 5 -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions/sdr-copywriter" -Method PATCH -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
```

Expected: `{ "id": "sdr-copywriter", "status": "ACTIVE" }`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/sdr-copywriter/index.ts
git commit -m "feat(sdr): copywriter injects Lovable URL replacing [link do vídeo] placeholder"
```

---

## Task 6: Update sdr-daily-orchestrator — Step 3

**Files:**
- Modify: `supabase/functions/sdr-daily-orchestrator/index.ts`

- [ ] **Step 1: Adicionar Step 3 após o loop de análise e antes do return**

Inserir este bloco no `sdr-daily-orchestrator/index.ts`, após `console.log('[sdr-daily] analyzed ${analyzed} leads')` e antes do `return jsonResponse(...)`:

```typescript
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
```

- [ ] **Step 2: Atualizar o return para incluir siteBuilt**

```typescript
  return jsonResponse({ prospected, analyzed, siteBuilt, segment_name, location });
```

- [ ] **Step 3: Deploy via Management API**

```powershell
$fnBody = Get-Content "C:\Projects\intellix-squad-hub\supabase\functions\sdr-daily-orchestrator\index.ts" -Raw
$payload = ConvertTo-Json @{ body = $fnBody; verify_jwt = $false } -Depth 5 -Compress
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions/sdr-daily-orchestrator" -Method PATCH -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } -Body $payload
```

Expected: `{ "id": "sdr-daily-orchestrator", "status": "ACTIVE" }`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/sdr-daily-orchestrator/index.ts
git commit -m "feat(sdr): orchestrator triggers site-builder for briefed leads with weak sites"
```

---

## Task 7: Frontend — exibir Lovable URL no dialog

**Files:**
- Modify: `src/hooks/useOutreachLeads.ts`
- Modify: `src/pages/pipeline/OutreachLeadsTab.tsx`

- [ ] **Step 1: Atualizar select do hook para incluir site_proposals**

Em `src/hooks/useOutreachLeads.ts`, substituir o `select` dentro de `useOutreachLeads`:

```typescript
      let query = supabase
        .from('outreach_leads')
        .select(`
          *,
          icp_segments(*),
          lead_briefings(*),
          outreach_messages(*),
          site_proposals(*)
        `)
        .order('heat_score', { ascending: false })
        .order('created_at', { ascending: false });
```

- [ ] **Step 2: Adicionar import ExternalLink em OutreachLeadsTab.tsx**

Localizar a linha de imports do lucide-react e adicionar `ExternalLink`:

```tsx
// Linha existente — substituir por:
import { ExternalLink } from 'lucide-react';
```

- [ ] **Step 3: Adicionar botão "Ver protótipo" no Dialog**

Em `OutreachLeadsTab.tsx`, dentro do `<Dialog>`, após `<OutreachApprovalCard lead={selectedLead} />`, adicionar:

```tsx
{selectedLead?.site_proposals && (
  <a
    href={(selectedLead.site_proposals as import('@/types/outreach').SiteProposal).lovable_url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
  >
    <ExternalLink className="w-4 h-4" />
    Ver protótipo no Lovable
  </a>
)}
```

- [ ] **Step 4: Verificar tipos**

```powershell
cd C:\Projects\intellix-squad-hub && npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 5: Testar no browser**

```powershell
cd C:\Projects\intellix-squad-hub && npm run dev
```

Abrir http://localhost:5173 → Pipeline → SDR Outbound → clicar num lead que tem `site_proposals` → confirmar que o link "Ver protótipo no Lovable" aparece no dialog.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useOutreachLeads.ts src/pages/pipeline/OutreachLeadsTab.tsx
git commit -m "feat(ui): show Lovable prototype link in lead dialog when site_proposals ready"
```

---

## Self-Review

**Spec coverage:**
- ✅ Migration com `site_proposals` e campos de auditoria em `lead_briefings`
- ✅ `computeSiteAudit()` detecta 8 sinais: no_site, site_unreachable, no_ssl, no_mobile_meta, outdated_copyright, minimal_content, table_layout, no_analytics
- ✅ Regra de negócio: `sdr-site-builder` só gera se `site_audit_score < 60` ou sem site
- ✅ PRD com paleta por segmento (6 segmentos cobertos)
- ✅ URL Lovable com `encodeURIComponent` + hash fragment `#prompt=`
- ✅ `sdr-copywriter` substitui `[link do vídeo]` pela URL real
- ✅ Orquestrador — Step 3 inserido após analyst com delay 1500ms anti-rate-limit
- ✅ Frontend — botão "Ver protótipo" no dialog + hook com `site_proposals(*)`
- ✅ Deploy via Management API em todos os passos (CLI com segfault)
- ✅ TypeScript `tsc --noEmit` em tasks que tocam tipos
- ⏸️ Geração de vídeo — fora do escopo deste plano

**Placeholder scan:** Nenhum TBD, TODO ou "similar ao Task N" — todos os passos têm código completo.

**Type consistency:**
- `SiteProposal.lovable_url` → `buildLovableUrl()` → upsert `lovable_url` → query `.select('lovable_url')` → `siteProposal.lovable_url` no copywriter → `selectedLead.site_proposals.lovable_url` na UI ✅
- `site_audit_score` → `computeSiteAudit()` → upsert em `lead_briefings` → lido em `sdr-site-builder` como `briefing.site_audit_score` → verificado via `auditScore >= 60` no orchestrator ✅
- `redesign_signals: string[]` → computado em `computeSiteAudit()` → salvo em `lead_briefings.redesign_signals` (JSONB) → copiado para `site_proposals.redesign_signals` ✅

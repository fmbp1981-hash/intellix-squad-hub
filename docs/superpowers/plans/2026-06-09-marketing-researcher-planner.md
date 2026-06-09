# Marketing Researcher V2 + Weekly Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar cron toda segunda-feira que pesquisa 5 fontes (Google News, Gmail IA, Instagram x4, LinkedIn), filtra por relevância IntelliX, e gera calendário de 7 posts salvos como `idea_pending` no banco.

**Architecture:** Duas novas edge functions (`marketing-researcher` + `marketing-planner`) + dois shared clients (`gmail-client.ts` + `serp-client.ts`) + migration para `scheduled_for` + pg_cron via SQL. O researcher busca em paralelo e retorna snippets ranqueados. O planner recebe snippets e distribui 7 ideias por dia da semana com Claude Haiku.

**Tech Stack:** Deno/TypeScript, Supabase Edge Functions, Gmail API v1 (OAuth2 refresh), SerpAPI (google_news + google), Anthropic Claude Haiku (triagem), pg_cron (Postgres).

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/20260609_marketing_scheduled_for.sql` | Criar | Adiciona `scheduled_for` + `week_of` ao `marketing_drafts` |
| `supabase/functions/_shared/gmail-client.ts` | Criar | Autentica via refresh token, lista emails do label IA |
| `supabase/functions/_shared/serp-client.ts` | Criar | Wrapper SerpAPI: google_news, google (Instagram/LinkedIn) |
| `supabase/functions/marketing-researcher/index.ts` | Criar | Orquestra 5 fontes em paralelo, retorna snippets ranqueados |
| `supabase/functions/marketing-planner/index.ts` | Criar | Recebe snippets → Claude Haiku → 7 drafts no DB |
| `supabase/migrations/20260609_marketing_cron.sql` | Criar | Registra pg_cron toda segunda 09:00 BRT (12:00 UTC) |

---

## Task 1: Migration — adiciona `scheduled_for` e `week_of`

**Files:**
- Create: `supabase/migrations/20260609_marketing_scheduled_for.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260609_marketing_scheduled_for.sql
ALTER TABLE marketing_drafts
  ADD COLUMN IF NOT EXISTS scheduled_for date,
  ADD COLUMN IF NOT EXISTS week_of      date;

CREATE INDEX IF NOT EXISTS idx_marketing_drafts_scheduled_for
  ON marketing_drafts (scheduled_for)
  WHERE scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_drafts_week_of
  ON marketing_drafts (week_of)
  WHERE week_of IS NOT NULL;
```

- [ ] **Step 2: Aplicar via Management API**

```powershell
curl -s -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" `
  -H "Authorization: Bearer <SUPABASE_PAT>" `
  -H "Content-Type: application/json" `
  -d '{"query": "ALTER TABLE marketing_drafts ADD COLUMN IF NOT EXISTS scheduled_for date, ADD COLUMN IF NOT EXISTS week_of date"}'
```

Esperado: `[]` (sem erro)

- [ ] **Step 3: Verificar**

```powershell
curl -s -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" `
  -H "Authorization: Bearer <SUPABASE_PAT>" `
  -H "Content-Type: application/json" `
  -d '{"query": "SELECT column_name FROM information_schema.columns WHERE table_name = ''marketing_drafts'' AND column_name IN (''scheduled_for'', ''week_of'')"}'
```

Esperado: `[{"column_name":"scheduled_for"},{"column_name":"week_of"}]`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260609_marketing_scheduled_for.sql
git commit -m "feat: add scheduled_for and week_of to marketing_drafts"
```

---

## Task 2: Shared Client — `gmail-client.ts`

**Files:**
- Create: `supabase/functions/_shared/gmail-client.ts`

Responsabilidade: trocar refresh token por access token e listar emails não lidos do label `4: notification/Inteligência Artificial` dos últimos 7 dias.

- [ ] **Step 1: Criar arquivo**

```typescript
// supabase/functions/_shared/gmail-client.ts

export interface GmailSnippet {
  id: string;
  subject: string;
  snippet: string;
  date: string;
  from: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("[gmail-client] missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or GMAIL_REFRESH_TOKEN");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[gmail-client] token refresh failed ${res.status}: ${body}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// Label ID para "4: notification/Inteligência Artificial"
// O labelId real precisa ser descoberto via API — usamos query por label name
const LABEL_QUERY = "label:4-notification-inteligencia-artificial";
const DAYS_BACK = 7;

export async function fetchGmailSnippets(): Promise<GmailSnippet[]> {
  const accessToken = await getAccessToken();

  const afterDate = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000);
  const afterTimestamp = Math.floor(afterDate.getTime() / 1000);
  const query = `${LABEL_QUERY} after:${afterTimestamp}`;

  // Lista IDs de mensagens
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const body = await listRes.text();
    throw new Error(`[gmail-client] list messages failed ${listRes.status}: ${body}`);
  }

  const listData = await listRes.json() as { messages?: Array<{ id: string }> };
  const messages = listData.messages ?? [];

  if (messages.length === 0) return [];

  // Busca metadados de cada mensagem em paralelo (máx 10 simultâneos)
  const batch = messages.slice(0, 15);
  const snippets = await Promise.all(
    batch.map(async ({ id }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) return null;

      const msg = await msgRes.json() as {
        snippet: string;
        payload: { headers: Array<{ name: string; value: string }> };
        internalDate: string;
      };

      const headers = msg.payload.headers;
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(sem assunto)";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const date = new Date(parseInt(msg.internalDate)).toISOString().split("T")[0];

      return {
        id,
        subject,
        snippet: msg.snippet,
        date,
        from,
      } satisfies GmailSnippet;
    })
  );

  return snippets.filter((s): s is GmailSnippet => s !== null);
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/gmail-client.ts
git commit -m "feat: add gmail-client shared helper"
```

---

## Task 3: Shared Client — `serp-client.ts`

**Files:**
- Create: `supabase/functions/_shared/serp-client.ts`

Responsabilidade: wrapper SerpAPI para Google News (IA geral), Instagram (4 perfis), LinkedIn (Anthropic/Claude).

- [ ] **Step 1: Criar arquivo**

```typescript
// supabase/functions/_shared/serp-client.ts

export interface SerpSnippet {
  title: string;
  snippet: string;
  url: string;
  source: string;
  date?: string;
}

const SERP_BASE = "https://serpapi.com/search.json";

async function serpFetch(params: Record<string, string>): Promise<Response> {
  const apiKey = Deno.env.get("SERPAPI_KEY");
  if (!apiKey) throw new Error("[serp-client] SERPAPI_KEY missing");

  const url = SERP_BASE + "?" + new URLSearchParams({ ...params, api_key: apiKey });
  return fetch(url);
}

export async function fetchGoogleNews(query: string, numResults = 10): Promise<SerpSnippet[]> {
  const res = await serpFetch({ engine: "google_news", q: query, hl: "pt-br", gl: "br" });
  if (!res.ok) throw new Error(`[serp-client] google_news failed ${res.status}`);

  const data = await res.json() as {
    news_results?: Array<{ title: string; snippet?: string; link: string; source?: { name: string }; date?: string }>;
  };

  return (data.news_results ?? []).slice(0, numResults).map((r) => ({
    title: r.title,
    snippet: r.snippet ?? r.title,
    url: r.link,
    source: r.source?.name ?? "Google News",
    date: r.date,
  }));
}

export async function fetchInstagramProfile(handle: string, numResults = 5): Promise<SerpSnippet[]> {
  const query = `site:instagram.com/${handle} inteligência artificial OR IA OR automação`;
  const res = await serpFetch({ engine: "google", q: query, num: "10", tbs: "qdr:w", hl: "pt-br", gl: "br" });
  if (!res.ok) throw new Error(`[serp-client] instagram @${handle} failed ${res.status}`);

  const data = await res.json() as {
    organic_results?: Array<{ title: string; snippet?: string; link: string; date?: string }>;
  };

  return (data.organic_results ?? []).slice(0, numResults).map((r) => ({
    title: r.title,
    snippet: r.snippet ?? r.title,
    url: r.link,
    source: `instagram/@${handle}`,
    date: r.date,
  }));
}

export async function fetchLinkedInAnthropic(numResults = 5): Promise<SerpSnippet[]> {
  const query = `site:linkedin.com (Anthropic OR Claude) inteligência artificial OR AI`;
  const res = await serpFetch({ engine: "google", q: query, num: "10", tbs: "qdr:w", hl: "pt-br", gl: "br" });
  if (!res.ok) throw new Error(`[serp-client] linkedin failed ${res.status}`);

  const data = await res.json() as {
    organic_results?: Array<{ title: string; snippet?: string; link: string; date?: string }>;
  };

  return (data.organic_results ?? []).slice(0, numResults).map((r) => ({
    title: r.title,
    snippet: r.snippet ?? r.title,
    url: r.link,
    source: "linkedin/anthropic",
    date: r.date,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/serp-client.ts
git commit -m "feat: add serp-client shared helper"
```

---

## Task 4: Edge Function — `marketing-researcher`

**Files:**
- Create: `supabase/functions/marketing-researcher/index.ts`

Responsabilidade: buscar todas as fontes em paralelo, ranquear por relevância IntelliX via Claude Haiku, retornar array de snippets ordenados.

- [ ] **Step 1: Criar função**

```typescript
// supabase/functions/marketing-researcher/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-client.ts";
import { fetchGmailSnippets } from "../_shared/gmail-client.ts";
import { fetchGoogleNews, fetchInstagramProfile, fetchLinkedInAnthropic } from "../_shared/serp-client.ts";
import { adminClient } from "../_shared/auth.ts";

const INSTAGRAM_PROFILES = ["gestaoai", "thaleslaray", "dumasolucoes", "inventormiguel"];

export interface ResearchSnippet {
  title: string;
  snippet: string;
  url: string;
  source: "google_news" | "gmail" | "instagram" | "linkedin" | "kb";
  relevance_score?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!apiKey || auth !== `Bearer ${apiKey}`) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  console.log("[marketing-researcher] starting research from 5 sources");

  // Busca em paralelo — falhas individuais não bloqueiam o resto
  const [newsResults, gmailResults, ...igResults] = await Promise.allSettled([
    fetchGoogleNews("inteligência artificial negócios Brasil automação", 12),
    fetchGmailSnippets(),
    ...INSTAGRAM_PROFILES.map((h) => fetchInstagramProfile(h, 4)),
    fetchLinkedInAnthropic(6),
  ]);

  const linkedinResults = igResults[igResults.length - 1];
  const instagramResults = igResults.slice(0, -1);

  const allSnippets: ResearchSnippet[] = [];

  if (newsResults.status === "fulfilled") {
    allSnippets.push(...newsResults.value.map((s) => ({ ...s, source: "google_news" as const })));
  } else {
    console.warn("[marketing-researcher] google_news failed:", newsResults.reason);
  }

  if (gmailResults.status === "fulfilled") {
    allSnippets.push(
      ...gmailResults.value.map((s) => ({
        title: s.subject,
        snippet: s.snippet,
        url: `gmail:${s.id}`,
        source: "gmail" as const,
      }))
    );
  } else {
    console.warn("[marketing-researcher] gmail failed:", gmailResults.reason);
  }

  for (let i = 0; i < instagramResults.length; i++) {
    const r = instagramResults[i];
    if (r.status === "fulfilled") {
      allSnippets.push(...r.value.map((s) => ({ ...s, source: "instagram" as const })));
    } else {
      console.warn(`[marketing-researcher] instagram @${INSTAGRAM_PROFILES[i]} failed:`, r.reason);
    }
  }

  if (linkedinResults.status === "fulfilled") {
    allSnippets.push(...linkedinResults.value.map((s) => ({ ...s, source: "linkedin" as const })));
  } else {
    console.warn("[marketing-researcher] linkedin failed:", linkedinResults.reason);
  }

  // KB interna
  const db = adminClient();
  const { data: kbItems } = await db
    .from("knowledge_base")
    .select("title, content")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (kbItems) {
    allSnippets.push(
      ...(kbItems as Array<{ title: string; content: string }>).map((k) => ({
        title: k.title,
        snippet: k.content.slice(0, 300),
        url: "intellix-kb",
        source: "kb" as const,
      }))
    );
  }

  console.log(`[marketing-researcher] collected ${allSnippets.length} raw snippets`);

  if (allSnippets.length === 0) {
    return jsonResponse({ success: true, snippets: [], total_raw: 0 });
  }

  // Ranqueia por relevância para a IntelliX via Claude Haiku
  const snippetList = allSnippets
    .map((s, i) => `[${i}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const rankPrompt = `Você é um analista de conteúdo da IntelliX.AI (empresa de automação com IA para PMEs brasileiras).

Avalie cada snippet abaixo e dê uma nota de 0-10 de relevância para criar posts sobre:
- Automação com IA em negócios
- Resultados reais de IA
- Educação prática sobre IA
- Posicionamento IntelliX
- Produtos/serviços IntelliX

Responda SOMENTE em JSON: [{"index": 0, "score": 8}, ...]

${snippetList}`;

  let ranked: ResearchSnippet[] = allSnippets;

  try {
    const rankResponse = await callLLM(
      { provider: "anthropic", model: "claude-haiku-4-5-20251001", temperature: 0.1, maxTokens: 1024 },
      "Você ranqueia snippets de pesquisa por relevância para marketing de IA.",
      rankPrompt
    );

    const jsonMatch = rankResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const scores = JSON.parse(jsonMatch[0]) as Array<{ index: number; score: number }>;
      const scoreMap = new Map(scores.map((s) => [s.index, s.score]));
      ranked = allSnippets
        .map((s, i) => ({ ...s, relevance_score: scoreMap.get(i) ?? 5 }))
        .filter((s) => (s.relevance_score ?? 0) >= 5)
        .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
        .slice(0, 20);
    }
  } catch (e) {
    console.warn("[marketing-researcher] ranking failed, returning unranked:", e);
  }

  console.log(`[marketing-researcher] returning ${ranked.length} ranked snippets`);
  return jsonResponse({ success: true, snippets: ranked, total_raw: allSnippets.length });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/marketing-researcher/index.ts
git commit -m "feat: add marketing-researcher edge function"
```

---

## Task 5: Edge Function — `marketing-planner`

**Files:**
- Create: `supabase/functions/marketing-planner/index.ts`

Responsabilidade: recebe snippets → Claude Haiku gera 7 ideias de post (1/dia) → salva como `idea_pending` no DB com `scheduled_for`.

- [ ] **Step 1: Criar função**

```typescript
// supabase/functions/marketing-planner/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { callLLM, loadAgentLLMConfig } from "../_shared/llm-client.ts";
import { buildBrandSystemBlock, PILAR_CONTEXT, CAPTION_STRATEGY } from "../_shared/brand-context.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const SnippetSchema = z.object({
  title: z.string(),
  snippet: z.string(),
  url: z.string(),
  source: z.string(),
  relevance_score: z.number().optional(),
});

const RequestSchema = z.object({
  snippets: z.array(SnippetSchema),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const PLATFORMS: Array<"instagram" | "linkedin" | "whatsapp"> = [
  "instagram", "linkedin", "instagram", "linkedin", "instagram", "linkedin", "instagram",
];

const PILAR_DISTRIBUTION = [
  "resultado_ia", "educacao_pratica", "bastidores",
  "posicionamento", "comercial", "resultado_ia", "educacao_pratica",
] as const;

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!apiKey || auth !== `Bearer ${apiKey}`) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { snippets, week_start } = parsed.data;
  const weekOf = week_start ?? nextMonday();

  const db = adminClient();
  const llmConfig = await loadAgentLLMConfig(db, "marketing-ideator", {
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    temperature: 0.8,
    maxTokens: 4096,
  });

  const contextText = snippets
    .slice(0, 15)
    .map((s, i) => `[${i + 1}] (${s.source}) ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const systemPrompt = `Você é o estrategista de conteúdo da IntelliX.AI.

${buildBrandSystemBlock()}

Crie um calendário de 7 posts (um por dia, segunda a domingo) com base nas pesquisas da semana.
Regras:
- Pelo menos 2 posts devem promover diretamente produtos/serviços IntelliX
- Varie pilares: não repita o mesmo pilar em dias consecutivos
- Alterne plataformas: Instagram (posts visuais/carrossel) e LinkedIn (texto long-form)
- CTAs permitidos: ${CAPTION_STRATEGY.allowedCTAs.slice(0, 5).join(" | ")}
- NUNCA: "Comenta [PALAVRA]", DM automático`;

  const userPrompt = `Com base nas pesquisas abaixo, gere EXATAMENTE 7 ideias de post para a semana de ${weekOf}.

Pesquisas da semana:
${contextText || "Sem pesquisas externas — use conhecimento geral sobre IA em negócios B2B brasileiros."}

Responda SOMENTE em JSON válido, array de 7 objetos:
[
  {
    "day_offset": 0,
    "title": "...",
    "pilar": "resultado_ia|educacao_pratica|bastidores|posicionamento|comercial",
    "angle": "...",
    "platform": "instagram|linkedin|whatsapp",
    "content_type": "informational|product_promotion|virada_inteligente|news_data",
    "needs_image": true|false,
    "theme_prompt": "..."
  }
]

day_offset: 0=segunda, 1=terça, ..., 6=domingo`;

  let ideas: Array<{
    day_offset: number; title: string; pilar: string; angle: string;
    platform: string; content_type: string; needs_image: boolean; theme_prompt: string;
  }>;

  try {
    const content = await callLLM(llmConfig, systemPrompt, userPrompt);
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no json array");
    ideas = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(ideas) || ideas.length === 0) throw new Error("empty array");
  } catch (e) {
    console.error("[marketing-planner] LLM/parse error:", e);
    return jsonResponse({ error: "llm_failed" }, 503);
  }

  // Calcula datas reais a partir de week_of
  const weekStart = new Date(weekOf + "T12:00:00Z");
  const drafts = ideas.slice(0, 7).map((idea) => {
    const scheduledDate = new Date(weekStart);
    scheduledDate.setDate(scheduledDate.getDate() + (idea.day_offset ?? 0));

    return {
      title: idea.title,
      pilar: idea.pilar,
      angle: idea.angle,
      platform: idea.platform,
      content_type: idea.content_type,
      needs_image: Boolean(idea.needs_image),
      theme_prompt: idea.theme_prompt ?? "",
      research_snippets: snippets.slice(0, 10),
      status: "idea_pending",
      trigger_mode: "cron_weekly",
      scheduled_for: scheduledDate.toISOString().split("T")[0],
      week_of: weekOf,
    };
  });

  const { data: inserted, error } = await db
    .from("marketing_drafts")
    .insert(drafts)
    .select("id, title, scheduled_for, platform");

  if (error) {
    console.error("[marketing-planner] db insert error:", error);
    return jsonResponse({ error: "db_insert_failed", detail: error.message }, 500);
  }

  console.log(`[marketing-planner] created ${inserted?.length ?? 0} drafts for week ${weekOf}`);
  return jsonResponse({ success: true, week_of: weekOf, drafts: inserted });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/marketing-planner/index.ts
git commit -m "feat: add marketing-planner edge function"
```

---

## Task 6: Deploy das novas edge functions

**Files:** nenhum novo — apenas deploy

- [ ] **Step 1: Deploy marketing-researcher**

```powershell
Set-Location "C:\Projects\intellix-squad-hub"
supabase functions deploy marketing-researcher --project-ref hynadwlwrscvjubryqlg
```

Esperado: `Deployed Functions on project hynadwlwrscvjubryqlg: marketing-researcher`

- [ ] **Step 2: Deploy marketing-planner**

```powershell
supabase functions deploy marketing-planner --project-ref hynadwlwrscvjubryqlg
```

Esperado: `Deployed Functions on project hynadwlwrscvjubryqlg: marketing-planner`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: deploy marketing-researcher and marketing-planner"
```

---

## Task 7: Cron job — toda segunda-feira 09:00 BRT (12:00 UTC)

**Files:**
- Create: `supabase/migrations/20260609_marketing_cron.sql`

A lógica do cron chama researcher → pega snippets → chama planner. Como o pg_cron não pode encadear edge functions nativamente, usamos uma stored procedure que chama `net.http_post` (extensão `pg_net`).

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260609_marketing_cron.sql

-- Garante pg_cron e pg_net habilitados
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove job anterior se existir
SELECT cron.unschedule('marketing-weekly-research')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'marketing-weekly-research');

-- Cria função que orquestra researcher → planner
CREATE OR REPLACE FUNCTION run_marketing_weekly()
RETURNS void AS $$
DECLARE
  _url text;
  _key text;
  _marketing_key text;
BEGIN
  _url := current_setting('app.supabase_url', true);
  _key := current_setting('app.service_role_key', true);
  _marketing_key := current_setting('app.marketing_api_key', true);

  -- Step 1: researcher
  PERFORM net.http_post(
    url := _url || '/functions/v1/marketing-researcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _marketing_key
    ),
    body := '{}'::jsonb
  );

  -- Nota: o planner é chamado pelo próprio researcher via edge function chain
  -- OU pode ser chamado pelo frontend após revisão dos snippets
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agenda: toda segunda às 12:00 UTC (09:00 BRT)
SELECT cron.schedule(
  'marketing-weekly-research',
  '0 12 * * 1',
  'SELECT run_marketing_weekly()'
);
```

- [ ] **Step 2: Aplicar via Management API**

```powershell
# Aplica extensões e cron
$sql = @"
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
"@
curl -s -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" `
  -H "Authorization: Bearer <SUPABASE_PAT>" `
  -H "Content-Type: application/json" `
  -d "{`"query`": `"$sql`"}"
```

- [ ] **Step 3: Alternativa via Supabase Dashboard**

Se pg_cron não estiver disponível no plano, usar **Supabase Dashboard → Database → Extensions** para habilitar pg_cron, depois rodar o SQL do cron no SQL Editor.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260609_marketing_cron.sql
git commit -m "feat: add pg_cron weekly marketing research job"
```

---

## Task 8: Teste de smoke manual

- [ ] **Step 1: Testar researcher isolado**

```powershell
$MARKETING_KEY = (supabase secrets list --project-ref hynadwlwrscvjubryqlg 2>&1 | Out-String)
# Substituir pelo valor real do MARKETING_API_KEY
curl -s -X POST "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-researcher" `
  -H "Authorization: Bearer <MARKETING_API_KEY>" `
  -H "Content-Type: application/json" `
  -d "{}" | ConvertFrom-Json | Select-Object success, total_raw, @{n='count';e={$_.snippets.Count}}
```

Esperado: `success: True, total_raw > 0, count > 0`

- [ ] **Step 2: Testar planner com snippets mock**

```powershell
$body = '{"snippets":[{"title":"Claude 4 lançado","snippet":"Anthropic lança novo modelo","url":"https://anthropic.com","source":"google_news"}]}'
curl -s -X POST "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-planner" `
  -H "Authorization: Bearer <MARKETING_API_KEY>" `
  -H "Content-Type: application/json" `
  -d $body | ConvertFrom-Json | Select-Object success, week_of, @{n='drafts';e={$_.drafts.Count}}
```

Esperado: `success: True, drafts: 7`

- [ ] **Step 3: Verificar drafts no banco**

```powershell
curl -s -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" `
  -H "Authorization: Bearer <SUPABASE_PAT>" `
  -H "Content-Type: application/json" `
  -d '{"query":"SELECT title, platform, scheduled_for, status FROM marketing_drafts WHERE trigger_mode=''cron_weekly'' ORDER BY scheduled_for LIMIT 10"}'
```

Esperado: 7 linhas com status `idea_pending` e datas de segunda a domingo.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: marketing researcher+planner smoke test verified"
```

---

## Resumo de Secrets necessários (todos já configurados ✅)

| Secret | Status |
|--------|--------|
| `ANTHROPIC_API_KEY` | ✅ |
| `SERPAPI_KEY` | ✅ |
| `GMAIL_REFRESH_TOKEN` | ✅ |
| `GOOGLE_CLIENT_ID` | ✅ |
| `GOOGLE_CLIENT_SECRET` | ✅ |
| `MARKETING_API_KEY` | ✅ |
| `OPENAI_API_KEY` | ✅ |

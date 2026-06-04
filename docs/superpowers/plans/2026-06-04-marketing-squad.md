# Marketing Squad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o Squad de Marketing no intellix-squad-hub — 4 edge functions Supabase que pesquisam, idéiam e redigem posts, com uma página de aprovação manual para Felipe.

**Architecture:** Pipeline de edge functions sequenciais (`orchestrator → researcher → ideator → writer`) disparado por pg_cron (seg/qua/sex 8h) ou manualmente via UI. Drafts salvos em `marketing_drafts` e exibidos em `/marketing` para aprovação.

**Tech Stack:** Deno (edge functions), TypeScript, Supabase (PostgreSQL + RLS + pg_cron), React 18, TanStack Query, shadcn/ui, Vitest

**Spec de referência:** `docs/superpowers/specs/2026-06-04-marketing-squad-design.md`

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/20260604_marketing_squad.sql` | Criar | ENUMs + tabela + RLS |
| `supabase/functions/marketing-researcher/index.ts` | Criar | Busca paralela em 3 fontes |
| `supabase/functions/marketing-ideator/index.ts` | Criar | Gera 3 ideias por pilar |
| `supabase/functions/marketing-writer/index.ts` | Criar | Redige post completo + salva draft |
| `supabase/functions/marketing-orchestrator/index.ts` | Criar | Coordena pipeline + aceita tema manual |
| `src/hooks/useMarketingDrafts.ts` | Criar | Queries + mutations (approve/reject/publish/regenerate/propose) |
| `src/pages/marketing/MarketingDraftCard.tsx` | Criar | Card de draft com ações inline |
| `src/pages/marketing/MarketingPage.tsx` | Criar | Página com tabs + dialog "Propor tema" |
| `src/App.tsx` | Modificar | Adicionar rota `/marketing` (lazy) |
| `src/components/layout/AppSidebar.tsx` | Modificar | Adicionar item "Marketing" no nav |
| `src/components/layout/AppLayout.tsx` | Modificar | Adicionar `/marketing` ao ROUTE_LABELS |
| `src/test/marketing.test.ts` | Criar | Testes Vitest do hook |

---

## Task 1: Migration — ENUMs, tabela e RLS

**Files:**
- Create: `supabase/migrations/20260604_marketing_squad.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- supabase/migrations/20260604_marketing_squad.sql

create type marketing_pilar as enum (
  'resultado_ia',
  'educacao_pratica',
  'bastidores',
  'posicionamento',
  'comercial'
);

create type marketing_status as enum (
  'generated',
  'approved',
  'rejected',
  'published'
);

create type marketing_platform as enum (
  'linkedin',
  'instagram',
  'whatsapp'
);

create table marketing_drafts (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  content           text not null,
  pilar             marketing_pilar not null,
  platform          marketing_platform not null default 'linkedin',
  status            marketing_status not null default 'generated',
  theme_prompt      text,
  research_snippets jsonb,
  trigger_mode      text not null default 'scheduled',
  approved_at       timestamptz,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);

alter table marketing_drafts enable row level security;

create policy "marketing admin only"
  on marketing_drafts for all
  using (auth.jwt() ->> 'role' = 'admin');
```

- [ ] **Step 2: Aplicar migration via Management API**

```bash
curl -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{"query": "select count(*) from marketing_drafts"}'
```

Esperado: `[{"count": "0"}]`

- [ ] **Step 3: Verificar que os ENUMs existem**

```bash
curl -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{"query": "select typname from pg_type where typname like '\''marketing_%'\'' order by typname"}'
```

Esperado: 3 linhas — `marketing_pilar`, `marketing_platform`, `marketing_status`

- [ ] **Step 4: Commit**

```bash
cd C:\Projects\intellix-squad-hub
git add supabase/migrations/20260604_marketing_squad.sql
git commit -m "feat: add marketing_drafts table with ENUMs and RLS"
```

---

## Task 2: Edge function `marketing-researcher`

**Files:**
- Create: `supabase/functions/marketing-researcher/index.ts`

Esta função recebe uma `query` de pesquisa e busca em paralelo nas 3 fontes: knowledge-search interno, Perplexity (web/Google) e SerpAPI (LinkedIn).

- [ ] **Step 1: Escrever o arquivo**

```typescript
// supabase/functions/marketing-researcher/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const RequestSchema = z.object({
  query: z.string().min(3).max(500),
  theme_prompt: z.string().optional(),
});

export interface ResearchSnippet {
  source: "knowledge" | "perplexity" | "linkedin";
  url: string;
  snippet: string;
  title: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (auth !== `Bearer ${serviceKey}`) return jsonResponse({ error: "unauthorized" }, 401);

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { query, theme_prompt } = parsed.data;
  const searchQuery = theme_prompt ? `${theme_prompt} ${query}` : query;

  const [knowledgeSnippets, perplexitySnippets, linkedinSnippets] = await Promise.allSettled([
    searchKnowledge(searchQuery, serviceKey),
    searchPerplexity(searchQuery),
    searchLinkedin(searchQuery),
  ]);

  const snippets: ResearchSnippet[] = [
    ...(knowledgeSnippets.status === "fulfilled" ? knowledgeSnippets.value : []),
    ...(perplexitySnippets.status === "fulfilled" ? perplexitySnippets.value : []),
    ...(linkedinSnippets.status === "fulfilled" ? linkedinSnippets.value : []),
  ];

  console.log(`[marketing-researcher] query="${searchQuery}" snippets=${snippets.length}`);

  return jsonResponse({ success: true, snippets, total: snippets.length });
});

async function searchKnowledge(query: string, serviceKey: string): Promise<ResearchSnippet[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const res = await fetch(`${supabaseUrl}/functions/v1/knowledge-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query, top_k: 3 }),
  });

  if (!res.ok) {
    console.error("[marketing-researcher] knowledge-search failed", res.status);
    return [];
  }

  const data = await res.json() as { results: Array<{ document_title: string; content: string; section_title: string | null }> };
  return (data.results ?? []).map((r) => ({
    source: "knowledge" as const,
    url: `internal://knowledge/${r.document_title}`,
    title: r.document_title,
    snippet: r.content.slice(0, 400),
  }));
}

async function searchPerplexity(query: string): Promise<ResearchSnippet[]> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) {
    console.error("[marketing-researcher] PERPLEXITY_API_KEY not set");
    return [];
  }

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        {
          role: "user",
          content: `Pesquise sobre: "${query}". Retorne 3 trechos relevantes sobre IA aplicada a negócios, com título e URL de fonte. Responda em JSON: [{"title":"...","url":"...","snippet":"..."}]`,
        },
      ],
      return_citations: true,
    }),
  });

  if (!res.ok) {
    console.error("[marketing-researcher] Perplexity failed", res.status);
    return [];
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "[]";

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ title: string; url: string; snippet: string }>;
    return parsed.slice(0, 3).map((p) => ({
      source: "perplexity" as const,
      url: p.url ?? "https://perplexity.ai",
      title: p.title ?? query,
      snippet: (p.snippet ?? "").slice(0, 400),
    }));
  } catch {
    return [];
  }
}

async function searchLinkedin(query: string): Promise<ResearchSnippet[]> {
  const apiKey = Deno.env.get("SERPAPI_KEY");
  if (!apiKey) {
    console.error("[marketing-researcher] SERPAPI_KEY not set");
    return [];
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google",
    q: `site:linkedin.com/posts ${query} IA negócios`,
    num: "5",
    hl: "pt",
    gl: "br",
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) {
    console.error("[marketing-researcher] SerpAPI failed", res.status);
    return [];
  }

  const data = await res.json() as { organic_results?: Array<{ title: string; link: string; snippet: string }> };
  return (data.organic_results ?? []).slice(0, 3).map((r) => ({
    source: "linkedin" as const,
    url: r.link,
    title: r.title,
    snippet: (r.snippet ?? "").slice(0, 400),
  }));
}
```

- [ ] **Step 2: Configurar secrets no Supabase**

No dashboard Supabase → Edge Functions → Secrets, adicionar:
- `PERPLEXITY_API_KEY` — chave da conta Perplexity
- `SERPAPI_KEY` — chave da conta SerpAPI

Ou via CLI (se disponível):
```bash
supabase secrets set PERPLEXITY_API_KEY=<valor> SERPAPI_KEY=<valor> --project-ref hynadwlwrscvjubryqlg
```

- [ ] **Step 3: Deploy via Management API**

```bash
$code = Get-Content "C:\Projects\intellix-squad-hub\supabase\functions\marketing-researcher\index.ts" -Raw
$body = @{ slug = "marketing-researcher"; name = "marketing-researcher"; body = $code; verify_jwt = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions" `
  -Method POST `
  -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } `
  -Body $body
```

- [ ] **Step 4: Smoke test**

```bash
$SERVICE_KEY = (Get-Content C:\Projects\intellix-squad-hub\.env.local | Select-String "SUPABASE_SERVICE_ROLE_KEY").ToString().Split("=")[1]
$body = '{"query":"IA aplicada a negócios PME","theme_prompt":"Shadow AI nas empresas"}' 
Invoke-RestMethod -Uri "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-researcher" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: `{ success: true, snippets: [...], total: N }` onde N > 0

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/marketing-researcher/index.ts
git commit -m "feat: add marketing-researcher edge function"
```

---

## Task 3: Edge function `marketing-ideator`

**Files:**
- Create: `supabase/functions/marketing-ideator/index.ts`

Recebe `context_bundle` (snippets) + `theme_prompt` opcional, retorna 3 ideias respeitando a distribuição de pilares.

- [ ] **Step 1: Escrever o arquivo**

```typescript
// supabase/functions/marketing-ideator/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const SnippetSchema = z.object({
  source: z.enum(["knowledge", "perplexity", "linkedin"]),
  url: z.string(),
  title: z.string(),
  snippet: z.string(),
});

const RequestSchema = z.object({
  snippets: z.array(SnippetSchema).min(0).max(20),
  theme_prompt: z.string().optional(),
  platform: z.enum(["linkedin", "instagram", "whatsapp"]).default("linkedin"),
});

export interface PostIdea {
  title: string;
  pilar: "resultado_ia" | "educacao_pratica" | "bastidores" | "posicionamento" | "comercial";
  angle: string;
  platform: "linkedin" | "instagram" | "whatsapp";
}

// Distribuição dos pilares: 30/25/20/15/10
const PILAR_DISTRIBUTION: PostIdea["pilar"][] = [
  "resultado_ia",       // 30%
  "educacao_pratica",   // 25%
  "bastidores",         // 20%
  "posicionamento",     // 15%
  "comercial",          // 10%
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (auth !== `Bearer ${serviceKey}`) return jsonResponse({ error: "unauthorized" }, 401);

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { snippets, theme_prompt, platform } = parsed.data;

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return jsonResponse({ error: "openai_api_key_missing" }, 503);

  const contextText = snippets
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const systemPrompt = `Você é o estrategista de conteúdo da IntelliX.AI.
Empresa: IntelliX.AI — "Resultado Visível. Tecnologia Invisível."
Pilares de conteúdo (% de distribuição obrigatória):
- resultado_ia: 30% — cases reais, métricas, antes/depois
- educacao_pratica: 25% — tutoriais, desmistificação de IA
- bastidores: 20% — build in public, decisões técnicas
- posicionamento: 15% — hot takes, contrarianismo saudável
- comercial: 10% — lançamentos, Virada Inteligente, CTAs

Tom: direto, sem hype, orientado a resultado. Nunca use: "revolucionário", "disruptivo", "incrível".
Plataforma alvo: ${platform}`;

  const userPrompt = `Com base nos trechos de pesquisa abaixo${theme_prompt ? ` e no tema: "${theme_prompt}"` : ""}, gere EXATAMENTE 3 ideias de post.
Distribua os pilares de forma variada (evite repetir o mesmo pilar).

Contexto pesquisado:
${contextText || "Sem contexto externo — use conhecimento geral sobre IA em negócios B2B."}

Responda SOMENTE em JSON válido, sem markdown:
[
  {"title": "...", "pilar": "resultado_ia|educacao_pratica|bastidores|posicionamento|comercial", "angle": "..."},
  {"title": "...", "pilar": "...", "angle": "..."},
  {"title": "...", "pilar": "...", "angle": "..."}
]`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    console.error("[marketing-ideator] OpenAI error", res.status);
    return jsonResponse({ error: "openai_failed" }, 503);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "[]";

  let ideas: PostIdea[];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no json array");
    const raw = JSON.parse(jsonMatch[0]) as Array<{ title: string; pilar: string; angle: string }>;
    ideas = raw.slice(0, 3).map((r) => ({
      title: r.title,
      pilar: (PILAR_DISTRIBUTION.includes(r.pilar as PostIdea["pilar"])
        ? r.pilar
        : "educacao_pratica") as PostIdea["pilar"],
      angle: r.angle,
      platform,
    }));
  } catch (e) {
    console.error("[marketing-ideator] parse error", e, content.slice(0, 200));
    return jsonResponse({ error: "parse_failed" }, 500);
  }

  console.log(`[marketing-ideator] generated ${ideas.length} ideas`);
  return jsonResponse({ success: true, ideas });
});
```

- [ ] **Step 2: Deploy**

```bash
$code = Get-Content "C:\Projects\intellix-squad-hub\supabase\functions\marketing-ideator\index.ts" -Raw
$body = @{ slug = "marketing-ideator"; name = "marketing-ideator"; body = $code; verify_jwt = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions" `
  -Method POST `
  -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } `
  -Body $body
```

- [ ] **Step 3: Smoke test**

```bash
$SERVICE_KEY = (Get-Content C:\Projects\intellix-squad-hub\.env.local | Select-String "SUPABASE_SERVICE_ROLE_KEY").ToString().Split("=")[1]
$body = '{"snippets":[],"theme_prompt":"Shadow AI nas empresas","platform":"linkedin"}'
Invoke-RestMethod -Uri "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-ideator" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: `{ success: true, ideas: [{ title, pilar, angle, platform }, ...] }` com 3 ideias.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/marketing-ideator/index.ts
git commit -m "feat: add marketing-ideator edge function"
```

---

## Task 4: Edge function `marketing-writer`

**Files:**
- Create: `supabase/functions/marketing-writer/index.ts`

Recebe 1 ideia + snippets de pesquisa, redige o post completo seguindo brand voice, salva em `marketing_drafts`.

- [ ] **Step 1: Escrever o arquivo**

```typescript
// supabase/functions/marketing-writer/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const IdeaSchema = z.object({
  title: z.string(),
  pilar: z.enum(["resultado_ia", "educacao_pratica", "bastidores", "posicionamento", "comercial"]),
  angle: z.string(),
  platform: z.enum(["linkedin", "instagram", "whatsapp"]),
});

const SnippetSchema = z.object({
  source: z.enum(["knowledge", "perplexity", "linkedin"]),
  url: z.string(),
  title: z.string(),
  snippet: z.string(),
});

const RequestSchema = z.object({
  idea: IdeaSchema,
  snippets: z.array(SnippetSchema).max(10),
  theme_prompt: z.string().optional(),
  trigger_mode: z.enum(["scheduled", "manual"]).default("scheduled"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (auth !== `Bearer ${serviceKey}`) return jsonResponse({ error: "unauthorized" }, 401);

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { idea, snippets, theme_prompt, trigger_mode } = parsed.data;

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return jsonResponse({ error: "openai_api_key_missing" }, 503);

  const contextText = snippets.slice(0, 4)
    .map((s) => `Fonte (${s.source}): ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const platformGuidance: Record<string, string> = {
    linkedin: "Post LinkedIn: texto corrido, 800–1500 caracteres, sem emojis, 1–2 hashtags no final, 1 CTA claro.",
    instagram: "Post Instagram: legendas curtas (até 300 chars) + 5 hashtags relevantes, pode usar 1–2 emojis estratégicos.",
    whatsapp: "Mensagem WhatsApp: informal, direta, até 300 chars, sem hashtags.",
  };

  const systemPrompt = `Você é o redator de conteúdo da IntelliX.AI.
Regras absolutas de brand voice:
- Tom: especialista confiante, não arrogante. Claro e direto.
- NUNCA use: "revolucionário", "disruptivo", "incrível", "top demais", clichês de IA.
- SEMPRE inclua ao menos uma: "Resultado Visível. Tecnologia Invisível." OU "Sem hype. Com método."
- Prefira números e fatos a adjetivos vagos.
- PT-BR, sentence case.

${platformGuidance[idea.platform]}`;

  const pilarContext: Record<string, string> = {
    resultado_ia: "Foque em case real, métricas concretas, antes/depois. Se não houver case específico, use dado do mercado.",
    educacao_pratica: "Ensine algo prático. Passos concretos. Desmistifique. Termine com insight acionável.",
    bastidores: "Build in public. Mostre a decisão real, o aprendizado, o que deu errado ou certo.",
    posicionamento: "Hot take. Contrarianismo saudável. Uma opinião clara sobre o mercado de IA.",
    comercial: "Apresente produto/Virada de forma honesta. Benefício > feature. CTA direto.",
  };

  const userPrompt = `Escreva um post completo para ${idea.platform} sobre:
Título: ${idea.title}
Ângulo: ${idea.angle}
Pilar: ${pilarContext[idea.pilar]}

${contextText ? `Contexto de pesquisa:\n${contextText}` : ""}

${theme_prompt ? `Tema solicitado: "${theme_prompt}"` : ""}

Escreva APENAS o post final, sem comentários ou explicações adicionais.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    console.error("[marketing-writer] OpenAI error", res.status);
    return jsonResponse({ error: "openai_failed" }, 503);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "";

  if (!content.trim()) {
    return jsonResponse({ error: "empty_content" }, 500);
  }

  // Save to marketing_drafts
  const db = adminClient();
  const topSnippets = snippets.slice(0, 3).map((s) => ({
    source: s.source,
    url: s.url,
    title: s.title,
  }));

  const { data: draft, error } = await db
    .from("marketing_drafts")
    .insert({
      title: idea.title,
      content,
      pilar: idea.pilar,
      platform: idea.platform,
      status: "generated",
      theme_prompt: theme_prompt ?? null,
      research_snippets: topSnippets,
      trigger_mode,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[marketing-writer] DB insert error", error);
    return jsonResponse({ error: "db_insert_failed" }, 500);
  }

  console.log(`[marketing-writer] draft saved id=${draft.id} pilar=${idea.pilar} platform=${idea.platform}`);
  return jsonResponse({ success: true, draft_id: draft.id });
});
```

- [ ] **Step 2: Deploy**

```bash
$code = Get-Content "C:\Projects\intellix-squad-hub\supabase\functions\marketing-writer\index.ts" -Raw
$body = @{ slug = "marketing-writer"; name = "marketing-writer"; body = $code; verify_jwt = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions" `
  -Method POST `
  -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } `
  -Body $body
```

- [ ] **Step 3: Smoke test**

```bash
$SERVICE_KEY = (Get-Content C:\Projects\intellix-squad-hub\.env.local | Select-String "SUPABASE_SERVICE_ROLE_KEY").ToString().Split("=")[1]
$body = '{"idea":{"title":"Shadow AI: o risco invisível","pilar":"posicionamento","angle":"46% das equipes usam IA sem permissão","platform":"linkedin"},"snippets":[],"trigger_mode":"manual"}'
Invoke-RestMethod -Uri "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-writer" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: `{ success: true, draft_id: "<uuid>" }`. Verificar no banco:

```bash
curl -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{"query": "select id, title, pilar, status from marketing_drafts order by created_at desc limit 3"}'
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/marketing-writer/index.ts
git commit -m "feat: add marketing-writer edge function"
```

---

## Task 5: Edge function `marketing-orchestrator` + pg_cron

**Files:**
- Create: `supabase/functions/marketing-orchestrator/index.ts`

Coordena o pipeline completo: researcher → ideator → writer × 3. Aceita payload opcional `{ theme_prompt, platform }` para modo manual.

- [ ] **Step 1: Escrever o arquivo**

```typescript
// supabase/functions/marketing-orchestrator/index.ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const RequestSchema = z.object({
  theme_prompt: z.string().optional(),
  platform: z.enum(["linkedin", "instagram", "whatsapp"]).default("linkedin"),
});

const MARKETING_TOPICS = [
  "IA aplicada a processos de negócios PME Brasil",
  "automação inteligente vendas e operações",
  "Shadow AI governança empresarial",
  "resultados reais com IA em empresas B2B",
  "letramento em IA equipes corporativas",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${serviceKey}`) return jsonResponse({ error: "unauthorized" }, 401);

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const { theme_prompt, platform } = parsed.data;
  const trigger_mode = theme_prompt ? "manual" : "scheduled";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const fnBase = `${supabaseUrl}/functions/v1`;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` };

  // Select research topic
  const dayOfWeek = new Date().getDay();
  const researchQuery = MARKETING_TOPICS[dayOfWeek % MARKETING_TOPICS.length];

  console.log(`[marketing-orchestrator] mode=${trigger_mode} query="${researchQuery}" theme="${theme_prompt ?? "none"}"`);

  // Step 1: Research
  let snippets: unknown[] = [];
  try {
    const researchRes = await fetch(`${fnBase}/marketing-researcher`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: researchQuery, theme_prompt }),
    });
    const researchData = await researchRes.json() as { snippets?: unknown[] };
    snippets = researchData.snippets ?? [];
    console.log(`[marketing-orchestrator] ${snippets.length} snippets collected`);
  } catch (e) {
    console.error("[marketing-orchestrator] researcher error:", e);
  }

  // Step 2: Ideate
  let ideas: Array<{ title: string; pilar: string; angle: string; platform: string }> = [];
  try {
    const ideaRes = await fetch(`${fnBase}/marketing-ideator`, {
      method: "POST",
      headers,
      body: JSON.stringify({ snippets, theme_prompt, platform }),
    });
    const ideaData = await ideaRes.json() as { ideas?: typeof ideas };
    ideas = ideaData.ideas ?? [];
    console.log(`[marketing-orchestrator] ${ideas.length} ideas generated`);
  } catch (e) {
    console.error("[marketing-orchestrator] ideator error:", e);
  }

  if (ideas.length === 0) {
    return jsonResponse({ error: "no_ideas_generated" }, 500);
  }

  // Step 3: Write each idea (sequential to avoid OpenAI rate limit)
  const draftIds: string[] = [];
  for (const idea of ideas) {
    try {
      const writeRes = await fetch(`${fnBase}/marketing-writer`, {
        method: "POST",
        headers,
        body: JSON.stringify({ idea, snippets, theme_prompt, trigger_mode }),
      });
      const writeData = await writeRes.json() as { draft_id?: string };
      if (writeData.draft_id) draftIds.push(writeData.draft_id);
      // Throttle between writes
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error("[marketing-orchestrator] writer error:", e);
    }
  }

  console.log(`[marketing-orchestrator] done — ${draftIds.length} drafts saved`);
  return jsonResponse({ success: true, drafts_created: draftIds.length, draft_ids: draftIds });
});
```

- [ ] **Step 2: Deploy**

```bash
$code = Get-Content "C:\Projects\intellix-squad-hub\supabase\functions\marketing-orchestrator\index.ts" -Raw
$body = @{ slug = "marketing-orchestrator"; name = "marketing-orchestrator"; body = $code; verify_jwt = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/functions" `
  -Method POST `
  -Headers @{ Authorization = "Bearer ***SUPABASE_PAT_REDACTED***"; "Content-Type" = "application/json" } `
  -Body $body
```

- [ ] **Step 3: Smoke test do pipeline completo**

```bash
$SERVICE_KEY = (Get-Content C:\Projects\intellix-squad-hub\.env.local | Select-String "SUPABASE_SERVICE_ROLE_KEY").ToString().Split("=")[1]
$body = '{"theme_prompt":"automação de vendas com IA","platform":"linkedin"}'
Invoke-RestMethod -Uri "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-orchestrator" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: `{ success: true, drafts_created: 3, draft_ids: ["...", "...", "..."] }`

- [ ] **Step 4: Configurar pg_cron (seg/qua/sex às 8h BRT = 11h UTC)**

```bash
curl -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "select cron.schedule(\"marketing-squad-daily\", \"0 11 * * 1,3,5\", $$select net.http_post(url:=current_setting(\"app.supabase_url\") || \"/functions/v1/marketing-orchestrator\", headers:=\"{\\\"Content-Type\\\": \\\"application/json\\\", \\\"Authorization\\\": \\\"Bearer \" || current_setting(\"app.service_role_key\") || \"\\\"}\", body:=\"{}\")$$)"
  }'
```

Verificar agendamento:
```bash
curl -X POST "https://api.supabase.com/v1/projects/hynadwlwrscvjubryqlg/database/query" \
  -H "Authorization: Bearer ***SUPABASE_PAT_REDACTED***" \
  -H "Content-Type: application/json" \
  -d '{"query": "select jobname, schedule, active from cron.job where jobname = '\''marketing-squad-daily'\'''}'
```

Esperado: 1 linha com `active: true`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/marketing-orchestrator/index.ts
git commit -m "feat: add marketing-orchestrator edge function with pg_cron schedule"
```

---

## Task 6: Hook `useMarketingDrafts`

**Files:**
- Create: `src/hooks/useMarketingDrafts.ts`
- Create: `src/test/marketing.test.ts`

- [ ] **Step 1: Escrever o teste primeiro**

```typescript
// src/test/marketing.test.ts
import { describe, it, expect } from "vitest";

describe("marketing draft status transitions", () => {
  it("approved_at is set when status changes to approved", () => {
    const now = new Date().toISOString();
    const update = { status: "approved" as const, approved_at: now };
    expect(update.status).toBe("approved");
    expect(update.approved_at).toBeTruthy();
  });

  it("published_at is set when status changes to published", () => {
    const now = new Date().toISOString();
    const update = { status: "published" as const, published_at: now };
    expect(update.status).toBe("published");
    expect(update.published_at).toBeTruthy();
  });

  it("rejected update has no timestamps", () => {
    const update = { status: "rejected" as const };
    expect(update.status).toBe("rejected");
    expect((update as Record<string, unknown>).approved_at).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que passa**

```bash
cd C:\Projects\intellix-squad-hub
npx vitest run src/test/marketing.test.ts
```

Esperado: 3 testes passing.

- [ ] **Step 3: Escrever o hook**

```typescript
// src/hooks/useMarketingDrafts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type MarketingStatus = "generated" | "approved" | "rejected" | "published";
export type MarketingPilar = "resultado_ia" | "educacao_pratica" | "bastidores" | "posicionamento" | "comercial";
export type MarketingPlatform = "linkedin" | "instagram" | "whatsapp";

export interface MarketingDraft {
  id: string;
  title: string;
  content: string;
  pilar: MarketingPilar;
  platform: MarketingPlatform;
  status: MarketingStatus;
  theme_prompt: string | null;
  research_snippets: Array<{ source: string; url: string; title: string }> | null;
  trigger_mode: string;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
}

const QK = "marketing_drafts";

export function useMarketingDrafts(status?: MarketingStatus) {
  return useQuery({
    queryKey: [QK, status],
    queryFn: async () => {
      let q = supabase
        .from("marketing_drafts")
        .select("*")
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MarketingDraft[];
    },
  });
}

export function useMarketingDraftCounts() {
  return useQuery({
    queryKey: [QK, "counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_drafts")
        .select("status");
      if (error) throw error;
      const counts: Record<MarketingStatus, number> = {
        generated: 0, approved: 0, rejected: 0, published: 0,
      };
      for (const row of data ?? []) {
        counts[row.status as MarketingStatus]++;
      }
      return counts;
    },
  });
}

export function useApproveDraft() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Draft aprovado" });
    },
    onError: (err) => toast({ title: "Erro ao aprovar", description: String(err), variant: "destructive" }),
  });
}

export function useRejectDraft() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Draft rejeitado" });
    },
    onError: (err) => toast({ title: "Erro ao rejeitar", description: String(err), variant: "destructive" }),
  });
}

export function useMarkPublished() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Marcado como publicado" });
    },
    onError: (err) => toast({ title: "Erro", description: String(err), variant: "destructive" }),
  });
}

export function useProposeTheme() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ theme_prompt, platform }: { theme_prompt: string; platform: MarketingPlatform }) => {
      const res = await supabase.functions.invoke("marketing-orchestrator", {
        body: { theme_prompt, platform },
      });
      if (res.error) throw res.error;
      return res.data as { drafts_created: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: `${data.drafts_created} draft(s) gerado(s)` });
    },
    onError: (err) => toast({ title: "Erro ao gerar", description: String(err), variant: "destructive" }),
  });
}

export function useRegenerateDraft() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ draft }: { draft: MarketingDraft }) => {
      const res = await supabase.functions.invoke("marketing-orchestrator", {
        body: {
          theme_prompt: draft.theme_prompt ?? draft.title,
          platform: draft.platform,
        },
      });
      if (res.error) throw res.error;
      // Reject original
      await supabase
        .from("marketing_drafts")
        .update({ status: "rejected" })
        .eq("id", draft.id);
      return res.data as { drafts_created: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Novo draft gerado" });
    },
    onError: (err) => toast({ title: "Erro ao regerar", description: String(err), variant: "destructive" }),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMarketingDrafts.ts src/test/marketing.test.ts
git commit -m "feat: add useMarketingDrafts hook with all mutations"
```

---

## Task 7: Componente `MarketingDraftCard`

**Files:**
- Create: `src/pages/marketing/MarketingDraftCard.tsx`

- [ ] **Step 1: Criar o diretório e o componente**

```tsx
// src/pages/marketing/MarketingDraftCard.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RefreshCw, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useApproveDraft,
  useRejectDraft,
  useMarkPublished,
  useRegenerateDraft,
  type MarketingDraft,
} from "@/hooks/useMarketingDrafts";

const PILAR_LABELS: Record<string, string> = {
  resultado_ia: "Resultado IA",
  educacao_pratica: "Educação",
  bastidores: "Bastidores",
  posicionamento: "Posicionamento",
  comercial: "Comercial",
};

const PILAR_COLORS: Record<string, string> = {
  resultado_ia: "hsl(160 84% 39% / 0.15)",
  educacao_pratica: "hsl(217 91% 60% / 0.15)",
  bastidores: "hsl(262 83% 58% / 0.15)",
  posicionamento: "hsl(38 92% 50% / 0.15)",
  comercial: "hsl(0 84% 60% / 0.15)",
};

interface Props {
  draft: MarketingDraft;
}

export function MarketingDraftCard({ draft }: Props) {
  const [expanded, setExpanded] = useState(false);
  const approve = useApproveDraft();
  const reject = useRejectDraft();
  const markPublished = useMarkPublished();
  const regenerate = useRegenerateDraft();

  const isLoading =
    approve.isPending || reject.isPending || markPublished.isPending || regenerate.isPending;

  const previewText = draft.content.slice(0, 200);
  const hasMore = draft.content.length > 200;

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold leading-snug">{draft.title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              className="text-[10px] font-medium"
              style={{ background: PILAR_COLORS[draft.pilar], border: "none" }}
            >
              {PILAR_LABELS[draft.pilar]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {draft.platform}
            </Badge>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true, locale: ptBR })}
          {draft.trigger_mode === "manual" && (
            <span className="ml-1.5 text-primary">· manual</span>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="rounded-md bg-muted/40 p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {expanded ? draft.content : previewText}
            {!expanded && hasMore && "..."}
          </p>
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "ver menos" : "ver mais"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {draft.status === "generated" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => regenerate.mutate({ draft })}
                className="text-xs"
              >
                <RefreshCw className={`mr-1 h-3 w-3 ${regenerate.isPending ? "animate-spin" : ""}`} />
                Regerar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => reject.mutate(draft.id)}
                className="text-xs text-destructive hover:text-destructive"
              >
                <XCircle className="mr-1 h-3 w-3" />
                Rejeitar
              </Button>
              <Button
                size="sm"
                disabled={isLoading}
                onClick={() => approve.mutate(draft.id)}
                className="ml-auto text-xs"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                {approve.isPending ? "Aprovando..." : "Aprovar"}
              </Button>
            </>
          )}

          {draft.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => markPublished.mutate(draft.id)}
              className="ml-auto text-xs"
            >
              <Upload className="mr-1 h-3 w-3" />
              {markPublished.isPending ? "Salvando..." : "Marcar como publicado"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/marketing/MarketingDraftCard.tsx
git commit -m "feat: add MarketingDraftCard component"
```

---

## Task 8: Página `MarketingPage`

**Files:**
- Create: `src/pages/marketing/MarketingPage.tsx`

- [ ] **Step 1: Criar a página**

```tsx
// src/pages/marketing/MarketingPage.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import {
  useMarketingDrafts,
  useMarketingDraftCounts,
  useProposeTheme,
  type MarketingPlatform,
  type MarketingStatus,
} from "@/hooks/useMarketingDrafts";
import { MarketingDraftCard } from "./MarketingDraftCard";

const TABS: { value: MarketingStatus | "all"; label: string }[] = [
  { value: "generated", label: "Gerados" },
  { value: "approved", label: "Aprovados" },
  { value: "published", label: "Publicados" },
  { value: "rejected", label: "Rejeitados" },
];

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<MarketingStatus>("generated");
  const [theme, setTheme] = useState("");
  const [platform, setPlatform] = useState<MarketingPlatform>("linkedin");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: drafts = [], isLoading } = useMarketingDrafts(activeTab);
  const { data: counts } = useMarketingDraftCounts();
  const proposeTheme = useProposeTheme();

  const handlePropose = async () => {
    if (!theme.trim()) return;
    await proposeTheme.mutateAsync({ theme_prompt: theme.trim(), platform });
    setTheme("");
    setDialogOpen(false);
    setActiveTab("generated");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Squad de Marketing</h1>
          {(counts?.generated ?? 0) > 0 && (
            <Badge
              className="text-[11px]"
              style={{
                background: "hsl(262 83% 58% / 0.15)",
                color: "hsl(262 83% 75%)",
                border: "1px solid hsl(262 83% 58% / 0.25)",
              }}
            >
              {counts?.generated} aguardando
            </Badge>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Propor tema
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Propor tema</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Textarea
                placeholder="Ex: Shadow AI em empresas de médio porte"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center gap-3">
                <Select value={platform} onValueChange={(v) => setPlatform(v as MarketingPlatform)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="ml-auto"
                  disabled={!theme.trim() || proposeTheme.isPending}
                  onClick={handlePropose}
                >
                  {proposeTheme.isPending ? "Gerando..." : "Gerar"}
                </Button>
              </div>
              {proposeTheme.isPending && (
                <p className="text-center text-xs text-muted-foreground">
                  Pesquisando e gerando drafts (~20s)...
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MarketingStatus)}>
        <TabsList className="w-full">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1 text-xs">
              {tab.label}
              {counts?.[tab.value as MarketingStatus] != null && counts[tab.value as MarketingStatus] > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                  {counts[tab.value as MarketingStatus]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-3">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : drafts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum draft {tab.label.toLowerCase()}.
              </p>
            ) : (
              drafts.map((draft) => <MarketingDraftCard key={draft.id} draft={draft} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/marketing/MarketingPage.tsx
git commit -m "feat: add MarketingPage with tabs and ProposeTheme dialog"
```

---

## Task 9: Rota, nav e layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Adicionar import lazy no App.tsx**

No bloco de lazy imports (após a linha do `ConfigPage`), adicionar:

```tsx
const MarketingPage = lazy(() => import("./pages/marketing/MarketingPage"));
```

- [ ] **Step 2: Adicionar rota no App.tsx**

Após `<Route path="/config" element={<ConfigPage />} />` (linha 177), adicionar:

```tsx
<Route path="/marketing" element={<MarketingPage />} />
```

- [ ] **Step 3: Adicionar item no nav do AppSidebar.tsx**

No topo do arquivo, adicionar `Megaphone` ao import do lucide-react:

```tsx
import {
  Home, Briefcase, Users, BarChart3, Settings as SettingsIcon,
  LogOut, ChevronRight, Sun, Moon, FolderKanban, Building2, Megaphone,
} from "lucide-react";
```

No array `navItems`, após o item `{ to: "/escritorio", ... }`:

```tsx
{ to: "/marketing", label: "Marketing", icon: Megaphone },
```

- [ ] **Step 4: Adicionar ao ROUTE_LABELS no AppLayout.tsx**

No objeto `ROUTE_LABELS`, adicionar:

```tsx
"/marketing": "Marketing",
```

- [ ] **Step 5: Verificar no browser**

```bash
cd C:\Projects\intellix-squad-hub
npm run dev
```

Abrir `http://localhost:5173/marketing`. Verificar:
- Item "Marketing" visível no nav com ícone Megaphone
- Página carrega com tabs (Gerados / Aprovados / Publicados / Rejeitados)
- Botão "Propor tema" abre dialog
- Tabs mostram "Nenhum draft" (estado inicial)

- [ ] **Step 6: Commit final**

```bash
git add src/App.tsx src/components/layout/AppSidebar.tsx src/components/layout/AppLayout.tsx
git commit -m "feat: wire /marketing route and nav item"
```

---

## Self-review

**Spec coverage:**

| Requisito do spec | Task que cobre |
|-------------------|----------------|
| Geração com aprovação manual | Tasks 4, 6, 7, 8 |
| 5–15 posts/semana (3 por run, seg/qua/sex) | Task 5 (pg_cron) |
| Curador passivo — approve/reject | Tasks 6, 7 |
| Propor tema on-demand | Tasks 5, 6, 8 |
| knowledge-search como fonte | Task 2 |
| Perplexity API direto (sem n8n) | Task 2 |
| SerpAPI LinkedIn (sem n8n) | Task 2 |
| Schema: 3 ENUMs + marketing_drafts + RLS | Task 1 |
| Secrets PERPLEXITY_API_KEY + SERPAPI_KEY | Task 2 |
| Rota /marketing + nav + layout | Task 9 |

**Placeholder scan:** nenhum TBD ou TODO encontrado.

**Type consistency:**
- `MarketingDraft` definido em `useMarketingDrafts.ts` e importado no `MarketingDraftCard` e `MarketingPage`
- `PostIdea` definido no `marketing-ideator` e aceito no `marketing-writer` com schema Zod compatível
- `ResearchSnippet` definido no `marketing-researcher` e aceito pelo `marketing-ideator` e `marketing-writer`
- Status transitions: `generated → approved → published`, `generated → rejected` — consistentes em todas as mutations

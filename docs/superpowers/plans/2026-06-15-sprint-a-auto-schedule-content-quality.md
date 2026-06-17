# Sprint A — Auto-Schedule + Content Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o auto-scheduling funcionar quando posts são aprovados pela UI, e elevar a qualidade das imagens geradas usando os tokens reais do design system IntelliX.

**Architecture:** Dois subsistemas independentes: (1) um trigger PL/pgSQL que intercepta UPDATE na tabela `marketing_drafts` e atribui `scheduled_for` automaticamente quando `status` muda para `approved` — replicando o algoritmo que já existe no `marketing-approval` edge function; (2) upgrades nos prompts de imagem do `marketing-image-gen` e no `buildBrandSystemBlock` do `_shared/brand-context.ts` para incluir tipografia, identidade visual por formato e qualidade de renderização mais alta.

**Tech Stack:** Supabase (PL/pgSQL triggers, Deno edge functions), TypeScript strict, GPT Image 2 (OpenAI), GPT-4o-mini (diretor criativo), `_shared/brand-context.ts` como fonte única de verdade de marca.

---

## Mapa de Arquivos

### Criados
| Arquivo | Responsabilidade |
|---------|-----------------|
| `supabase/migrations/20260615_marketing_auto_schedule_trigger.sql` | Trigger PL/pgSQL que auto-atribui `scheduled_for` na aprovação |

### Modificados
| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/_shared/brand-context.ts` | Adiciona `VISUAL_TOKENS` (tipografia, fontes, tokens de cor) e inclui no `buildBrandSystemBlock()` |
| `supabase/functions/marketing-image-gen/index.ts` | Eleva quality de `"low"` para `"medium"`, adiciona tipografia Space Grotesk nos prompts |
| `supabase/functions/marketing-generate/index.ts` | Corrige variável `imageUrl` obsoleta na linha 362 |

---

## Task 1: Migration — Trigger de Auto-Scheduling

Quando um post é aprovado pela **UI** (botão Aprovar no painel), o hook `useApproveDraft` apenas faz `UPDATE status = 'approved'`. Diferente do fluxo WhatsApp (via `marketing-approval` edge function), o campo `scheduled_for` **não é atribuído**. O `marketing-publisher` cron verifica `scheduled_for <= today` — portanto posts aprovados pela UI nunca são publicados automaticamente sem esta correção.

**Files:**
- Create: `supabase/migrations/20260615_marketing_auto_schedule_trigger.sql`

- [ ] **Step 1: Criar o arquivo de migration**

Criar `supabase/migrations/20260615_marketing_auto_schedule_trigger.sql` com o conteúdo abaixo. O algoritmo replica exatamente o da `marketing-approval` edge function (`nextScheduledFor()`):
- Instagram: próxima Terça(2), Quinta(4) ou Sábado(6) disponível
- LinkedIn: próxima Segunda(1), Quarta(3) ou Sexta(5) disponível
- WhatsApp: amanhã
- Janela de 21 dias. Conflito = outro post da mesma plataforma no mesmo dia com `status IN ('approved','published')`

```sql
-- ──────────────────────────────────────────────────────────────────────────────
-- marketing_drafts: auto-assign scheduled_for on approval
-- Mirrors the nextScheduledFor() algorithm in marketing-approval edge function.
-- Fires BEFORE UPDATE, so NEW.scheduled_for is set before the row is written.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION marketing_auto_assign_scheduled_for()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_days  int[];
  v_candidate    date;
  v_dow          int;   -- 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  v_conflict     boolean;
  v_checked      int := 0;
BEGIN
  -- Only act when transitioning to 'approved' with no scheduled_for set
  IF NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.scheduled_for IS NULL
  THEN
    CASE NEW.platform
      WHEN 'instagram' THEN v_target_days := ARRAY[2, 4, 6];   -- Tue Thu Sat
      WHEN 'linkedin'  THEN v_target_days := ARRAY[1, 3, 5];   -- Mon Wed Fri
      ELSE
        -- WhatsApp or unknown: schedule for tomorrow
        NEW.scheduled_for := (CURRENT_DATE + INTERVAL '1 day')::date;
        RETURN NEW;
    END CASE;

    v_candidate := CURRENT_DATE + INTERVAL '1 day';

    WHILE v_checked < 21 LOOP
      v_dow := EXTRACT(DOW FROM v_candidate)::int;

      IF v_dow = ANY(v_target_days) THEN
        SELECT EXISTS (
          SELECT 1 FROM marketing_drafts
          WHERE  platform     = NEW.platform
          AND    scheduled_for = v_candidate
          AND    status       IN ('approved', 'published')
          AND    id           != NEW.id
        ) INTO v_conflict;

        IF NOT v_conflict THEN
          NEW.scheduled_for := v_candidate;
          RETURN NEW;
        END IF;
      END IF;

      v_candidate := v_candidate + INTERVAL '1 day';
      v_checked   := v_checked + 1;
    END LOOP;

    -- Fallback: next calendar day (should never reach here in practice)
    NEW.scheduled_for := (CURRENT_DATE + INTERVAL '1 day')::date;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS marketing_drafts_auto_schedule ON marketing_drafts;

CREATE TRIGGER marketing_drafts_auto_schedule
  BEFORE UPDATE ON marketing_drafts
  FOR EACH ROW
  EXECUTE FUNCTION marketing_auto_assign_scheduled_for();

-- ──────────────────────────────────────────────────────────────────────────────
-- Backfill: assign scheduled_for to already-approved posts that have none.
-- Runs once at migration time; the WHILE loop logic is replicated in SQL.
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r            RECORD;
  v_target_days int[];
  v_candidate  date;
  v_dow        int;
  v_conflict   boolean;
  v_checked    int;
BEGIN
  FOR r IN
    SELECT id, platform
    FROM   marketing_drafts
    WHERE  status = 'approved'
    AND    scheduled_for IS NULL
  LOOP
    CASE r.platform
      WHEN 'instagram' THEN v_target_days := ARRAY[2, 4, 6];
      WHEN 'linkedin'  THEN v_target_days := ARRAY[1, 3, 5];
      ELSE
        UPDATE marketing_drafts
        SET    scheduled_for = (CURRENT_DATE + INTERVAL '1 day')::date
        WHERE  id = r.id;
        CONTINUE;
    END CASE;

    v_candidate := CURRENT_DATE + INTERVAL '1 day';
    v_checked   := 0;

    WHILE v_checked < 21 LOOP
      v_dow := EXTRACT(DOW FROM v_candidate)::int;

      IF v_dow = ANY(v_target_days) THEN
        SELECT EXISTS (
          SELECT 1 FROM marketing_drafts
          WHERE  platform      = r.platform
          AND    scheduled_for = v_candidate
          AND    status        IN ('approved', 'published')
          AND    id            != r.id
        ) INTO v_conflict;

        IF NOT v_conflict THEN
          UPDATE marketing_drafts
          SET    scheduled_for = v_candidate
          WHERE  id = r.id;
          EXIT;
        END IF;
      END IF;

      v_candidate := v_candidate + INTERVAL '1 day';
      v_checked   := v_checked + 1;
    END LOOP;

    IF v_checked = 21 THEN
      UPDATE marketing_drafts
      SET    scheduled_for = (CURRENT_DATE + INTERVAL '1 day')::date
      WHERE  id = r.id;
    END IF;
  END LOOP;
END;
$$;
```

- [ ] **Step 2: Aplicar a migration localmente**

```bash
cd C:\Projects\intellix-squad-hub
npx supabase db push --local 2>&1
```

Saída esperada: `Applying migration 20260615_marketing_auto_schedule_trigger.sql... ok`

Se não tiver Supabase rodando localmente, aplicar direto no projeto remoto:

```bash
npx supabase db push 2>&1
```

- [ ] **Step 3: Verificar no painel Supabase**

No Supabase Dashboard → SQL Editor, executar:

```sql
SELECT trigger_name, event_manipulation, action_timing
FROM   information_schema.triggers
WHERE  event_object_table = 'marketing_drafts'
AND    trigger_name = 'marketing_drafts_auto_schedule';
```

Saída esperada: 1 linha com `marketing_drafts_auto_schedule | UPDATE | BEFORE`

- [ ] **Step 4: Testar o trigger**

No SQL Editor:

```sql
-- 1. Pega um draft em idea_pending para usar como teste
SELECT id, platform, status, scheduled_for
FROM   marketing_drafts
WHERE  status = 'idea_pending'
LIMIT  1;

-- 2. Aprova-o e verifica que scheduled_for é atribuído
-- Substitua <ID> pelo UUID do step anterior
UPDATE marketing_drafts
SET    status = 'approved'
WHERE  id = '<ID>'
AND    status = 'idea_pending';

-- 3. Confirma
SELECT id, platform, status, scheduled_for
FROM   marketing_drafts
WHERE  id = '<ID>';
```

Saída esperada: `scheduled_for` preenchido com a próxima Terça/Quinta/Sáb (Instagram) ou Seg/Qua/Sex (LinkedIn).

- [ ] **Step 5: Reverter o post de teste**

```sql
UPDATE marketing_drafts
SET    status = 'idea_pending', scheduled_for = NULL
WHERE  id = '<ID>';
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260615_marketing_auto_schedule_trigger.sql
git commit -m "feat(marketing): add DB trigger to auto-assign scheduled_for on UI approval"
```

---

## Task 2: Adicionar `VISUAL_TOKENS` ao `brand-context.ts`

O `buildBrandSystemBlock()` já injeta posicionamento, voz, dores, formats e CTAs em todos os agentes. O que está faltando é a **identidade visual concreta**: fontes, tamanho mínimo, regras de cor. Isso é especialmente crítico para o agente `marketing-image-gen` que direciona o GPT Image 2.

**Files:**
- Modify: `supabase/functions/_shared/brand-context.ts`

- [ ] **Step 1: Adicionar `VISUAL_TOKENS` antes de `buildBrandSystemBlock`**

Localizar a linha que contém `// ─── Função: buildBrandSystemBlock` (por volta da linha 409) e inserir **antes** dela:

```typescript
// ─── Tokens Visuais (Design System) ─────────────────────────────────────────

export const VISUAL_TOKENS = {
  colors: {
    background: "#171723",    // dark navy — fundo universal de todos os slides
    primary:    "#196FA8",    // azul royal — destaques técnicos, labels INSIGHT/DADO
    accent:     "#F2A82A",    // âmbar dourado — SOMENTE CTA e números de destaque (1 por slide)
    lightBlue:  "#4FA6CC",    // azul claro — palavras enfatizadas secundárias
    textPrimary:   "#FAFAFA", // texto principal
    textSecondary: "#BDBDC3", // texto secundário / muted
    textMuted:     "#8C8C99", // legendas e rótulos pequenos
  },
  typography: {
    display: "Space Grotesk",       // títulos, headlines, números âncora
    body:    "Space Grotesk",       // corpo de texto
    mono:    "JetBrains Mono",      // eyebrows, estatísticas, rótulos de dado
    weights: [400, 500, 600, 700, 800],
    minFontSize: "24px",            // NUNCA menor que 24px em nenhum slide
  },
  formats: {
    carousel:     { width: 1080, height: 1350, ratio: "4:5"  }, // Instagram / LinkedIn
    presentation: { width: 1920, height: 1080, ratio: "16:9" },
    stories:      { width: 1080, height: 1920, ratio: "9:16" },
    linkedinPost: { width: 1200, height: 1500, ratio: "4:5"  },
  },
  components: {
    accentRuler: "Régua de 5–6px × 72–100px, gradiente 135° #F2A82A → #196FA8",
    glassCard:   "rgba(255,255,255,0.035) + blur(8px) + borda 8% branco + raio 16px",
    iconTile:    "Quadrado arredondado, ícone Lucide stroke 1.7, fundo com opacidade 13%",
    ctaButton:   "Gradiente âmbar 135°, texto #1A140A, máximo 1 por peça",
    logoAsset:   "IntelliX.AI — nunca sólido, sempre split gold→blue no wordmark",
  },
  rules: [
    "Fundo #171723 SEMPRE — nunca preto puro (#000) ou branco (#FFF)",
    "Âmbar #F2A82A APENAS em CTAs e números de turnaround — máximo 1 elemento por slide",
    "Gradiente de assinatura: 135° de #F2A82A (gold) para #196FA8 (blue)",
    "Sentence case sempre — nunca Title Case nem TUDO MAIÚSCULO exceto em eyebrows de dados",
    "Ícones Lucide stroke — nunca emoji decorativo",
    "Logo IntelliX.AI em TODOS os slides, canto superior esquerdo ou inferior direito",
    "Fonte mínima: 24px em qualquer elemento de texto",
  ],
} as const;
```

- [ ] **Step 2: Atualizar `buildBrandSystemBlock` para incluir visual tokens**

Localizar o final da função `buildBrandSystemBlock()` (por volta da linha 447) e adicionar o bloco visual antes do return da string template. Substituir o return atual por:

```typescript
export function buildBrandSystemBlock(): string {
  return `## IntelliX.AI — Contexto de Marca e Estratégia de Conteúdo

### Posicionamento
"${POSITIONING.taglinePrimary}" | "${POSITIONING.taglineSecondary}"
Pilares: Pragmático · Empático · Ousado sem arrogância.

### Voz e Tom
${BRAND_VOICE.register}
NUNCA usar: ${BRAND_VOICE.forbidden.slice(0, 6).join(", ")}.
SEMPRE incluir (ao menos uma): ${BRAND_VOICE.required.anchors.join(" | ")}.

### Portfólio
Cases: ${PORTFOLIO.cases.map((c) => `${c.product} (${c.client})`).join(", ")}.
Virada Inteligente: treinamento imersivo 4h · ${PORTFOLIO.viradaInteligente.pricing.regular} (early bird ${PORTFOLIO.viradaInteligente.pricing.earlyBird}).
Dado Shadow AI: ${PORTFOLIO.viradaInteligente.shadowAI}
Frameworks internos (não são produtos): RadarAI (diagnóstico) · ForjaAI (desenvolvimento) · TrilhaAI (mentoria).

### Dores do Público
${AUDIENCE_PAINS.slice(0, 4).map((p, i) => `${i + 1}. ${p}`).join("\n")}

### Mix de Conteúdo
- 75-85% sem imagem: educação, bastidores, posicionamento, notícias/dados
- 15-25% com imagem: promoção, Virada, infográficos com dados reais
- Distribuição: 40% storytelling · 20% filosófico · 20% FAQ produto · 10% educativo · 10% prova social

### Formatos
- Formato A (Storytelling 7-11 slides): personagem-espelho, micro-suspense →, CTA "link na bio" ou "me chama no direct"
- Formato B (FAQ 8-10 slides): perguntas + Sim./Não., descredencia hype, resolve objeções, CTA "link na bio"
- Formato C (Filosófico 5 slides): polarização → confirmação inesperada → síntese paradoxal, sem CTA ou "salva esse post"
- Formato D (Produto+Descredenciamento 6-8 slides): afasta lead errado, prova com número, CTA baixa pressão
- Formato E (Data Story 7 slides): Dado âncora → Contexto → Insight → Implicação → Recomendação → IntelliX → CTA

### REGRA CRÍTICA — CTAs
NUNCA usar "Comenta [PALAVRA] que eu te envio no direct" ou qualquer variação.
Não há automação de DM ativa. Lead que comenta e não recebe prejudica a credibilidade da IntelliX.
CTAs permitidos: ${CAPTION_STRATEGY.allowedCTAs.slice(0, 5).join(" | ")}

### Identidade Visual (para direção de arte e prompts de imagem)
CORES: Fundo ${VISUAL_TOKENS.colors.background} · Azul ${VISUAL_TOKENS.colors.primary} · Âmbar ${VISUAL_TOKENS.colors.accent} (só CTA/números) · Texto ${VISUAL_TOKENS.colors.textPrimary}
TIPOGRAFIA: ${VISUAL_TOKENS.typography.display} (display/body) + ${VISUAL_TOKENS.typography.mono} (dados/eyebrows) · Mínimo ${VISUAL_TOKENS.typography.minFontSize}
GRADIENTE DE ASSINATURA: 135° ${VISUAL_TOKENS.colors.accent} → ${VISUAL_TOKENS.colors.primary}
REGRAS VISUAIS: ${VISUAL_TOKENS.rules.slice(0, 4).join(" · ")}`;
}
```

- [ ] **Step 3: Verificar que o TypeScript compila sem erros**

```bash
cd C:\Projects\intellix-squad-hub
npx tsc --noEmit 2>&1
```

Saída esperada: sem erros. Se houver erro de `const` em `VISUAL_TOKENS` (problema com `as const` profundo), remover o `as const` do objeto externo mantendo apenas nos arrays.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/brand-context.ts
git commit -m "feat(marketing): add VISUAL_TOKENS to brand-context and include in buildBrandSystemBlock"
```

---

## Task 3: Elevar qualidade das imagens no `marketing-image-gen`

Atualmente a qualidade do GPT Image 2 está em `"low"`. O system prompt do diretor criativo menciona os hex codes IntelliX mas não inclui a tipografia Space Grotesk, as regras de hierarquia visual ou os tokens de componentes (accent ruler, glass card). Esta task eleva esses dois pontos.

**Files:**
- Modify: `supabase/functions/marketing-image-gen/index.ts`

- [ ] **Step 1: Elevar quality de `"low"` para `"medium"`**

Localizar a linha com `quality: "low"` (por volta da linha 170) e alterar:

```typescript
// ANTES:
body: JSON.stringify({ model: "gpt-image-2", prompt: fullPrompt, size: "1024x1024", quality: "low" }),

// DEPOIS:
body: JSON.stringify({ model: "gpt-image-2", prompt: fullPrompt, size: "1024x1024", quality: "medium" }),
```

- [ ] **Step 2: Adicionar tipografia e regras visuais ao `BASE_STYLE_SUFFIX`**

Localizar a constante `BASE_STYLE_SUFFIX` (linha ~157) e substituir por:

```typescript
const BASE_STYLE_SUFFIX = `
BRAND COLORS: Deep navy background #171723 (never pure black). Blue #196FA8 for technical highlights. Gold #F2A82A for CTAs and standout numbers only — max 1 amber element per image.
BRAND GRADIENT: 135° from #F2A82A (gold) to #196FA8 (blue) — use on accent elements, titles, or divider lines.
TYPOGRAPHY: Space Grotesk sans-serif — bold/800 weight for headlines, 600 for body. JetBrains Mono for stats, eyebrows, data labels. Minimum 24px equivalent for any text element.
STYLE: Cinematic photorealistic editorial photography OR premium illustrated infographic — never generic tech stock art.
LIGHTING: Dramatic low-key, dark atmosphere reinforcing the #171723 background.
COMPOSITION: Square 1:1 format. Clear focal point. Professional, premium B2B feel.
TEXT IN IMAGE: Include the post headline as a bold typographic element — Space Grotesk, white (#FAFAFA) or gold (#F2A82A), strong contrast, positioned in bottom or top third. Max 8 words in CAPS for the headline.
LOGO PLACEMENT: IntelliX.AI wordmark (gold "IntelliX" + blue ".AI") in bottom-left or top-left corner, small and unobtrusive.
ACCENT RULE: A 5-6px horizontal line with the brand gradient (gold→blue) can be used as a decorative divider.
BANNED ELEMENTS: NO robot hands, NO floating logos, NO glowing brains, NO abstract node networks, NO cartoonish elements, NO pure black backgrounds, NO white backgrounds.`;
```

- [ ] **Step 3: Adicionar informação de formato no `buildDirectorUserPrompt`**

Localizar a função `buildDirectorUserPrompt` (linha ~83). Após a linha `const trackNote = ...` (linha ~114), adicionar:

```typescript
  const typographyNote = `TYPOGRAPHY DIRECTIVE: Use Space Grotesk bold/800 for the main headline in the image. JetBrains Mono for any data/statistic elements. All text minimum 24px equivalent. Color: white #FAFAFA or gold #F2A82A on dark navy #171723 background.`;
```

E no return (linha ~116), adicionar `typographyNote` ao prompt:

```typescript
  return `Crie ${count} prompt(s) de imagem DISTINTOS e ESPECÍFICOS para este post:

TÍTULO: ${title}
${angle ? `ÂNGULO: ${angle}` : ""}
PILAR: ${pilarContext[pilar] ?? pilar}
PLATAFORMA: ${platformNote}
${trackNote}
${typographyNote}
CONTEÚDO:
${excerpt}

Requisitos para cada prompt:
1. Descreva uma CENA ESPECÍFICA que representa visualmente este post — não genérica
2. Inclua: ambiente, iluminação, composição, elementos visuais específicos ao tema
3. Pode incluir silhuetas de pessoas em contextos profissionais (sem rostos visíveis)
4. Pode incluir elementos de interface/dashboard RELEVANTES ao tema do post
5. Cada variação deve ter um conceito visual DIFERENTE das outras
6. OBRIGATÓRIO: inclua no prompt uma instrução para inserir o título do post como headline bold tipográfico (Space Grotesk 800, branco ou dourado) na imagem. Use as primeiras palavras mais impactantes do título (máximo 6-8 palavras em CAPS), posicionado na parte superior ou inferior da imagem, com alto contraste sobre o fundo escuro #171723
7. Escreva o prompt em inglês, detalhado, 3-5 frases`;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/marketing-image-gen/index.ts
git commit -m "feat(marketing): upgrade image quality to medium and add brand typography to prompts"
```

---

## Task 4: Corrigir variável obsoleta em `marketing-generate`

A linha 362 referencia `imageUrl` que não existe mais no escopo — a geração de imagem foi movida para `marketing-image-gen`. Em runtime Deno isso não causa crash (o valor é `undefined`), mas é um bug de código que enganará futuros desenvolvedores.

**Files:**
- Modify: `supabase/functions/marketing-generate/index.ts`

- [ ] **Step 1: Corrigir a referência obsoleta**

Localizar a linha 362 (o `console.log` final antes do `return jsonResponse`):

```typescript
// ANTES (linha ~362):
console.log(`[marketing-generate] draft=${draft_id} type=${draft.content_type} image=${imageUrl ? "yes" : "no"}`);

// DEPOIS:
console.log(`[marketing-generate] draft=${draft_id} type=${draft.content_type} platform=${draft.platform} format=${format}`);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/marketing-generate/index.ts
git commit -m "fix(marketing): remove stale imageUrl reference in marketing-generate"
```

---

## Task 5: Deploy das Edge Functions

**Files:** (nenhum arquivo novo — apenas deploy)

- [ ] **Step 1: Deploy de todas as funções modificadas**

```bash
cd C:\Projects\intellix-squad-hub
npx supabase functions deploy marketing-image-gen --project-ref $(npx supabase projects list --json 2>/dev/null | python -c "import sys,json; p=[x for x in json.load(sys.stdin) if 'squad' in x.get('name','').lower()]; print(p[0]['id'] if p else 'MISSING')" 2>/dev/null || echo "SEE_BELOW") 2>&1
```

Se o comando acima falhar para obter o project-ref automaticamente, usar o project ref diretamente. Verificar com:

```bash
npx supabase projects list 2>&1
```

E então:

```bash
npx supabase functions deploy marketing-image-gen --project-ref <PROJECT_REF>
npx supabase functions deploy marketing-generate --project-ref <PROJECT_REF>
```

O `_shared/brand-context.ts` é importado em tempo de execução pelas funções que o referenciam — ele é bundled automaticamente no deploy de cada função que o importa. Não há deploy separado para shared files.

- [ ] **Step 2: Verificar logs após deploy**

```bash
npx supabase functions logs marketing-image-gen --project-ref <PROJECT_REF> 2>&1 | head -20
```

Saída esperada: sem erros de import ou runtime.

- [ ] **Step 3: Smoke test — aprovar um post pela UI e verificar scheduled_for**

1. Abrir o sistema em `http://localhost:5173` (ou URL de produção)
2. Navegar para `/marketing`
3. Clicar em um post com status `generated`
4. Clicar em "Aprovar post" no painel direito
5. Verificar no Supabase Dashboard:

```sql
SELECT id, platform, status, scheduled_for, approved_at
FROM   marketing_drafts
WHERE  status = 'approved'
ORDER  BY approved_at DESC
LIMIT  3;
```

Saída esperada: `scheduled_for` preenchido com a próxima data correta para a plataforma.

- [ ] **Step 4: Smoke test — gerar imagens e verificar qualidade**

1. Selecionar um post `generated` que precise de imagem
2. Clicar em "Gerar imagem" (1 opção)
3. Verificar nos logs do Supabase que a requisição foi para GPT Image 2 com `quality: "medium"`
4. Verificar que a imagem gerada tem o texto do título visível e usa o dark navy como fundo

```bash
npx supabase functions logs marketing-image-gen --project-ref <PROJECT_REF> --tail 2>&1
```

- [ ] **Step 5: Commit final com nota de deploy**

```bash
git add .
git commit -m "chore(marketing): Sprint A deployed — auto-schedule trigger + image quality upgrade"
```

---

## Self-Review

### Cobertura de spec

| Requisito Sprint A | Task |
|-------------------|------|
| UI approval → `scheduled_for` auto-atribuído | Task 1 (DB trigger) |
| Backfill de posts approved sem `scheduled_for` | Task 1 (DO block na migration) |
| Algoritmo igual ao marketing-approval (sem divergência) | Task 1 (mesma lógica Tue/Thu/Sat e Mon/Wed/Fri) |
| Design system visual nos agentes | Task 2 (VISUAL_TOKENS + buildBrandSystemBlock) |
| Tipografia Space Grotesk nos prompts de imagem | Task 3 (BASE_STYLE_SUFFIX + buildDirectorUserPrompt) |
| Qualidade de imagem elevada | Task 3 (quality: "medium") |
| Bug stale imageUrl corrigido | Task 4 |
| Funções deployadas | Task 5 |

### Verificações de tipo

- `VISUAL_TOKENS` é `export const` — acessível em `buildBrandSystemBlock()` dentro do mesmo arquivo ✓
- `buildBrandSystemBlock()` referencia `VISUAL_TOKENS.colors`, `VISUAL_TOKENS.typography`, `VISUAL_TOKENS.rules` — todos definidos em Task 2 ✓
- `BASE_STYLE_SUFFIX` é uma constante de módulo — não requer import ✓
- `typographyNote` é uma `const` local dentro de `buildDirectorUserPrompt` — não polui o escopo ✓

### Placeholders

Nenhum "TBD", "TODO" ou "handle edge cases" encontrado.

### Riscos

- **`quality: "medium"` vs `"low"`**: custo por imagem sobe ~3×. Para o volume atual (< 20 posts/mês) é irrelevante. Monitorar se escalar.
- **Trigger PL/pgSQL**: o `BEFORE UPDATE` não é ativado por `supabase.rpc()` chamadas que bypassem o ORM — verificar que `useApproveDraft` usa o cliente Supabase padrão (usa, conforme confirmado no hook).
- **Backfill**: o bloco `DO $$` roda uma vez na migration. Se houver muitos posts aprovados sem data, pode demorar. Em produção com < 50 posts, é seguro.

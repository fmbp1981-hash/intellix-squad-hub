# Marketing UI — Metricool-Inspired Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a seção de Marketing do IntelliX Squad Hub com layout inspirado no Metricool — calendário visual de agendamento, painel de preview de posts e visualização em grade — mantendo todo o pipeline de aprovação existente.

**Architecture:** Layout de 3 colunas (sidebar de filtros | área principal com toggle Calendar/Grid/List | painel de detalhe deslizante à direita). O painel de detalhe substitui a expansão inline dos cards atuais — clicar em qualquer post abre o `PostPreview` + ações no painel direito. O calendário usa `scheduled_for` (coluna já existe no DB) para plotar posts por data.

**Tech Stack:** React 18 + TypeScript strict, TanStack Query v5, shadcn/ui, Tailwind CSS, Framer Motion, date-fns, Lucide React. Sem novas dependências — tudo já instalado.

---

## Mapa de Arquivos

### Criados
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/pages/marketing/MarketingCalendar.tsx` | Grade de calendário mensal com posts plotados por `scheduled_for` |
| `src/pages/marketing/MarketingGridView.tsx` | Grade de miniaturas de posts (3 colunas), clique abre painel |
| `src/pages/marketing/MarketingListView.tsx` | Lista vertical de cards melhorados (extrai lógica atual do MarketingPage) |
| `src/pages/marketing/MarketingPostPanel.tsx` | Painel deslizante à direita — preview completo + todas as ações |
| `src/pages/marketing/MarketingProposeDialog.tsx` | Modal "Propor tema" (extrai ProposePanel do MarketingPage) |

### Modificados
| Arquivo | O que muda |
|---------|-----------|
| `src/pages/marketing/MarketingPage.tsx` | Rewrite: layout 3 colunas, sidebar de filtros, toggle de views |
| `src/pages/marketing/MarketingDraftCard.tsx` | Adiciona `GridCard` e `ListCard` com novo design visual |
| `src/hooks/useMarketingDrafts.ts` | Adiciona `scheduled_for` ao tipo `MarketingDraft` + hook `useUpdateScheduledFor` |

---

## Task 1: Adicionar `scheduled_for` ao tipo e hook

**Files:**
- Modify: `src/hooks/useMarketingDrafts.ts`

- [ ] **Step 1: Adicionar `scheduled_for` à interface `MarketingDraft`**

Em `useMarketingDrafts.ts`, na interface `MarketingDraft` (linha ~19), adicionar após `created_at`:

```typescript
export interface MarketingDraft {
  id: string;
  title: string;
  angle: string | null;
  content: string;
  pilar: MarketingPilar;
  platform: MarketingPlatform;
  content_type: MarketingContentType | null;
  status: MarketingStatus;
  theme_prompt: string | null;
  research_snippets: Array<{ source: string; url: string; title: string }> | null;
  image_url: string | null;
  slide_images: SlideImage[] | null;
  generated_images: string[] | null;
  trigger_mode: string;
  approved_at: string | null;
  published_at: string | null;
  scheduled_for: string | null;   // ← NOVO
  created_at: string;
}
```

- [ ] **Step 2: Adicionar hook `useUpdateScheduledFor`**

Ao final do arquivo `useMarketingDrafts.ts`, adicionar:

```typescript
export function useUpdateScheduledFor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, scheduled_for }: { id: string; scheduled_for: string | null }) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ scheduled_for })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Agendamento atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar agendamento", variant: "destructive" });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMarketingDrafts.ts
git commit -m "feat(marketing): add scheduled_for to MarketingDraft type and useUpdateScheduledFor hook"
```

---

## Task 2: Extrair ProposeDialog

**Files:**
- Create: `src/pages/marketing/MarketingProposeDialog.tsx`

- [ ] **Step 1: Criar o arquivo**

```typescript
// src/pages/marketing/MarketingProposeDialog.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { useProposeTheme, type MarketingPlatform } from "@/hooks/useMarketingDrafts";

interface MarketingProposeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MarketingProposeDialog({ open, onClose }: MarketingProposeDialogProps) {
  const [theme, setTheme] = useState("");
  const [platform, setPlatform] = useState<MarketingPlatform>("linkedin");
  const propose = useProposeTheme();

  const handleSubmit = async () => {
    if (!theme.trim()) return;
    await propose.mutateAsync({ theme_prompt: theme.trim(), platform });
    setTheme("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        style={{ background: "oklch(0.16 0.01 250)", border: "1px solid oklch(0.26 0.02 262)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold text-foreground">
            Propor tema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            placeholder="Ex: Shadow AI em empresas de médio porte"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            rows={3}
            className="resize-none text-[13px]"
            style={{ background: "oklch(0.13 0.01 250)", border: "1px solid oklch(0.24 0.01 250)" }}
            autoFocus
          />

          <div className="flex items-center gap-2">
            <Select value={platform} onValueChange={(v) => setPlatform(v as MarketingPlatform)}>
              <SelectTrigger className="w-36 h-8 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              disabled={!theme.trim() || propose.isPending}
              onClick={handleSubmit}
              className="ml-auto h-8 gap-1.5 text-[12px]"
              style={{
                background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
                color: "white",
                border: "none",
              }}
            >
              {propose.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> Gerar ideias</>
              )}
            </Button>
          </div>

          {propose.isPending && (
            <p className="text-center text-[11px]" style={{ color: "oklch(0.55 0.02 250)" }}>
              Pesquisando e gerando ideias (~15s)...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/marketing/MarketingProposeDialog.tsx
git commit -m "feat(marketing): extract ProposeDialog component"
```

---

## Task 3: Painel de Detalhe — `MarketingPostPanel`

Este é o painel deslizante à direita que aparece ao clicar em qualquer post. Contém preview completo + todas as ações de aprovação/publicação.

**Files:**
- Create: `src/pages/marketing/MarketingPostPanel.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// src/pages/marketing/MarketingPostPanel.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, CheckCircle, XCircle, Upload, Instagram,
  Sparkles, Loader2, ImagePlus, Check, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  useApproveDraft, useRejectDraft, useMarkPublished, usePublishToInstagram,
  useGenerateFromIdea, useRejectIdea, useGenerateDraftImages, useSelectDraftImage,
  useUpdateScheduledFor,
  type MarketingDraft,
} from "@/hooks/useMarketingDrafts";
import { PostPreview } from "./PostPreview";

const PILAR_LABELS: Record<string, string> = {
  resultado_ia: "Resultado IA",
  educacao_pratica: "Educação",
  bastidores: "Bastidores",
  posicionamento: "Posicionamento",
  comercial: "Comercial",
};

const PILAR_COLORS: Record<string, { bg: string; text: string }> = {
  resultado_ia:     { bg: "oklch(0.39 0.10 160 / 0.18)", text: "oklch(0.72 0.14 160)" },
  educacao_pratica: { bg: "oklch(0.45 0.14 240 / 0.18)", text: "oklch(0.70 0.14 240)" },
  bastidores:       { bg: "oklch(0.42 0.16 262 / 0.18)", text: "oklch(0.72 0.16 262)" },
  posicionamento:   { bg: "oklch(0.50 0.16 38  / 0.18)", text: "oklch(0.80 0.14 38)" },
  comercial:        { bg: "oklch(0.42 0.18 15  / 0.18)", text: "oklch(0.72 0.16 15)" },
};

interface MarketingPostPanelProps {
  draft: MarketingDraft | null;
  onClose: () => void;
}

function ImageGenSection({ draft }: { draft: MarketingDraft }) {
  const [qty, setQty] = useState(2);
  const generateImages = useGenerateDraftImages();
  const selectImage = useSelectDraftImage();

  const images = draft.generated_images ?? [];
  const selected = draft.image_url;

  return (
    <div className="space-y-2 rounded-lg p-3" style={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(0.22 0.01 250)" }}>
      <div className="flex items-center gap-2">
        <ImagePlus className="h-3.5 w-3.5" style={{ color: "oklch(0.55 0.02 250)" }} />
        <span className="text-[11px] font-medium" style={{ color: "oklch(0.55 0.02 250)" }}>
          Imagem gerada por IA
        </span>
      </div>

      {images.length === 0 ? (
        <div className="flex items-center gap-2">
          <select
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="h-7 rounded-md px-2 text-[11px]"
            style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(0.26 0.01 250)", color: "oklch(0.75 0.02 250)" }}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n} opção{n > 1 ? "s" : ""}</option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={generateImages.isPending}
            onClick={() => generateImages.mutate({ id: draft.id, qty })}
            className="h-7 gap-1 text-[11px]"
            style={{ background: "oklch(0.22 0.01 250)", color: "oklch(0.75 0.02 250)", border: "1px solid oklch(0.28 0.01 250)" }}
          >
            {generateImages.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Gerar imagem
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => selectImage.mutate({ id: draft.id, image_url: selected === url ? null : url })}
                className="relative h-16 w-16 overflow-hidden rounded-md transition-all"
                style={{
                  border: selected === url ? "2px solid oklch(0.52 0.18 262)" : "2px solid oklch(0.26 0.01 250)",
                  opacity: selectImage.isPending ? 0.6 : 1,
                }}
              >
                <img src={url} alt={`opção ${i + 1}`} className="h-full w-full object-cover" />
                {selected === url && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "oklch(0.52 0.18 262 / 0.35)" }}>
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          {selected && (
            <button
              onClick={() => selectImage.mutate({ id: draft.id, image_url: null })}
              className="text-[10px] transition-colors"
              style={{ color: "oklch(0.48 0.02 250)" }}
            >
              Remover seleção
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleRow({ draft }: { draft: MarketingDraft }) {
  const updateScheduled = useUpdateScheduledFor();
  const [editing, setEditing] = useState(false);

  const formatted = draft.scheduled_for
    ? format(new Date(draft.scheduled_for), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : null;

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.52 0.02 250)" }} />
      {editing ? (
        <input
          type="datetime-local"
          defaultValue={draft.scheduled_for ? draft.scheduled_for.slice(0, 16) : ""}
          className="h-6 rounded px-1.5 text-[11px]"
          style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(0.28 0.01 250)", color: "oklch(0.80 0.02 250)" }}
          onBlur={(e) => {
            updateScheduled.mutate({ id: draft.id, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null });
            setEditing(false);
          }}
          autoFocus
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-[11px] hover:underline transition-colors"
          style={{ color: formatted ? "oklch(0.70 0.14 240)" : "oklch(0.48 0.02 250)" }}
        >
          {formatted ?? "Definir data de publicação"}
        </button>
      )}
    </div>
  );
}

export function MarketingPostPanel({ draft, onClose }: MarketingPostPanelProps) {
  const approve = useApproveDraft();
  const reject = useRejectDraft();
  const markPublished = useMarkPublished();
  const publishIG = usePublishToInstagram();
  const generate = useGenerateFromIdea();
  const rejectIdea = useRejectIdea();

  const [generating, setGenerating] = useState(false);

  if (!draft) return null;

  const color = PILAR_COLORS[draft.pilar] ?? PILAR_COLORS.educacao_pratica;
  const isIdea = draft.status === "idea_pending";
  const isGenerated = draft.status === "generated";
  const isApproved = draft.status === "approved";

  const handleGenerate = async () => {
    setGenerating(true);
    try { await generate.mutateAsync(draft.id); }
    finally { setGenerating(false); }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={draft.id}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex h-full flex-col overflow-hidden"
        style={{
          background: "oklch(0.145 0.01 250)",
          borderLeft: "1px solid oklch(0.22 0.01 250)",
        }}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid oklch(0.20 0.01 250)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center"
              style={{ background: color.bg }}
            >
              <div className="h-2 w-2 rounded-full" style={{ background: color.text }} />
            </div>
            <p className="truncate text-[12px] font-semibold text-foreground">{draft.title}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 shrink-0 rounded-md p-1 transition-colors hover:bg-white/5"
          >
            <X className="h-4 w-4" style={{ color: "oklch(0.52 0.02 250)" }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge
              className="text-[10px] px-2 py-0.5 border-0"
              style={{ background: color.bg, color: color.text }}
            >
              {PILAR_LABELS[draft.pilar]}
            </Badge>
            <Badge
              className="text-[10px] px-2 py-0.5 border-0 capitalize"
              style={{ background: "oklch(0.22 0.01 250)", color: "oklch(0.65 0.02 250)" }}
            >
              {draft.platform}
            </Badge>
            {draft.content_type && (
              <Badge
                className="text-[10px] px-2 py-0.5 border-0"
                style={{ background: "oklch(0.22 0.01 250)", color: "oklch(0.65 0.02 250)" }}
              >
                {draft.content_type.replace(/_/g, " ")}
              </Badge>
            )}
          </div>

          {/* Schedule row — only for non-idea posts */}
          {!isIdea && <ScheduleRow draft={draft} />}

          {/* Research snippets — only for ideas */}
          {isIdea && draft.research_snippets && draft.research_snippets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.48 0.02 250)" }}>
                Fontes de pesquisa
              </p>
              {draft.research_snippets.slice(0, 3).map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-[11px] underline-offset-2 hover:underline"
                  style={{ color: "oklch(0.60 0.14 240)" }}
                >
                  {s.title || s.source}
                </a>
              ))}
            </div>
          )}

          {/* Post preview */}
          {!isIdea && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.48 0.02 250)" }}>
                Preview
              </p>
              <PostPreview draft={draft} />
            </div>
          )}

          {/* Idea text preview */}
          {isIdea && draft.angle && (
            <div
              className="rounded-lg p-3"
              style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(0.24 0.01 250)" }}
            >
              <p className="text-[12px] leading-relaxed" style={{ color: "oklch(0.75 0.02 250)" }}>
                {draft.angle}
              </p>
            </div>
          )}

          {/* Image gen section */}
          {isGenerated && <ImageGenSection draft={draft} />}
        </div>

        {/* Actions footer */}
        <div
          className="shrink-0 space-y-2 px-4 py-3"
          style={{ borderTop: "1px solid oklch(0.20 0.01 250)" }}
        >
          {isIdea && (
            <>
              <Button
                className="w-full h-8 gap-1.5 text-[12px]"
                disabled={generating || generate.isPending}
                onClick={handleGenerate}
                style={{
                  background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
                  color: "white",
                  border: "none",
                }}
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Aprovar e gerar conteúdo
              </Button>
              <Button
                variant="ghost"
                className="w-full h-7 gap-1 text-[11px]"
                disabled={rejectIdea.isPending}
                onClick={() => rejectIdea.mutate(draft.id)}
                style={{ color: "oklch(0.55 0.02 250)" }}
              >
                <XCircle className="h-3.5 w-3.5" /> Rejeitar ideia
              </Button>
            </>
          )}

          {isGenerated && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 h-8 gap-1 text-[12px]"
                disabled={reject.isPending}
                onClick={() => reject.mutate(draft.id)}
                style={{ color: "oklch(0.55 0.02 250)" }}
              >
                <XCircle className="h-3.5 w-3.5" /> Rejeitar
              </Button>
              <Button
                className="flex-1 h-8 gap-1 text-[12px]"
                disabled={approve.isPending}
                onClick={() => approve.mutate(draft.id)}
                style={{
                  background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
                  color: "white",
                  border: "none",
                }}
              >
                <CheckCircle className="h-3.5 w-3.5" /> Aprovar post
              </Button>
            </div>
          )}

          {isApproved && (
            <div className="space-y-2">
              {draft.platform === "instagram" && (
                <Button
                  className="w-full h-8 gap-1.5 text-[12px]"
                  disabled={publishIG.isPending}
                  onClick={() => publishIG.mutate(draft.id)}
                  style={{
                    background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
                    color: "white",
                    border: "none",
                  }}
                >
                  {publishIG.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Instagram className="h-3.5 w-3.5" />}
                  Publicar no Instagram
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full h-8 gap-1.5 text-[12px]"
                disabled={markPublished.isPending}
                onClick={() => markPublished.mutate(draft.id)}
                style={{ color: "oklch(0.65 0.02 250)", borderColor: "oklch(0.26 0.01 250)" }}
              >
                <Upload className="h-3.5 w-3.5" /> Marcar como publicado
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/marketing/MarketingPostPanel.tsx
git commit -m "feat(marketing): add MarketingPostPanel slide-in detail panel"
```

---

## Task 4: Novos Cards para Grid e List — `MarketingDraftCard`

Adicionar `GridCard` e `ListCard` ao arquivo existente sem quebrar `IdeaCard` e `MarketingDraftCard` já exportados.

**Files:**
- Modify: `src/pages/marketing/MarketingDraftCard.tsx`

- [ ] **Step 1: Adicionar constantes de status**

No início de `MarketingDraftCard.tsx`, após as constantes `PILAR_COLORS` e `PLATFORM_ICONS` existentes, adicionar:

```typescript
const STATUS_LABELS: Record<string, string> = {
  idea_pending: "Ideia",
  generated: "Gerado",
  approved: "Aprovado",
  published: "Publicado",
  rejected: "Rejeitado",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  idea_pending: { bg: "oklch(0.48 0.16 60  / 0.18)", text: "oklch(0.78 0.14 60)"  },
  generated:    { bg: "oklch(0.45 0.14 240 / 0.18)", text: "oklch(0.70 0.14 240)" },
  approved:     { bg: "oklch(0.39 0.14 145 / 0.18)", text: "oklch(0.68 0.18 145)" },
  published:    { bg: "oklch(0.39 0.10 160 / 0.18)", text: "oklch(0.72 0.14 160)" },
  rejected:     { bg: "oklch(0.42 0.18 15  / 0.18)", text: "oklch(0.72 0.16 15)"  },
};

const PLATFORM_DISPLAY: Record<string, { label: string; color: string }> = {
  linkedin:  { label: "LinkedIn",  color: "oklch(0.60 0.16 240)" },
  instagram: { label: "Instagram", color: "oklch(0.68 0.18 330)" },
  whatsapp:  { label: "WhatsApp",  color: "oklch(0.68 0.18 145)" },
};
```

- [ ] **Step 2: Adicionar `GridCard` ao final do arquivo**

```typescript
// ─── Grid Card (para visualização em grade, estilo Metricool) ────────────────

interface CardProps {
  draft: MarketingDraft;
  isSelected?: boolean;
  onClick: () => void;
}

export function GridCard({ draft, isSelected, onClick }: CardProps) {
  const pilarColor = PILAR_COLORS[draft.pilar] ?? PILAR_COLORS.educacao_pratica;
  const statusColor = STATUS_COLORS[draft.status] ?? STATUS_COLORS.generated;
  const platform = PLATFORM_DISPLAY[draft.platform];

  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl overflow-hidden text-left transition-all"
      style={{
        background: "oklch(0.16 0.01 250)",
        border: isSelected
          ? "1.5px solid oklch(0.52 0.18 262)"
          : "1px solid oklch(0.22 0.01 250)",
        boxShadow: isSelected ? "0 0 0 3px oklch(0.52 0.18 262 / 0.15)" : "none",
      }}
    >
      {/* Image area or gradient placeholder */}
      <div
        className="relative h-28 w-full overflow-hidden"
        style={{
          background: draft.image_url
            ? undefined
            : `radial-gradient(ellipse at 70% 30%, ${pilarColor.bg} 0%, oklch(0.14 0.01 250) 70%)`,
        }}
      >
        {draft.image_url ? (
          <img src={draft.image_url} alt={draft.title} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-lg opacity-40" style={{ background: pilarColor.text }} />
          </div>
        )}

        {/* Platform chip */}
        <div
          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold"
          style={{ background: "oklch(0.10 0.01 250 / 0.85)", color: platform?.color ?? "oklch(0.75 0.02 250)", backdropFilter: "blur(8px)" }}
        >
          {platform?.label ?? draft.platform}
        </div>

        {/* Status chip */}
        <div
          className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold"
          style={{ background: statusColor.bg, color: statusColor.text }}
        >
          {STATUS_LABELS[draft.status]}
        </div>
      </div>

      {/* Text area */}
      <div className="p-3 space-y-1">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground group-hover:text-white transition-colors">
          {draft.title}
        </p>
        <p className="text-[10px]" style={{ color: "oklch(0.48 0.02 250)" }}>
          {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Adicionar `ListCard` ao final do arquivo**

```typescript
// ─── List Card (para visualização em lista, design melhorado) ────────────────

export function ListCard({ draft, isSelected, onClick }: CardProps) {
  const pilarColor = PILAR_COLORS[draft.pilar] ?? PILAR_COLORS.educacao_pratica;
  const statusColor = STATUS_COLORS[draft.status] ?? STATUS_COLORS.generated;
  const platform = PLATFORM_DISPLAY[draft.platform];

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl p-3 text-left transition-all"
      style={{
        background: isSelected ? "oklch(0.18 0.02 262)" : "oklch(0.16 0.01 250)",
        border: isSelected
          ? "1.5px solid oklch(0.52 0.18 262)"
          : "1px solid oklch(0.22 0.01 250)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Pilar color bar */}
        <div
          className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
          style={{ background: pilarColor.text }}
        />

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-1 text-[12px] font-semibold text-foreground group-hover:text-white transition-colors">
              {draft.title}
            </p>
            <div
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
              style={{ background: statusColor.bg, color: statusColor.text }}
            >
              {STATUS_LABELS[draft.status]}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium" style={{ color: platform?.color ?? "oklch(0.65 0.02 250)" }}>
              {platform?.label ?? draft.platform}
            </span>
            <span className="text-[10px]" style={{ color: "oklch(0.38 0.01 250)" }}>·</span>
            <span className="text-[10px]" style={{ color: "oklch(0.48 0.02 250)" }}>
              {PILAR_LABELS[draft.pilar]}
            </span>
            {draft.scheduled_for && (
              <>
                <span className="text-[10px]" style={{ color: "oklch(0.38 0.01 250)" }}>·</span>
                <span className="text-[10px]" style={{ color: "oklch(0.60 0.12 240)" }}>
                  {format(new Date(draft.scheduled_for), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Thumbnail */}
        {draft.image_url && (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <img src={draft.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Adicionar import de `format` e `PILAR_LABELS`**

No topo do arquivo `MarketingDraftCard.tsx`, verificar se `format` do `date-fns` está importado. Se não estiver, adicionar ao import existente do `date-fns`:

```typescript
import { formatDistanceToNow, format } from "date-fns";
```

Verificar também se `PILAR_LABELS` já está definido no arquivo — se não, adicionar junto com as outras constantes no início do arquivo.

- [ ] **Step 5: Commit**

```bash
git add src/pages/marketing/MarketingDraftCard.tsx
git commit -m "feat(marketing): add GridCard and ListCard components for new views"
```

---

## Task 5: Calendário de Agendamentos — `MarketingCalendar`

Grade mensal com posts plotados por `scheduled_for`. Posts sem data ficam na coluna lateral "Não agendado".

**Files:**
- Create: `src/pages/marketing/MarketingCalendar.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// src/pages/marketing/MarketingCalendar.tsx
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MarketingDraft } from "@/hooks/useMarketingDrafts";

const PILAR_COLORS: Record<string, string> = {
  resultado_ia:     "oklch(0.72 0.14 160)",
  educacao_pratica: "oklch(0.70 0.14 240)",
  bastidores:       "oklch(0.72 0.16 262)",
  posicionamento:   "oklch(0.80 0.14 38)",
  comercial:        "oklch(0.72 0.16 15)",
};

const PLATFORM_DISPLAY: Record<string, string> = {
  linkedin:  "LI",
  instagram: "IG",
  whatsapp:  "WA",
};

interface MarketingCalendarProps {
  drafts: MarketingDraft[];
  selectedId: string | null;
  onSelectDraft: (draft: MarketingDraft) => void;
}

interface DayChipProps {
  draft: MarketingDraft;
  isSelected: boolean;
  onClick: () => void;
}

function DayChip({ draft, isSelected, onClick }: DayChipProps) {
  const color = PILAR_COLORS[draft.pilar] ?? "oklch(0.65 0.02 250)";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-all hover:opacity-90"
      style={{
        background: isSelected ? `${color.replace(")", " / 0.25)")}` : `${color.replace(")", " / 0.12)")}`,
        border: isSelected ? `1px solid ${color}` : "1px solid transparent",
      }}
    >
      <span className="text-[8px] font-bold shrink-0" style={{ color: "oklch(0.60 0.02 250)" }}>
        {PLATFORM_DISPLAY[draft.platform]}
      </span>
      <span className="truncate text-[9px] font-medium" style={{ color }}>
        {draft.title}
      </span>
    </button>
  );
}

export function MarketingCalendar({ drafts, selectedId, onSelectDraft }: MarketingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const scheduledDrafts = useMemo(
    () => drafts.filter((d) => d.scheduled_for && d.status !== "rejected"),
    [drafts]
  );

  const unscheduled = useMemo(
    () => drafts.filter((d) => !d.scheduled_for && d.status !== "rejected" && d.status !== "published"),
    [drafts]
  );

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDayDrafts = (day: Date) =>
    scheduledDrafts.filter((d) => d.scheduled_for && isSameDay(new Date(d.scheduled_for), day));

  const today = new Date();
  const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex gap-4 h-full">
      {/* Calendar grid */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-md p-1.5 transition-colors hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: "oklch(0.55 0.02 250)" }} />
          </button>
          <span className="text-[13px] font-semibold text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-md p-1.5 transition-colors hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" style={{ color: "oklch(0.55 0.02 250)" }} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium" style={{ color: "oklch(0.48 0.02 250)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px" style={{ background: "oklch(0.20 0.01 250)" }}>
          {calendarDays.map((day) => {
            const dayDrafts = getDayDrafts(day);
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={day.toISOString()}
                className="min-h-[80px] p-1.5 space-y-1"
                style={{
                  background: isToday ? "oklch(0.18 0.02 262)" : "oklch(0.145 0.01 250)",
                  opacity: isCurrentMonth ? 1 : 0.4,
                }}
              >
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium"
                  style={{
                    background: isToday ? "oklch(0.52 0.18 262)" : "transparent",
                    color: isToday ? "white" : isCurrentMonth ? "oklch(0.75 0.02 250)" : "oklch(0.48 0.02 250)",
                  }}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayDrafts.slice(0, 3).map((draft) => (
                    <DayChip
                      key={draft.id}
                      draft={draft}
                      isSelected={selectedId === draft.id}
                      onClick={() => onSelectDraft(draft)}
                    />
                  ))}
                  {dayDrafts.length > 3 && (
                    <p className="text-[8px] pl-1" style={{ color: "oklch(0.48 0.02 250)" }}>
                      +{dayDrafts.length - 3} mais
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled sidebar */}
      {unscheduled.length > 0 && (
        <div className="w-44 shrink-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.48 0.02 250)" }}>
            Não agendado ({unscheduled.length})
          </p>
          <div className="space-y-1.5">
            {unscheduled.map((draft) => {
              const color = PILAR_COLORS[draft.pilar] ?? "oklch(0.65 0.02 250)";
              return (
                <button
                  key={draft.id}
                  onClick={() => onSelectDraft(draft)}
                  className="w-full rounded-lg p-2 text-left transition-all"
                  style={{
                    background: selectedId === draft.id ? "oklch(0.18 0.02 262)" : "oklch(0.16 0.01 250)",
                    border: selectedId === draft.id ? "1px solid oklch(0.52 0.18 262)" : "1px solid oklch(0.22 0.01 250)",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    <p className="line-clamp-2 text-[10px] font-medium" style={{ color: "oklch(0.70 0.02 250)" }}>
                      {draft.title}
                    </p>
                  </div>
                  <p className="mt-1 text-[9px]" style={{ color: "oklch(0.48 0.02 250)" }}>
                    {PLATFORM_DISPLAY[draft.platform]} · {draft.status === "idea_pending" ? "Ideia" : draft.status === "generated" ? "Gerado" : "Aprovado"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/marketing/MarketingCalendar.tsx
git commit -m "feat(marketing): add MarketingCalendar monthly grid component"
```

---

## Task 6: `MarketingGridView` e `MarketingListView`

**Files:**
- Create: `src/pages/marketing/MarketingGridView.tsx`
- Create: `src/pages/marketing/MarketingListView.tsx`

- [ ] **Step 1: Criar `MarketingGridView`**

```typescript
// src/pages/marketing/MarketingGridView.tsx
import { Loader2 } from "lucide-react";
import type { MarketingDraft } from "@/hooks/useMarketingDrafts";
import { GridCard } from "./MarketingDraftCard";

interface MarketingGridViewProps {
  drafts: MarketingDraft[];
  isLoading: boolean;
  selectedId: string | null;
  onSelectDraft: (draft: MarketingDraft) => void;
}

export function MarketingGridView({ drafts, isLoading, selectedId, onSelectDraft }: MarketingGridViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "oklch(0.55 0.02 250)" }} />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <p className="py-16 text-center text-[13px]" style={{ color: "oklch(0.48 0.02 250)" }}>
        Nenhum post encontrado.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {drafts.map((draft) => (
        <GridCard
          key={draft.id}
          draft={draft}
          isSelected={selectedId === draft.id}
          onClick={() => onSelectDraft(draft)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Criar `MarketingListView`**

```typescript
// src/pages/marketing/MarketingListView.tsx
import { Loader2 } from "lucide-react";
import type { MarketingDraft, MarketingStatus } from "@/hooks/useMarketingDrafts";
import { ListCard } from "./MarketingDraftCard";

interface MarketingListViewProps {
  drafts: MarketingDraft[];
  isLoading: boolean;
  selectedId: string | null;
  statusFilter: MarketingStatus | "all";
  onSelectDraft: (draft: MarketingDraft) => void;
}

export function MarketingListView({ drafts, isLoading, selectedId, statusFilter, onSelectDraft }: MarketingListViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "oklch(0.55 0.02 250)" }} />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <p className="py-16 text-center text-[13px]" style={{ color: "oklch(0.48 0.02 250)" }}>
        Nenhum post encontrado.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {drafts.map((draft) => (
        <ListCard
          key={draft.id}
          draft={draft}
          isSelected={selectedId === draft.id}
          onClick={() => onSelectDraft(draft)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/marketing/MarketingGridView.tsx src/pages/marketing/MarketingListView.tsx
git commit -m "feat(marketing): add MarketingGridView and MarketingListView components"
```

---

## Task 7: Redesign do `MarketingPage` — Layout 3 Colunas

Este é o passo central. Reescreve o `MarketingPage` com:
- Sidebar esquerda: filtros de status, plataforma e pilar
- Área central: toggle Calendar / Grid / List
- Painel direito: `MarketingPostPanel` (aparece quando um post é selecionado)

**Files:**
- Modify: `src/pages/marketing/MarketingPage.tsx` (rewrite completo)

- [ ] **Step 1: Rewrite do MarketingPage**

```typescript
// src/pages/marketing/MarketingPage.tsx
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Calendar, LayoutGrid, List,
  Linkedin, Instagram,
} from "lucide-react";
import {
  useMarketingDrafts,
  useMarketingDraftCounts,
  type MarketingStatus,
  type MarketingPlatform,
  type MarketingPilar,
  type MarketingDraft,
} from "@/hooks/useMarketingDrafts";
import { MarketingProposeDialog } from "./MarketingProposeDialog";
import { MarketingPostPanel } from "./MarketingPostPanel";
import { MarketingCalendar } from "./MarketingCalendar";
import { MarketingGridView } from "./MarketingGridView";
import { MarketingListView } from "./MarketingListView";

type ViewMode = "calendar" | "grid" | "list";

const STATUS_OPTIONS: { value: MarketingStatus | "all"; label: string }[] = [
  { value: "all",          label: "Todos"      },
  { value: "idea_pending", label: "Ideias"     },
  { value: "generated",    label: "Gerados"    },
  { value: "approved",     label: "Aprovados"  },
  { value: "published",    label: "Publicados" },
  { value: "rejected",     label: "Rejeitados" },
];

const PILAR_OPTIONS: { value: MarketingPilar | "all"; label: string }[] = [
  { value: "all",               label: "Todos os pilares"  },
  { value: "resultado_ia",      label: "Resultado IA"      },
  { value: "educacao_pratica",  label: "Educação"          },
  { value: "bastidores",        label: "Bastidores"        },
  { value: "posicionamento",    label: "Posicionamento"    },
  { value: "comercial",         label: "Comercial"         },
];

const STATUS_DOT_COLORS: Record<string, string> = {
  all:          "oklch(0.55 0.02 250)",
  idea_pending: "oklch(0.78 0.14 60)",
  generated:    "oklch(0.70 0.14 240)",
  approved:     "oklch(0.68 0.18 145)",
  published:    "oklch(0.72 0.14 160)",
  rejected:     "oklch(0.72 0.16 15)",
};

export default function MarketingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<MarketingStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<MarketingPlatform | "all">("all");
  const [pilarFilter, setPilarFilter] = useState<MarketingPilar | "all">("all");
  const [selectedDraft, setSelectedDraft] = useState<MarketingDraft | null>(null);
  const [showPropose, setShowPropose] = useState(false);

  // Fetch all drafts (no status filter — we filter client-side for calendar/grid)
  const { data: allDrafts = [], isLoading } = useMarketingDrafts();
  const { data: counts } = useMarketingDraftCounts();

  const filteredDrafts = useMemo(() => {
    return allDrafts.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (platformFilter !== "all" && d.platform !== platformFilter) return false;
      if (pilarFilter !== "all" && d.pilar !== pilarFilter) return false;
      return true;
    });
  }, [allDrafts, statusFilter, platformFilter, pilarFilter]);

  const handleSelectDraft = (draft: MarketingDraft) => {
    setSelectedDraft((prev) => (prev?.id === draft.id ? null : draft));
  };

  // Sync selected draft with fresh data
  const syncedSelectedDraft = selectedDraft
    ? (allDrafts.find((d) => d.id === selectedDraft.id) ?? null)
    : null;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex w-52 shrink-0 flex-col gap-5 overflow-y-auto p-4"
        style={{ borderRight: "1px solid oklch(0.20 0.01 250)" }}
      >
        {/* Page title + action */}
        <div className="space-y-2">
          <h1 className="text-[14px] font-bold tracking-tight text-foreground">Marketing</h1>
          <Button
            size="sm"
            onClick={() => setShowPropose(true)}
            className="w-full h-8 gap-1.5 text-[11px] justify-start"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
              color: "white",
              border: "none",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Propor tema
          </Button>
        </div>

        {/* View mode toggle */}
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.01 250)" }}>
            Visualização
          </p>
          {(
            [
              { mode: "calendar" as ViewMode, icon: Calendar,    label: "Calendário" },
              { mode: "grid"     as ViewMode, icon: LayoutGrid,  label: "Grade"      },
              { mode: "list"     as ViewMode, icon: List,        label: "Lista"      },
            ] as const
          ).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-all"
              style={{
                background: viewMode === mode ? "oklch(0.22 0.02 262)" : "transparent",
                color: viewMode === mode ? "oklch(0.72 0.16 262)" : "oklch(0.55 0.02 250)",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.01 250)" }}>
            Status
          </p>
          {STATUS_OPTIONS.map((opt) => {
            const count = opt.value === "all"
              ? allDrafts.length
              : (counts?.[opt.value as MarketingStatus] ?? 0);
            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all"
                style={{
                  background: statusFilter === opt.value ? "oklch(0.20 0.01 250)" : "transparent",
                  color: statusFilter === opt.value ? "oklch(0.80 0.02 250)" : "oklch(0.52 0.02 250)",
                }}
              >
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: STATUS_DOT_COLORS[opt.value] }}
                />
                <span className="flex-1 text-left">{opt.label}</span>
                {count > 0 && (
                  <span className="text-[9px]" style={{ color: "oklch(0.45 0.02 250)" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Platform filter */}
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.01 250)" }}>
            Plataforma
          </p>
          {(
            [
              { value: "all" as const,       label: "Todas",     icon: null      },
              { value: "linkedin" as const,   label: "LinkedIn",  icon: Linkedin  },
              { value: "instagram" as const,  label: "Instagram", icon: Instagram },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setPlatformFilter(value)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all"
              style={{
                background: platformFilter === value ? "oklch(0.20 0.01 250)" : "transparent",
                color: platformFilter === value ? "oklch(0.80 0.02 250)" : "oklch(0.52 0.02 250)",
              }}
            >
              {Icon ? <Icon className="h-3 w-3" /> : <div className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>

        {/* Pilar filter */}
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.01 250)" }}>
            Pilar
          </p>
          {PILAR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPilarFilter(opt.value)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all text-left"
              style={{
                background: pilarFilter === opt.value ? "oklch(0.20 0.01 250)" : "transparent",
                color: pilarFilter === opt.value ? "oklch(0.80 0.02 250)" : "oklch(0.52 0.02 250)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid oklch(0.20 0.01 250)" }}
        >
          <p className="text-[12px] font-medium text-foreground">
            {filteredDrafts.length} post{filteredDrafts.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* View content */}
        <div className="flex-1 overflow-y-auto p-5">
          {viewMode === "calendar" ? (
            <MarketingCalendar
              drafts={filteredDrafts}
              selectedId={syncedSelectedDraft?.id ?? null}
              onSelectDraft={handleSelectDraft}
            />
          ) : viewMode === "grid" ? (
            <MarketingGridView
              drafts={filteredDrafts}
              isLoading={isLoading}
              selectedId={syncedSelectedDraft?.id ?? null}
              onSelectDraft={handleSelectDraft}
            />
          ) : (
            <MarketingListView
              drafts={filteredDrafts}
              isLoading={isLoading}
              selectedId={syncedSelectedDraft?.id ?? null}
              statusFilter={statusFilter}
              onSelectDraft={handleSelectDraft}
            />
          )}
        </div>
      </main>

      {/* ── Right Detail Panel ────────────────────────────────────── */}
      {syncedSelectedDraft && (
        <aside className="w-80 shrink-0 xl:w-96 overflow-hidden">
          <MarketingPostPanel
            draft={syncedSelectedDraft}
            onClose={() => setSelectedDraft(null)}
          />
        </aside>
      )}

      {/* Propose Dialog */}
      <MarketingProposeDialog open={showPropose} onClose={() => setShowPropose(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar que `useMarketingDrafts()` sem argumento retorna todos os posts**

Confirmar no hook (linha ~41) que a chamada sem `status` não aplica filtro. Já está correto: `if (status) q = q.eq("status", status)` — nenhuma mudança necessária.

- [ ] **Step 3: Commit**

```bash
git add src/pages/marketing/MarketingPage.tsx
git commit -m "feat(marketing): redesign MarketingPage with 3-column Metricool-inspired layout"
```

---

## Task 8: Garantir scroll e altura corretos no layout raiz

O novo layout precisa de `h-full` na hierarquia para funcionar. Verificar como a rota `/marketing` está montada no `App.tsx`.

**Files:**
- Verify/Modify: `src/App.tsx` (ou arquivo de layout do dashboard)

- [ ] **Step 1: Verificar wrapper de layout**

Abrir `src/App.tsx` e localizar o componente de dashboard layout (sidebar + main area). O `<main>` que envolve as páginas precisa de `flex-1 overflow-hidden` ou `h-screen`. Confirmar que a rota do Marketing não está envolvia em um container com `max-w-*` fixo — se estiver, remover esse constraint para a rota de marketing ou usar um layout separado.

Se o layout usa um padrão como:
```tsx
<main className="flex-1 overflow-auto">
  <Outlet />
</main>
```

Alterar para:
```tsx
<main className="flex-1 overflow-hidden">
  <Outlet />
</main>
```

Isso garante que `MarketingPage` com `h-full` funcione corretamente.

- [ ] **Step 2: Commit (se houver mudanças)**

```bash
git add src/App.tsx  # ou o arquivo de layout
git commit -m "fix(layout): allow full-height overflow-hidden for marketing page"
```

---

## Task 9: Smoke Test Visual

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

Acessar `http://localhost:5173` (ou a porta que aparecer no terminal).

- [ ] **Step 2: Verificar layout geral**

- [ ] Sidebar esquerda visível com filtros de Status, Plataforma e Pilar
- [ ] Toggle de visualização (Calendário / Grade / Lista) na sidebar
- [ ] Botão "Propor tema" abre o modal Dialog (não inline)
- [ ] Área central exibe posts na visualização Lista por padrão

- [ ] **Step 3: Verificar visualização em Lista**

- [ ] Cards `ListCard` exibem: barra de pilar colorida, título, plataforma, pilar, data agendada (se houver)
- [ ] Clicar em um card → painel direito abre com `MarketingPostPanel`
- [ ] Clicar no mesmo card → painel fecha (toggle)
- [ ] Painel exibe: badges de meta, `ScheduleRow`, preview do post, ações

- [ ] **Step 4: Verificar visualização em Grade**

- [ ] `GridCard` em grid de 2-3 colunas
- [ ] Cards com área de imagem (gradient se sem imagem, foto se tiver `image_url`)
- [ ] Chip de plataforma e status sobrepostos na imagem
- [ ] Clicar abre painel direito

- [ ] **Step 5: Verificar Calendário**

- [ ] Grade mensal com navegação mês anterior/próximo
- [ ] Posts com `scheduled_for` aparecem como chips coloridos no dia correto
- [ ] Posts sem `scheduled_for` aparecem na sidebar lateral "Não agendado"
- [ ] Clicar em um chip de post → painel direito abre

- [ ] **Step 6: Verificar filtros**

- [ ] Filtrar por status "Ideias" → apenas `idea_pending` visíveis
- [ ] Filtrar por plataforma "LinkedIn" → apenas posts do LinkedIn
- [ ] Filtrar por pilar "Comercial" → apenas posts comerciais
- [ ] Contagem na sidebar atualiza ao aplicar filtros

- [ ] **Step 7: Verificar ações no painel**

- [ ] Para `idea_pending`: botão "Aprovar e gerar conteúdo" + "Rejeitar ideia"
- [ ] Para `generated`: botões "Rejeitar" e "Aprovar post"
- [ ] Para `approved` com platform=instagram: botão "Publicar no Instagram"
- [ ] `ScheduleRow`: clicar abre datetime-local, blur salva a data

- [ ] **Step 8: Commit de documentação**

```bash
git add .
git commit -m "docs(marketing): smoke test complete — Metricool-inspired redesign live"
```

---

## Self-Review

### Cobertura de spec
| Requisito | Tarefa |
|-----------|--------|
| Calendário de agendamento | Task 5 (MarketingCalendar) |
| Preview de posts na UI | Task 3 (MarketingPostPanel) |
| Visualização em grade (estilo Metricool) | Task 4, 6 (GridCard, GridView) |
| Visualização em lista melhorada | Task 4, 6 (ListCard, ListView) |
| Filtros por plataforma, status, pilar | Task 7 (MarketingPage sidebar) |
| Agendamento de data (scheduled_for) | Tasks 1, 3 (ScheduleRow) |
| Ações de aprovação mantidas | Task 3 (MarketingPostPanel actions) |
| Modal propor tema | Task 2 (ProposeDialog) |
| Layout 3 colunas | Task 7 |
| Scroll e altura corretos | Task 8 |

### Verificações de tipo
- `MarketingDraft` tem `scheduled_for: string | null` adicionado em Task 1
- `GridCard`, `ListCard` recebem `{ draft, isSelected, onClick }` — `CardProps` definida em Task 4
- `MarketingCalendar` recebe `{ drafts, selectedId, onSelectDraft }` — consistente em Tasks 5 e 7
- `MarketingPostPanel` recebe `{ draft: MarketingDraft | null, onClose }` — consistente em Tasks 3 e 7
- `useUpdateScheduledFor` exportado em Task 1, importado em Task 3 ✓
- `PILAR_LABELS` definido tanto em `MarketingDraftCard.tsx` (original) quanto em `MarketingPostPanel.tsx` (local) — sem conflito

### Placeholders
Nenhum "TBD" ou "TODO" encontrado no plano.

---

## Task 10: Configuração de Estratégia — `MarketingStrategyConfig.ts`

Arquivo de constantes com as metas editoriais da IntelliX: frequência por plataforma, melhor horário e distribuição alvo por pilar.

**Files:**
- Create: `src/pages/marketing/MarketingStrategyConfig.ts`

- [ ] **Step 1: Criar o arquivo de configuração**

```typescript
// src/pages/marketing/MarketingStrategyConfig.ts

export interface PlatformTarget {
  platform: "linkedin" | "instagram";
  label: string;
  weeklyTarget: number;
  color: string;
}

export interface BestTime {
  platform: "linkedin" | "instagram";
  dayOfWeek: number; // 0=Dom, 1=Seg, ..., 6=Sáb
  hour: number;
  minute: number;
}

export interface PilarMixTarget {
  pilar: string;
  label: string;
  targetPercent: number;
  color: string;
}

// Meta de frequência semanal por plataforma
export const PLATFORM_TARGETS: PlatformTarget[] = [
  {
    platform: "linkedin",
    label: "LinkedIn",
    weeklyTarget: 3,
    color: "oklch(0.60 0.16 240)",
  },
  {
    platform: "instagram",
    label: "Instagram",
    weeklyTarget: 5,
    color: "oklch(0.68 0.18 330)",
  },
];

// Melhores horários para postar por plataforma (baseado em benchmarks de mercado B2B SaaS)
export const BEST_TIMES: BestTime[] = [
  { platform: "linkedin",  dayOfWeek: 2, hour: 9,  minute: 0  }, // Terça 9h
  { platform: "linkedin",  dayOfWeek: 3, hour: 12, minute: 0  }, // Quarta 12h
  { platform: "linkedin",  dayOfWeek: 4, hour: 10, minute: 0  }, // Quinta 10h
  { platform: "instagram", dayOfWeek: 1, hour: 11, minute: 0  }, // Seg 11h
  { platform: "instagram", dayOfWeek: 3, hour: 15, minute: 0  }, // Qua 15h
  { platform: "instagram", dayOfWeek: 5, hour: 18, minute: 0  }, // Sex 18h
  { platform: "instagram", dayOfWeek: 6, hour: 10, minute: 0  }, // Sáb 10h
  { platform: "instagram", dayOfWeek: 0, hour: 12, minute: 0  }, // Dom 12h
];

// Distribuição alvo de conteúdo por pilar (deve somar 100)
export const PILAR_MIX_TARGETS: PilarMixTarget[] = [
  { pilar: "educacao_pratica", label: "Educação",       targetPercent: 30, color: "oklch(0.70 0.14 240)" },
  { pilar: "resultado_ia",     label: "Resultado IA",   targetPercent: 25, color: "oklch(0.72 0.14 160)" },
  { pilar: "bastidores",       label: "Bastidores",     targetPercent: 20, color: "oklch(0.72 0.16 262)" },
  { pilar: "posicionamento",   label: "Posicionamento", targetPercent: 15, color: "oklch(0.80 0.14 38)"  },
  { pilar: "comercial",        label: "Comercial",      targetPercent: 10, color: "oklch(0.72 0.16 15)"  },
];

// Retorna os melhores horários de uma plataforma, ordenados por dia da semana
export function getBestTimesForPlatform(platform: "linkedin" | "instagram"): BestTime[] {
  return BEST_TIMES.filter((t) => t.platform === platform).sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour
  );
}

// Formata um BestTime em string legível: "Ter 9h", "Sex 18h"
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function formatBestTime(bt: BestTime): string {
  const min = bt.minute > 0 ? `:${String(bt.minute).padStart(2, "0")}` : "";
  return `${DAY_LABELS[bt.dayOfWeek]} ${bt.hour}${min}h`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/marketing/MarketingStrategyConfig.ts
git commit -m "feat(marketing): add MarketingStrategyConfig with frequency targets, best times and pilar mix"
```

---

## Task 11: Dashboard de Estratégia — `MarketingStrategyBanner`

Componente que aparece na toolbar da área central. Mostra em tempo real: progresso de frequência semanal por plataforma (atual vs meta) e distribuição real de conteúdo por pilar vs meta.

**Files:**
- Create: `src/pages/marketing/MarketingStrategyBanner.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// src/pages/marketing/MarketingStrategyBanner.tsx
import { useMemo } from "react";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import type { MarketingDraft } from "@/hooks/useMarketingDrafts";
import { PLATFORM_TARGETS, PILAR_MIX_TARGETS } from "./MarketingStrategyConfig";

interface MarketingStrategyBannerProps {
  drafts: MarketingDraft[];
}

function FrequencyBar({ drafts }: { drafts: MarketingDraft[] }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const counts = useMemo(() => {
    const published = drafts.filter((d) => {
      if (d.status !== "published" && d.status !== "approved") return false;
      const date = d.published_at ?? d.scheduled_for ?? d.approved_at;
      if (!date) return false;
      try {
        return isWithinInterval(parseISO(date), { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });
    return {
      linkedin: published.filter((d) => d.platform === "linkedin").length,
      instagram: published.filter((d) => d.platform === "instagram").length,
    };
  }, [drafts, weekStart, weekEnd]);

  return (
    <div className="flex items-center gap-4">
      <span
        className="text-[9px] font-semibold uppercase tracking-wider shrink-0"
        style={{ color: "oklch(0.42 0.01 250)" }}
      >
        Esta semana
      </span>
      {PLATFORM_TARGETS.map((pt) => {
        const current = counts[pt.platform];
        const pct = Math.min((current / pt.weeklyTarget) * 100, 100);
        const done = current >= pt.weeklyTarget;
        return (
          <div key={pt.platform} className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium shrink-0" style={{ color: pt.color }}>
              {pt.label}
            </span>
            <div
              className="h-1.5 w-16 overflow-hidden rounded-full"
              style={{ background: "oklch(0.22 0.01 250)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: done ? "oklch(0.68 0.18 145)" : pt.color,
                }}
              />
            </div>
            <span
              className="text-[10px] tabular-nums"
              style={{ color: done ? "oklch(0.68 0.18 145)" : "oklch(0.55 0.02 250)" }}
            >
              {current}/{pt.weeklyTarget}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ContentMixBar({ drafts }: { drafts: MarketingDraft[] }) {
  const activeDrafts = useMemo(
    () => drafts.filter((d) => d.status !== "rejected"),
    [drafts]
  );

  const total = activeDrafts.length;

  const pilarCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeDrafts.forEach((d) => {
      counts[d.pilar] = (counts[d.pilar] ?? 0) + 1;
    });
    return counts;
  }, [activeDrafts]);

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[9px] font-semibold uppercase tracking-wider shrink-0"
        style={{ color: "oklch(0.42 0.01 250)" }}
      >
        Mix
      </span>
      {/* Stacked bar */}
      <div className="flex h-1.5 w-24 overflow-hidden rounded-full" style={{ background: "oklch(0.22 0.01 250)" }}>
        {PILAR_MIX_TARGETS.map((pt) => {
          const count = pilarCounts[pt.pilar] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={pt.pilar}
              style={{ width: `${pct}%`, background: pt.color }}
              title={`${pt.label}: ${Math.round(pct)}% (meta: ${pt.targetPercent}%)`}
            />
          );
        })}
      </div>
      {/* Legend dots */}
      <div className="flex items-center gap-2">
        {PILAR_MIX_TARGETS.map((pt) => {
          const count = pilarCounts[pt.pilar] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          if (count === 0) return null;
          const onTarget = Math.abs(pct - pt.targetPercent) <= 5;
          return (
            <div key={pt.pilar} className="flex items-center gap-1" title={`Meta: ${pt.targetPercent}%`}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: pt.color }} />
              <span
                className="text-[9px] tabular-nums"
                style={{ color: onTarget ? "oklch(0.68 0.18 145)" : "oklch(0.52 0.02 250)" }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MarketingStrategyBanner({ drafts }: MarketingStrategyBannerProps) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <FrequencyBar drafts={drafts} />
      <div className="h-3 w-px shrink-0" style={{ background: "oklch(0.24 0.01 250)" }} />
      <ContentMixBar drafts={drafts} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/marketing/MarketingStrategyBanner.tsx
git commit -m "feat(marketing): add MarketingStrategyBanner with frequency progress and content mix"
```

---

## Task 12: Integrar Estratégia no `MarketingPage` e Best Time no `MarketingPostPanel`

Duas integrações finais:
1. `MarketingStrategyBanner` na toolbar da área central (MarketingPage)
2. Sugestão de "Melhor horário" no `ScheduleRow` do `MarketingPostPanel`

**Files:**
- Modify: `src/pages/marketing/MarketingPage.tsx`
- Modify: `src/pages/marketing/MarketingPostPanel.tsx`

- [ ] **Step 1: Adicionar `MarketingStrategyBanner` na toolbar do `MarketingPage`**

Em `MarketingPage.tsx`, localizar a seção `{/* Toolbar */}` e substituir por:

```tsx
{/* Toolbar */}
<div
  className="flex flex-wrap items-center gap-4 px-5 py-2.5 shrink-0"
  style={{ borderBottom: "1px solid oklch(0.20 0.01 250)" }}
>
  <p className="text-[11px] font-medium shrink-0" style={{ color: "oklch(0.52 0.02 250)" }}>
    {filteredDrafts.length} post{filteredDrafts.length !== 1 ? "s" : ""}
  </p>
  <div className="h-3 w-px shrink-0" style={{ background: "oklch(0.24 0.01 250)" }} />
  <MarketingStrategyBanner drafts={allDrafts} />
</div>
```

Adicionar o import no topo do arquivo `MarketingPage.tsx`:
```typescript
import { MarketingStrategyBanner } from "./MarketingStrategyBanner";
```

- [ ] **Step 2: Adicionar sugestão de melhor horário no `ScheduleRow` do `MarketingPostPanel`**

Em `MarketingPostPanel.tsx`, substituir a função `ScheduleRow` por:

```typescript
import { getBestTimesForPlatform, formatBestTime } from "./MarketingStrategyConfig";

function ScheduleRow({ draft }: { draft: MarketingDraft }) {
  const updateScheduled = useUpdateScheduledFor();
  const [editing, setEditing] = useState(false);

  const formatted = draft.scheduled_for
    ? format(new Date(draft.scheduled_for), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : null;

  const bestTimes = getBestTimesForPlatform(draft.platform as "linkedin" | "instagram");
  const nextBestTime = bestTimes[0] ?? null;

  const applyBestTime = () => {
    if (!nextBestTime) return;
    const now = new Date();
    const target = new Date();
    // Find next occurrence of this day+hour
    const dayDiff = (nextBestTime.dayOfWeek - now.getDay() + 7) % 7;
    target.setDate(now.getDate() + (dayDiff === 0 ? 7 : dayDiff));
    target.setHours(nextBestTime.hour, nextBestTime.minute, 0, 0);
    updateScheduled.mutate({ id: draft.id, scheduled_for: target.toISOString() });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.52 0.02 250)" }} />
        {editing ? (
          <input
            type="datetime-local"
            defaultValue={draft.scheduled_for ? draft.scheduled_for.slice(0, 16) : ""}
            className="h-6 rounded px-1.5 text-[11px]"
            style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(0.28 0.01 250)", color: "oklch(0.80 0.02 250)" }}
            onBlur={(e) => {
              updateScheduled.mutate({ id: draft.id, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null });
              setEditing(false);
            }}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] hover:underline transition-colors"
            style={{ color: formatted ? "oklch(0.70 0.14 240)" : "oklch(0.48 0.02 250)" }}
          >
            {formatted ?? "Definir data de publicação"}
          </button>
        )}
      </div>
      {/* Best time suggestion */}
      {!formatted && nextBestTime && (draft.platform === "linkedin" || draft.platform === "instagram") && (
        <button
          onClick={applyBestTime}
          disabled={updateScheduled.isPending}
          className="flex items-center gap-1 text-[10px] transition-colors hover:underline"
          style={{ color: "oklch(0.60 0.12 240)", marginLeft: "22px" }}
        >
          ✦ Melhor horário: {formatBestTime(nextBestTime)}
        </button>
      )}
    </div>
  );
}
```

Adicionar o import de `getBestTimesForPlatform` e `formatBestTime` no topo de `MarketingPostPanel.tsx`:
```typescript
import { getBestTimesForPlatform, formatBestTime } from "./MarketingStrategyConfig";
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/marketing/MarketingPage.tsx src/pages/marketing/MarketingPostPanel.tsx
git commit -m "feat(marketing): integrate strategy banner and best-time suggestions"
```

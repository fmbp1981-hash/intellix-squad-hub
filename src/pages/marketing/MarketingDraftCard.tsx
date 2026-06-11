import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, XCircle, Upload, Sparkles, Loader2,
  Lightbulb, ChevronDown, ChevronUp, Instagram,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useApproveDraft,
  useRejectDraft,
  useMarkPublished,
  usePublishToInstagram,
  useGenerateFromIdea,
  useRejectIdea,
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
  resultado_ia:    { bg: "oklch(0.39 0.10 160 / 0.18)", text: "oklch(0.72 0.14 160)" },
  educacao_pratica:{ bg: "oklch(0.45 0.14 240 / 0.18)", text: "oklch(0.70 0.14 240)" },
  bastidores:      { bg: "oklch(0.42 0.16 262 / 0.18)", text: "oklch(0.72 0.16 262)" },
  posicionamento:  { bg: "oklch(0.50 0.16 38  / 0.18)", text: "oklch(0.80 0.14 38 )" },
  comercial:       { bg: "oklch(0.42 0.18 15  / 0.18)", text: "oklch(0.72 0.16 15 )" },
};

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: "in",
  instagram: "ig",
  whatsapp: "wa",
};

interface Props { draft: MarketingDraft }

// ─── Idea card (idea_pending) ─────────────────────────────────────────────────

export function IdeaCard({ draft }: Props) {
  const [generating, setGenerating] = useState(false);
  const generate = useGenerateFromIdea();
  const reject = useRejectIdea();
  const color = PILAR_COLORS[draft.pilar] ?? PILAR_COLORS.educacao_pratica;
  const isLoading = generating || generate.isPending || reject.isPending;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generate.mutateAsync(draft.id);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3 transition-all"
      style={{
        background: "oklch(0.16 0.01 250)",
        border: "1px solid oklch(0.24 0.01 250)",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: color.bg }}
        >
          <Lightbulb className="h-3.5 w-3.5" style={{ color: color.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{draft.title}</p>
          <p className="mt-0.5 text-[12px] leading-snug" style={{ color: "oklch(0.60 0.02 250)" }}>
            {draft.angle}
          </p>
        </div>
      </div>

      {/* Badges + time */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
          style={{ background: color.bg, color: color.text }}
        >
          {PILAR_LABELS[draft.pilar]}
        </span>
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{ background: "oklch(0.22 0.01 250)", color: "oklch(0.60 0.02 250)" }}
        >
          {PLATFORM_ICONS[draft.platform]} · {draft.platform}
        </span>
        <span className="ml-auto text-[10px]" style={{ color: "oklch(0.48 0.02 250)" }}>
          {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>

      {/* Research snippets */}
      {draft.research_snippets && draft.research_snippets.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "oklch(0.48 0.02 250)" }}>
            Fontes de pesquisa
          </p>
          {draft.research_snippets.map((s, i) => (
            <p key={i} className="text-[11px] truncate" style={{ color: "oklch(0.58 0.02 250)" }}>
              · {s.title}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={isLoading}
          onClick={() => reject.mutate(draft.id)}
          className="h-8 text-[12px] px-3"
          style={{ color: "oklch(0.55 0.04 15)" }}
        >
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          Rejeitar
        </Button>
        <Button
          size="sm"
          disabled={isLoading}
          onClick={handleGenerate}
          className="ml-auto h-8 text-[12px] gap-1.5"
          style={{
            background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
            color: "white",
            border: "none",
          }}
        >
          {generating ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando (~30s)</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" /> Aprovar e gerar conteúdo</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Draft card (generated / approved / published) ───────────────────────────

export function MarketingDraftCard({ draft }: Props) {
  const [expanded, setExpanded] = useState(false);
  const approve = useApproveDraft();
  const reject = useRejectDraft();
  const markPublished = useMarkPublished();
  const publishToIg = usePublishToInstagram();
  const isLoading = approve.isPending || reject.isPending || markPublished.isPending || publishToIg.isPending;
  const color = PILAR_COLORS[draft.pilar] ?? PILAR_COLORS.educacao_pratica;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "oklch(0.16 0.01 250)",
        border: "1px solid oklch(0.24 0.01 250)",
      }}
    >
      {/* Meta header */}
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid oklch(0.20 0.01 250)" }}>
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
          style={{ background: color.bg, color: color.text }}
        >
          {PILAR_LABELS[draft.pilar]}
        </span>
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{ background: "oklch(0.22 0.01 250)", color: "oklch(0.60 0.02 250)" }}
        >
          {draft.platform}
        </span>
        {draft.trigger_mode === "manual" && (
          <span className="text-[10px]" style={{ color: "oklch(0.65 0.12 262)" }}>· manual</span>
        )}
        <span className="ml-auto text-[10px]" style={{ color: "oklch(0.48 0.02 250)" }}>
          {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>

      {/* Post preview */}
      <div className="p-4">
        {expanded ? (
          <PostPreview draft={draft} />
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-foreground">{draft.title}</p>
            <p
              className="text-[12px] leading-relaxed line-clamp-3"
              style={{ color: "oklch(0.62 0.02 250)" }}
            >
              {draft.content}
            </p>
          </div>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2.5 flex items-center gap-1 text-[11px] transition-colors"
          style={{ color: expanded ? "oklch(0.65 0.12 262)" : "oklch(0.55 0.02 250)" }}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Fechar prévia" : "Ver prévia completa"}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-3.5"
        style={{ borderTop: "1px solid oklch(0.20 0.01 250)", paddingTop: "12px" }}>
        {draft.status === "generated" && (
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={isLoading}
              onClick={() => reject.mutate(draft.id)}
              className="h-8 text-[12px] px-3"
              style={{ color: "oklch(0.55 0.04 15)" }}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Rejeitar
            </Button>
            <Button
              size="sm"
              disabled={isLoading}
              onClick={() => approve.mutate(draft.id)}
              className="ml-auto h-8 text-[12px] gap-1.5"
              style={{
                background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
                color: "white",
                border: "none",
              }}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {approve.isPending ? "Aprovando..." : "Aprovar"}
            </Button>
          </>
        )}

        {draft.status === "approved" && (
          <div className="flex items-center gap-2 ml-auto">
            {draft.platform === "instagram" ? (
              <Button
                size="sm"
                disabled={isLoading}
                onClick={() => publishToIg.mutate(draft.id)}
                className="h-8 text-[12px] gap-1.5"
                style={{
                  background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
                  color: "white",
                  border: "none",
                }}
              >
                {publishToIg.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Publicando...</>
                ) : (
                  <><Instagram className="h-3.5 w-3.5" /> Publicar no Instagram</>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => markPublished.mutate(draft.id)}
                className="h-8 text-[12px]"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {markPublished.isPending ? "Salvando..." : "Marcar publicado"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

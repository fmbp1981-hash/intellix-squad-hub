import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, XCircle, Upload, Sparkles, Loader2,
  Lightbulb, ChevronDown, ChevronUp, Instagram, ImagePlus, Check,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useApproveDraft,
  useRejectDraft,
  useMarkPublished,
  usePublishToInstagram,
  useGenerateFromIdea,
  useRejectIdea,
  useGenerateDraftImages,
  useSelectDraftImage,
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

// ─── Image generation section ─────────────────────────────────────────────────

function ImageGenSection({ draft }: Props) {
  const [count, setCount] = useState(1);
  const generate = useGenerateDraftImages();
  const selectImage = useSelectDraftImage();

  const hasGenerated = draft.generated_images && draft.generated_images.length > 0;
  const hasSelected = !!draft.image_url;

  return (
    <div
      className="rounded-lg p-3 space-y-2.5"
      style={{ background: "oklch(0.13 0.02 262 / 0.6)", border: "1px dashed oklch(0.32 0.06 262 / 0.6)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <ImagePlus className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.65 0.12 262)" }} />
        <span className="text-[11px] font-medium" style={{ color: "oklch(0.72 0.08 262)" }}>
          {hasSelected ? "Imagem selecionada" : hasGenerated ? "Escolha uma imagem" : "Gerar imagem para este post"}
        </span>
        {hasSelected && (
          <Check className="ml-auto h-3.5 w-3.5" style={{ color: "oklch(0.72 0.14 160)" }} />
        )}
      </div>

      {/* Generated thumbnails */}
      {hasGenerated && (
        <div className="flex gap-2 flex-wrap">
          {draft.generated_images!.map((url, i) => (
            <button
              key={i}
              onClick={() => selectImage.mutate({ draftId: draft.id, imageUrl: url })}
              disabled={selectImage.isPending}
              className="relative rounded-md overflow-hidden transition-all"
              style={{
                width: 72, height: 72,
                border: draft.image_url === url
                  ? "2px solid oklch(0.65 0.12 262)"
                  : "2px solid oklch(0.24 0.02 250)",
                opacity: selectImage.isPending ? 0.6 : 1,
              }}
              title="Clique para usar esta imagem"
            >
              <img src={url} alt={`Opção ${i + 1}`} className="w-full h-full object-cover" />
              {draft.image_url === url && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "oklch(0.52 0.18 262 / 0.45)" }}
                >
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Count selector + generate button */}
      {!hasSelected && (
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "oklch(0.50 0.02 250)" }}>Quantas imagens?</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className="h-6 w-6 rounded text-[11px] font-medium transition-all"
                style={{
                  background: count === n ? "oklch(0.52 0.18 262)" : "oklch(0.20 0.02 250)",
                  color: count === n ? "white" : "oklch(0.60 0.02 250)",
                  border: "none",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            disabled={generate.isPending}
            onClick={() => generate.mutate({ draftId: draft.id, count })}
            className="ml-auto h-7 text-[11px] gap-1.5 px-3"
            style={{
              background: "oklch(0.42 0.14 262)",
              color: "white",
              border: "none",
            }}
          >
            {generate.isPending ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Gerando...</>
            ) : (
              <><Sparkles className="h-3 w-3" /> Gerar</>
            )}
          </Button>
        </div>
      )}

      {hasSelected && (
        <button
          onClick={() => selectImage.mutate({ draftId: draft.id, imageUrl: "" })}
          className="text-[10px] transition-opacity hover:opacity-80"
          style={{ color: "oklch(0.50 0.04 15)" }}
        >
          Remover seleção
        </button>
      )}
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

      {/* Image generation — shown on generated posts without an image */}
      {draft.status === "generated" && !draft.image_url && (
        <div className="px-4 pb-3">
          <ImageGenSection draft={draft} />
        </div>
      )}

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

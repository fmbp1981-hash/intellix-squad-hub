import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, CheckCircle, XCircle, Upload, Instagram,
  Loader2, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  useApproveDraft, useRejectDraft, useMarkPublished, usePublishToInstagram,
  useGenerateFromIdea, useRejectIdea,
  useUpdateScheduledFor,
  type MarketingDraft,
} from "@/hooks/useMarketingDrafts";
import { PostPreviewWithFrame } from "./PostPreview";
import { ImageGenSection } from "./ImageGenSection";
import { getBestTimesForPlatform, formatBestTime } from "./MarketingStrategyConfig";

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


function ScheduleRow({ draft }: { draft: MarketingDraft }) {
  const updateScheduled = useUpdateScheduledFor();
  const [editing, setEditing] = useState(false);

  const formatted = draft.scheduled_for
    ? format(new Date(draft.scheduled_for), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : null;

  const bestTimes = (draft.platform === "linkedin" || draft.platform === "instagram")
    ? getBestTimesForPlatform(draft.platform)
    : [];
  const nextBestTime = bestTimes[0] ?? null;

  const applyBestTime = () => {
    if (!nextBestTime) return;
    const now = new Date();
    const target = new Date();
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
      {!formatted && nextBestTime && (
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

          {/* Post preview — social network shell (Metricool-style) */}
          {!isIdea && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.48 0.02 250)" }}>
                Preview
              </p>
              <PostPreviewWithFrame draft={draft} />
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

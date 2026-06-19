import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Smartphone, LayoutGrid, Maximize2,
  ChevronLeft, ChevronRight, Download,
  CheckCircle, XCircle, Upload, Instagram, Linkedin,
  Loader2, Sparkles, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import intellixLogo from "@/assets/intellix-logo-transparent.png";
import { PostPreviewWithFrame } from "./PostPreview";
import { ImageGenSection } from "./ImageGenSection";
import { getBestTimesForPlatform, formatBestTime } from "./MarketingStrategyConfig";
import {
  useMarketingDrafts,
  useApproveDraft, useRejectDraft, useMarkPublished,
  usePublishToInstagram, usePublishToLinkedIn,
  useGenerateFromIdea, useRejectIdea,
  useUpdateScheduledFor,
  type MarketingDraft, type SlideImage,
} from "@/hooks/useMarketingDrafts";

type ViewMode = "preview" | "grid" | "media";

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
  posicionamento:   { bg: "oklch(0.50 0.16 38  / 0.18)", text: "oklch(0.80 0.14 38)"  },
  comercial:        { bg: "oklch(0.42 0.18 15  / 0.18)", text: "oklch(0.72 0.16 15)"  },
};

// ─── Instagram Profile Grid ───────────────────────────────────────────────────

function InstagramProfileGrid({
  currentDraft,
  publishedDrafts,
}: {
  currentDraft: MarketingDraft;
  publishedDrafts: MarketingDraft[];
}) {
  const getThumb = (d: MarketingDraft): string | null => {
    if (d.image_url) return d.image_url;
    const raw = d.slide_images;
    if (!raw) return null;
    const slides: SlideImage[] = typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    return slides[0]?.image_url ?? null;
  };

  const gridItems = [
    { draft: currentDraft, isCurrent: true },
    ...publishedDrafts.slice(0, 8).map((d) => ({ draft: d, isCurrent: false })),
  ];

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#000", color: "#fff" }}>
      {/* Profile header */}
      <div className="px-4 pt-5 pb-4 space-y-4">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div
            className="h-20 w-20 rounded-full shrink-0 flex items-center justify-center p-0.5"
            style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
          >
            <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: "#171723" }}>
              <img src={intellixLogo} alt="IX" style={{ height: 46, width: 46, objectFit: "contain" }} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold">ai_intellix</span>
            </div>
            <div className="flex gap-5">
              <span className="text-[13px]"><strong>86</strong> <span style={{ color: "#aaa" }}>publicações</span></span>
              <span className="text-[13px]"><strong>131</strong> <span style={{ color: "#aaa" }}>seguidores</span></span>
              <span className="text-[13px]"><strong>57</strong> <span style={{ color: "#aaa" }}>seguindo</span></span>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-1 rounded-lg text-[12px] font-semibold text-white" style={{ background: "#333" }}>
                Seguindo
              </button>
              <button className="px-4 py-1 rounded-lg text-[12px] font-semibold text-white" style={{ background: "#262626" }}>
                Mensagem
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[13px] font-semibold">IntelliX.AI | Estrategista em IA</p>
          <p className="text-[12px]" style={{ color: "#aaa" }}>
            Inteligência Artificial que trabalha pro seu negócio.
          </p>
          <p className="text-[12px]" style={{ color: "#aaa" }}>
            Empreendedorismo ✦ IA aplicada 🤖 +produtividade, +eficiência 🎯 #Desperdício
          </p>
        </div>

        {/* Highlights */}
        <div className="flex gap-3">
          {["Sobre", "Cases", "IA", "Squad"].map((name) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{ border: "2px solid #333" }}
              >
                <span className="text-lg">✦</span>
              </div>
              <p className="text-[10px]" style={{ color: "#aaa" }}>{name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid tab */}
      <div className="flex border-t border-b" style={{ borderColor: "#262626" }}>
        <button className="flex-1 py-2.5 flex items-center justify-center" style={{ borderBottom: "2px solid white" }}>
          <LayoutGrid className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* 3×3 grid */}
      <div className="grid grid-cols-3 gap-px" style={{ background: "#262626" }}>
        {gridItems.map(({ draft: d, isCurrent }, idx) => {
          const thumb = getThumb(d);
          return (
            <div key={idx} className="relative aspect-square overflow-hidden" style={{ background: "#0e0e0e" }}>
              {thumb ? (
                <>
                  <img
                    src={thumb}
                    alt={d.title}
                    className="w-full h-full object-cover"
                    style={isCurrent ? { outline: "3px solid #F2A82A", outlineOffset: "-3px" } : {}}
                  />
                  {isCurrent && (
                    <div
                      className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: "#F2A82A", color: "#111" }}
                    >
                      PRÓXIMO
                    </div>
                  )}
                </>
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-1"
                  style={{
                    background: isCurrent ? "oklch(0.20 0.04 262 / 0.5)" : "#111",
                    border: isCurrent ? "3px solid #F2A82A" : "none",
                  }}
                >
                  {isCurrent ? (
                    <>
                      <Sparkles className="h-5 w-5" style={{ color: "#F2A82A" }} />
                      <p className="text-[9px] font-semibold text-center px-2" style={{ color: "#F2A82A" }}>
                        Próximo post
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px]" style={{ color: "#444" }}>—</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Media Viewer ─────────────────────────────────────────────────────────────

function MediaViewer({ draft }: { draft: MarketingDraft }) {
  const [slideIdx, setSlideIdx] = useState(0);

  const rawSlides = draft.slide_images;
  const parsedSlides: SlideImage[] | null = (() => {
    if (!rawSlides) return null;
    if (typeof rawSlides === "string") { try { return JSON.parse(rawSlides); } catch { return null; } }
    return Array.isArray(rawSlides) ? (rawSlides as SlideImage[]) : null;
  })();

  const contentSlides: SlideImage[] | null = !parsedSlides && draft.content.includes("---SLIDE---")
    ? draft.content
        .split("---SLIDE---")
        .map((s, i) => ({ slide: i, title: `Slide ${i + 1}`, image_url: null, copy: s.trim(), practical_tip: "" }))
    : null;

  const singleSlide: SlideImage[] | null = (!parsedSlides && !contentSlides && draft.image_url)
    ? [{ slide: 0, title: draft.title, image_url: draft.image_url, copy: draft.content, practical_tip: "" }]
    : null;

  const slides = parsedSlides ?? contentSlides ?? singleSlide;

  if (!slides || slides.length === 0) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-3">
        <p style={{ color: "oklch(0.45 0.02 250)" }}>Sem mídia disponível</p>
        <p className="text-[12px]" style={{ color: "oklch(0.35 0.01 250)" }}>
          Gere imagens ou conteúdo primeiro
        </p>
      </div>
    );
  }

  const current = slides[slideIdx];
  const total = slides.length;

  const goPrev = () => setSlideIdx((p) => Math.max(0, p - 1));
  const goNext = () => setSlideIdx((p) => Math.min(total - 1, p + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex h-full flex-col" style={{ background: "#08080f" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid oklch(0.16 0.01 250)" }}
      >
        <div className="flex items-center gap-3">
          <p className="text-[13px] font-semibold text-white">{current.title}</p>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: "oklch(0.20 0.01 250)", color: "oklch(0.60 0.02 250)" }}
          >
            {slideIdx + 1} / {total}
          </span>
        </div>
        {current.image_url && (
          <a
            href={current.image_url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors hover:bg-white/5"
            style={{ color: "oklch(0.60 0.02 250)", border: "1px solid oklch(0.22 0.01 250)" }}
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        )}
      </div>

      {/* Main slide */}
      <div className="relative flex flex-1 items-center justify-center p-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIdx}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="flex items-center justify-center w-full h-full"
          >
            {current.image_url ? (
              <img
                src={current.image_url}
                alt={current.title}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
                style={{ boxShadow: "0 0 60px rgba(25,111,168,0.15), 0 25px 50px rgba(0,0,0,0.6)" }}
              />
            ) : (
              <div
                className="w-full max-w-xs aspect-square rounded-2xl flex flex-col justify-center p-8 text-center"
                style={{ background: "oklch(0.15 0.02 262)", border: "1px solid oklch(0.22 0.02 262)" }}
              >
                <p className="text-[16px] font-bold text-white leading-snug mb-3">{current.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "oklch(0.60 0.02 250)" }}>
                  {current.copy.slice(0, 200)}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {slideIdx > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(25,111,168,0.65)", backdropFilter: "blur(10px)" }}
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}
        {slideIdx < total - 1 && (
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(25,111,168,0.65)", backdropFilter: "blur(10px)" }}
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div
          className="shrink-0 flex gap-2 px-5 py-3 overflow-x-auto"
          style={{ borderTop: "1px solid oklch(0.16 0.01 250)" }}
        >
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setSlideIdx(i)}
              className="shrink-0 h-14 w-14 rounded-lg overflow-hidden transition-all hover:scale-105"
              style={{
                border: i === slideIdx ? "2px solid #F2A82A" : "2px solid oklch(0.20 0.01 250)",
                opacity: i === slideIdx ? 1 : 0.45,
              }}
            >
              {s.image_url ? (
                <img src={s.image_url} alt={s.title} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "oklch(0.18 0.01 250)", color: "oklch(0.60 0.02 250)" }}
                >
                  {i + 1}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function MarketingPostEditor({
  draft,
  onClose,
}: {
  draft: MarketingDraft | null;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [generating, setGenerating] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);

  const approve       = useApproveDraft();
  const reject        = useRejectDraft();
  const markPublished = useMarkPublished();
  const publishIG     = usePublishToInstagram();
  const publishLI     = usePublishToLinkedIn();
  const generate      = useGenerateFromIdea();
  const rejectIdea    = useRejectIdea();
  const updateSched   = useUpdateScheduledFor();
  const { data: publishedDrafts = [] } = useMarketingDrafts("published");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!draft) return null;

  const color    = PILAR_COLORS[draft.pilar] ?? PILAR_COLORS.educacao_pratica;
  const isIdea   = draft.status === "idea_pending";
  const isGen    = draft.status === "generated";
  const isApp    = draft.status === "approved";

  const handleGenerate = async () => {
    setGenerating(true);
    try { await generate.mutateAsync(draft.id); }
    finally { setGenerating(false); }
  };

  const formatted = draft.scheduled_for
    ? format(new Date(draft.scheduled_for), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : null;

  const bestTimes    = draft.platform === "linkedin" || draft.platform === "instagram"
    ? getBestTimesForPlatform(draft.platform) : [];
  const nextBestTime = bestTimes[0] ?? null;

  const applyBestTime = () => {
    if (!nextBestTime) return;
    const now    = new Date();
    const target = new Date();
    const diff   = (nextBestTime.dayOfWeek - now.getDay() + 7) % 7;
    target.setDate(now.getDate() + (diff === 0 ? 7 : diff));
    target.setHours(nextBestTime.hour, nextBestTime.minute, 0, 0);
    updateSched.mutate({ id: draft.id, scheduled_for: target.toISOString() });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex"
      style={{ background: "oklch(0.11 0.01 250)" }}
    >
      {/* ── Left panel — Content & Actions ────────────────────────────────── */}
      <div
        className="flex w-1/2 flex-col overflow-hidden"
        style={{ borderRight: "1px solid oklch(0.20 0.01 250)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid oklch(0.20 0.01 250)" }}
        >
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: color.bg }}
          >
            <div className="h-3 w-3 rounded-full" style={{ background: color.text }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-white truncate leading-tight">{draft.title}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.50 0.02 250)" }}>
              {PILAR_LABELS[draft.pilar]} · {draft.platform}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-white/5"
          >
            <X className="h-4 w-4" style={{ color: "oklch(0.52 0.02 250)" }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className="border-0 text-[11px] px-2.5 py-1" style={{ background: color.bg, color: color.text }}>
              {PILAR_LABELS[draft.pilar]}
            </Badge>
            <Badge className="border-0 text-[11px] px-2.5 py-1 capitalize" style={{ background: "oklch(0.20 0.01 250)", color: "oklch(0.62 0.02 250)" }}>
              {draft.platform}
            </Badge>
            {draft.content_type && (
              <Badge className="border-0 text-[11px] px-2.5 py-1" style={{ background: "oklch(0.20 0.01 250)", color: "oklch(0.62 0.02 250)" }}>
                {draft.content_type.replace(/_/g, " ")}
              </Badge>
            )}
            <Badge
              className="border-0 text-[11px] px-2.5 py-1"
              style={{
                background: draft.status === "published" ? "oklch(0.39 0.10 160 / 0.2)" : "oklch(0.20 0.01 250)",
                color:      draft.status === "published" ? "oklch(0.72 0.14 160)"        : "oklch(0.58 0.02 250)",
              }}
            >
              {draft.status.replace(/_/g, " ")}
            </Badge>
          </div>

          {/* Schedule card */}
          {!isIdea && (
            <div
              className="rounded-xl p-4 space-y-2.5"
              style={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(0.20 0.01 250)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.02 250)" }}>
                Data de publicação
              </p>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 shrink-0" style={{ color: "oklch(0.52 0.02 250)" }} />
                {editingSchedule ? (
                  <input
                    type="datetime-local"
                    defaultValue={draft.scheduled_for ? draft.scheduled_for.slice(0, 16) : ""}
                    className="h-7 flex-1 rounded-lg px-2.5 text-[12px]"
                    style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(0.28 0.01 250)", color: "oklch(0.82 0.02 250)" }}
                    autoFocus
                    onBlur={(e) => {
                      updateSched.mutate({ id: draft.id, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null });
                      setEditingSchedule(false);
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingSchedule(true)}
                    className="text-[13px] transition-colors hover:underline"
                    style={{ color: formatted ? "oklch(0.70 0.14 240)" : "oklch(0.46 0.02 250)" }}
                  >
                    {formatted ?? "Definir data de publicação"}
                  </button>
                )}
              </div>
              {!formatted && nextBestTime && (
                <button
                  onClick={applyBestTime}
                  disabled={updateSched.isPending}
                  className="text-[11px] transition-colors hover:underline"
                  style={{ color: "oklch(0.58 0.14 240)", paddingLeft: "26px" }}
                >
                  ✦ Melhor horário: {formatBestTime(nextBestTime)}
                </button>
              )}
            </div>
          )}

          {/* Research snippets (ideas) */}
          {isIdea && draft.research_snippets && draft.research_snippets.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.02 250)" }}>
                Fontes de pesquisa
              </p>
              <div className="space-y-1.5">
                {draft.research_snippets.slice(0, 5).map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl p-3 transition-colors hover:bg-white/3"
                    style={{ border: "1px solid oklch(0.20 0.01 250)" }}
                  >
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: "oklch(0.20 0.01 250)", color: "oklch(0.52 0.02 250)" }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[12px] truncate" style={{ color: "oklch(0.62 0.14 240)" }}>
                      {s.title || s.source}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Angle (ideas) */}
          {isIdea && draft.angle && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.02 250)" }}>
                Ângulo da ideia
              </p>
              <div className="rounded-xl p-4" style={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(0.20 0.01 250)" }}>
                <p className="text-[14px] leading-relaxed" style={{ color: "oklch(0.78 0.02 250)" }}>
                  {draft.angle}
                </p>
              </div>
            </div>
          )}

          {/* Post content */}
          {!isIdea && draft.content && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.02 250)" }}>
                Conteúdo do post
              </p>
              <div
                className="rounded-xl p-4 whitespace-pre-wrap text-[13px] leading-relaxed overflow-y-auto"
                style={{
                  background: "oklch(0.13 0.01 250)",
                  border: "1px solid oklch(0.20 0.01 250)",
                  color: "oklch(0.78 0.02 250)",
                  maxHeight: 340,
                }}
              >
                {draft.content}
              </div>
            </div>
          )}

          {/* Image gen */}
          {isGen && <ImageGenSection draft={draft} />}
        </div>

        {/* Footer actions */}
        <div
          className="shrink-0 px-5 py-4 space-y-2.5"
          style={{ borderTop: "1px solid oklch(0.20 0.01 250)" }}
        >
          {isIdea && (
            <>
              <Button
                className="w-full h-10 gap-2 text-[13px]"
                disabled={generating || generate.isPending}
                onClick={handleGenerate}
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))", color: "white", border: "none" }}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Aprovar e gerar conteúdo
              </Button>
              <Button
                variant="ghost"
                className="w-full h-8 gap-1.5 text-[12px]"
                disabled={rejectIdea.isPending}
                onClick={() => rejectIdea.mutate(draft.id)}
                style={{ color: "oklch(0.52 0.02 250)" }}
              >
                <XCircle className="h-4 w-4" /> Rejeitar ideia
              </Button>
            </>
          )}

          {isGen && (
            <div className="flex gap-2.5">
              <Button
                variant="ghost"
                className="flex-1 h-10 gap-1.5 text-[13px]"
                disabled={reject.isPending}
                onClick={() => reject.mutate(draft.id)}
                style={{ color: "oklch(0.52 0.02 250)" }}
              >
                <XCircle className="h-4 w-4" /> Rejeitar
              </Button>
              <Button
                className="flex-1 h-10 gap-1.5 text-[13px]"
                disabled={approve.isPending}
                onClick={() => approve.mutate(draft.id)}
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))", color: "white", border: "none" }}
              >
                <CheckCircle className="h-4 w-4" /> Aprovar post
              </Button>
            </div>
          )}

          {isApp && (
            <div className="space-y-2">
              {draft.platform === "instagram" && (
                <Button
                  className="w-full h-10 gap-2 text-[13px]"
                  disabled={publishIG.isPending}
                  onClick={() => publishIG.mutate(draft.id)}
                  style={{ background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)", color: "white", border: "none" }}
                >
                  {publishIG.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                  Publicar no Instagram
                </Button>
              )}
              {draft.platform === "linkedin" && (
                <Button
                  className="w-full h-10 gap-2 text-[13px]"
                  disabled={publishLI.isPending}
                  onClick={() => publishLI.mutate(draft.id)}
                  style={{ background: "linear-gradient(135deg,#0077b5,#00a0dc)", color: "white", border: "none" }}
                >
                  {publishLI.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Linkedin className="h-4 w-4" />}
                  Publicar no LinkedIn
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full h-8 gap-1.5 text-[12px]"
                disabled={markPublished.isPending}
                onClick={() => markPublished.mutate(draft.id)}
                style={{ color: "oklch(0.62 0.02 250)", borderColor: "oklch(0.24 0.01 250)" }}
              >
                <Upload className="h-3.5 w-3.5" /> Marcar como publicado
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — Preview ─────────────────────────────────────────── */}
      <div className="flex w-1/2 flex-col overflow-hidden" style={{ background: "oklch(0.10 0.005 250)" }}>

        {/* View mode toggle */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid oklch(0.18 0.01 250)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.02 250)" }}>
            Visualização
          </p>
          <div
            className="flex items-center gap-0.5 rounded-lg p-1"
            style={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(0.20 0.01 250)" }}
          >
            {(
              [
                { mode: "preview" as const, Icon: Smartphone,  label: "Preview mobile" },
                { mode: "grid"    as const, Icon: LayoutGrid,  label: "Grade do perfil Instagram" },
                { mode: "media"   as const, Icon: Maximize2,   label: "Visualizador de mídia" },
              ] as const
            ).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-md transition-all"
                style={{
                  background: viewMode === mode ? "oklch(0.22 0.02 262)" : "transparent",
                  color:      viewMode === mode ? "oklch(0.72 0.16 262)" : "oklch(0.45 0.02 250)",
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {viewMode === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="h-full overflow-y-auto p-8 flex justify-center"
              >
                <div className="w-full max-w-sm">
                  <PostPreviewWithFrame draft={draft} />
                </div>
              </motion.div>
            )}

            {viewMode === "grid" && (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="h-full"
              >
                <InstagramProfileGrid
                  currentDraft={draft}
                  publishedDrafts={publishedDrafts}
                />
              </motion.div>
            )}

            {viewMode === "media" && (
              <motion.div
                key="media"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="h-full"
              >
                <MediaViewer draft={draft} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

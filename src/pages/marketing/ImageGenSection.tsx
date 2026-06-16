import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ImagePlus, Sparkles, Loader2, Check, RefreshCw,
  LayoutGrid, Layers, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import {
  useGenerateDraftImages, useSelectDraftImage, useAssignSlideImage,
  type MarketingDraft, type SlideImage,
} from "@/hooks/useMarketingDrafts";

interface Props {
  draft: MarketingDraft;
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

interface LightboxProps {
  images: string[];
  initialIndex: number;
  selected: string | null;
  onClose: () => void;
  onSelect: (url: string | null) => void;
  onAssignSlide?: (slideIndex: number, url: string) => void;
  slides?: SlideImage[];
  slideMap?: Record<string, string>;
}

function Lightbox({ images, initialIndex, selected, onClose, onSelect, onAssignSlide, slides, slideMap }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex);
  const url = images[idx];
  const hasSlides = (slides ?? []).length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 border-none overflow-hidden"
        style={{ background: "oklch(0.08 0.01 250)", maxWidth: "min(90vw, 640px)" }}
      >
        <div className="relative">
          <img
            src={url}
            alt={`imagem ${idx + 1}`}
            className="w-full object-contain"
            style={{ maxHeight: "72vh" }}
          />

          {images.length > 1 && (
            <>
              <button
                onClick={() => setIdx((idx - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "oklch(0.12 0.01 250 / 0.85)" }}
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={() => setIdx((idx + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "oklch(0.12 0.01 250 / 0.85)" }}
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </>
          )}

          <div
            className="absolute top-2 right-2 h-6 px-2 rounded-full flex items-center text-[10px]"
            style={{ background: "oklch(0.12 0.01 250 / 0.85)", color: "oklch(0.55 0.02 250)" }}
          >
            {idx + 1} / {images.length}
          </div>
        </div>

        <div className="p-3 space-y-2">
          <button
            onClick={() => onSelect(selected === url ? null : url)}
            className="w-full h-8 rounded-md text-[12px] font-medium transition-colors"
            style={{
              background: selected === url ? "oklch(0.52 0.18 262)" : "oklch(0.20 0.02 262)",
              color: selected === url ? "white" : "oklch(0.72 0.14 262)",
              border: `1px solid ${selected === url ? "oklch(0.52 0.18 262)" : "oklch(0.30 0.06 262)"}`,
            }}
          >
            {selected === url ? "✓ Selecionada como capa" : "Selecionar como capa"}
          </button>

          {hasSlides && onAssignSlide && (
            <div className="space-y-1">
              <p className="text-[10px]" style={{ color: "oklch(0.45 0.01 250)" }}>
                Atribuir a slide:
              </p>
              <div className="grid grid-cols-4 gap-1">
                {(slides ?? []).map((slide, si) => {
                  const assigned = slideMap?.[String(si)] === url;
                  return (
                    <button
                      key={si}
                      onClick={() => onAssignSlide(si, assigned ? "" : url)}
                      title={slide.title}
                      className="h-7 rounded text-[10px] transition-colors"
                      style={{
                        background: assigned ? "oklch(0.26 0.06 262)" : "oklch(0.18 0.01 250)",
                        color: assigned ? "oklch(0.72 0.14 262)" : "oklch(0.45 0.01 250)",
                        border: `1px solid ${assigned ? "oklch(0.40 0.10 262)" : "oklch(0.24 0.01 250)"}`,
                      }}
                    >
                      S{si + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Global pool mode ─────────────────────────────────────────────────────────

interface GlobalPoolProps {
  draft: MarketingDraft;
  images: string[];
  selected: string | null;
  qty: number;
  setQty: (n: number) => void;
  onOpenLightbox: (url: string) => void;
}

function GlobalPool({ draft, images, selected, qty, setQty, onOpenLightbox }: GlobalPoolProps) {
  const generateImages = useGenerateDraftImages();
  const selectImage = useSelectDraftImage();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="h-7 rounded-md px-2 text-[11px]"
          style={{
            background: "oklch(0.18 0.01 250)",
            border: "1px solid oklch(0.26 0.01 250)",
            color: "oklch(0.75 0.02 250)",
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n} imagem{n > 1 ? "ns" : ""}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={generateImages.isPending}
          onClick={() => generateImages.mutate({ draftId: draft.id, count: qty })}
          className="h-7 gap-1 text-[11px]"
          style={{
            background: "oklch(0.22 0.06 262)",
            color: "oklch(0.72 0.14 262)",
            border: "1px solid oklch(0.32 0.08 262)",
          }}
        >
          {generateImages.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : images.length > 0 ? (
            <Plus className="h-3 w-3" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {images.length > 0 ? "Gerar mais" : "Gerar"}
        </Button>
      </div>

      {images.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => onOpenLightbox(url)}
                className="relative overflow-hidden rounded-md aspect-square transition-all hover:opacity-90"
                style={{
                  border: selected === url
                    ? "2px solid oklch(0.52 0.18 262)"
                    : "2px solid oklch(0.26 0.01 250)",
                }}
              >
                <img src={url} alt={`opção ${i + 1}`} className="h-full w-full object-cover" />
                {selected === url && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "oklch(0.52 0.18 262 / 0.40)" }}
                  >
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px]"
                  style={{ background: "oklch(0.12 0.01 250 / 0.80)", color: "oklch(0.60 0.02 250)" }}
                >
                  {i + 1}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {selected && (
              <button
                onClick={() => selectImage.mutate({ draftId: draft.id, imageUrl: null })}
                className="text-[10px] transition-colors hover:opacity-80"
                style={{ color: "oklch(0.48 0.02 250)" }}
              >
                Remover seleção
              </button>
            )}
            <span className="text-[10px]" style={{ color: "oklch(0.38 0.01 250)" }}>
              Clique para ampliar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Per-slide mode ───────────────────────────────────────────────────────────

interface PerSlideModeProps {
  draft: MarketingDraft;
  slides: SlideImage[];
  slideMap: Record<string, string>;
  images: string[];
  onOpenLightbox: (url: string) => void;
  generatingSlide: number | null;
  onGenerateForSlide: (slideIndex: number, content: string) => void;
}

function PerSlideMode({
  draft, slides, slideMap, images, onOpenLightbox, generatingSlide, onGenerateForSlide,
}: PerSlideModeProps) {
  const assignSlide = useAssignSlideImage();
  const [pickingForSlide, setPickingForSlide] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {slides.map((slide, si) => {
        const assignedUrl = slideMap[String(si)] ?? null;
        const isGenerating = generatingSlide === si;

        return (
          <div
            key={si}
            className="rounded-md p-2 space-y-1.5"
            style={{ background: "oklch(0.17 0.01 250)", border: "1px solid oklch(0.24 0.01 250)" }}
          >
            <div className="flex items-start gap-2">
              <span
                className="shrink-0 h-5 min-w-5 rounded text-[10px] font-mono flex items-center justify-center"
                style={{ background: "oklch(0.22 0.01 250)", color: "oklch(0.50 0.01 250)" }}
              >
                {si + 1}
              </span>
              <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: "oklch(0.65 0.02 250)" }}>
                {slide.title}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {assignedUrl ? (
                <button
                  onClick={() => onOpenLightbox(assignedUrl)}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded"
                  style={{ border: "2px solid oklch(0.52 0.18 262)" }}
                >
                  <img src={assignedUrl} alt={`slide ${si + 1}`} className="h-full w-full object-cover" />
                </button>
              ) : (
                <div
                  className="h-12 w-12 shrink-0 rounded flex items-center justify-center"
                  style={{ background: "oklch(0.20 0.01 250)", border: "1px dashed oklch(0.30 0.01 250)" }}
                >
                  <ImagePlus className="h-3.5 w-3.5" style={{ color: "oklch(0.38 0.01 250)" }} />
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                <button
                  disabled={isGenerating}
                  onClick={() => {
                    const content = `${slide.title}\n${slide.copy ?? ""}\n${slide.practical_tip ?? ""}`.trim();
                    onGenerateForSlide(si, content);
                  }}
                  className="h-6 px-2 rounded text-[10px] flex items-center gap-1 transition-colors"
                  style={{
                    background: "oklch(0.22 0.06 262)",
                    color: "oklch(0.72 0.14 262)",
                    border: "1px solid oklch(0.32 0.08 262)",
                    opacity: isGenerating ? 0.7 : 1,
                  }}
                >
                  {isGenerating ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : assignedUrl ? (
                    <RefreshCw className="h-2.5 w-2.5" />
                  ) : (
                    <Sparkles className="h-2.5 w-2.5" />
                  )}
                  {assignedUrl ? "Regerar" : "Gerar"}
                </button>

                {images.length > 0 && (
                  <button
                    onClick={() => setPickingForSlide(pickingForSlide === si ? null : si)}
                    className="h-6 px-2 rounded text-[10px] transition-colors"
                    style={{
                      background: pickingForSlide === si ? "oklch(0.26 0.04 38)" : "oklch(0.20 0.01 250)",
                      color: pickingForSlide === si ? "oklch(0.80 0.14 38)" : "oklch(0.50 0.01 250)",
                      border: "1px solid oklch(0.28 0.01 250)",
                    }}
                  >
                    {assignedUrl ? "Trocar" : "Do pool"}
                  </button>
                )}

                {assignedUrl && (
                  <button
                    onClick={() =>
                      assignSlide.mutate({
                        draftId: draft.id,
                        slideIndex: si,
                        imageUrl: null,
                        currentMap: slideMap,
                      })
                    }
                    className="h-6 px-2 rounded text-[10px] transition-colors"
                    style={{
                      background: "oklch(0.18 0.01 250)",
                      color: "oklch(0.42 0.01 250)",
                      border: "1px solid oklch(0.24 0.01 250)",
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>

            {pickingForSlide === si && (
              <div className="grid grid-cols-5 gap-1 pt-1">
                {images.map((imgUrl, ii) => (
                  <button
                    key={ii}
                    onClick={() => {
                      assignSlide.mutate({
                        draftId: draft.id,
                        slideIndex: si,
                        imageUrl: imgUrl,
                        currentMap: slideMap,
                      });
                      setPickingForSlide(null);
                    }}
                    className="relative aspect-square overflow-hidden rounded transition-opacity hover:opacity-80"
                    style={{
                      border:
                        slideMap[String(si)] === imgUrl
                          ? "2px solid oklch(0.52 0.18 262)"
                          : "2px solid oklch(0.26 0.01 250)",
                    }}
                  >
                    <img src={imgUrl} alt={`img ${ii + 1}`} className="h-full w-full object-cover" />
                    {slideMap[String(si)] === imgUrl && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "oklch(0.52 0.18 262 / 0.40)" }}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImageGenSection({ draft }: Props) {
  const [qty, setQty] = useState(3);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<"global" | "perslide">("global");
  const [generatingSlide, setGeneratingSlide] = useState<number | null>(null);

  const generateImages = useGenerateDraftImages();
  const selectImage = useSelectDraftImage();
  const assignSlide = useAssignSlideImage();

  const images = draft.generated_images ?? [];
  const selected = draft.image_url;
  const slides = draft.slide_images ?? [];
  const slideMap = draft.slide_image_map ?? {};
  const hasSlides = slides.length > 0;

  async function handleGenerateForSlide(slideIndex: number, content: string) {
    setGeneratingSlide(slideIndex);
    try {
      const result = await generateImages.mutateAsync({
        draftId: draft.id,
        count: 1,
        slideContent: content,
        slideIndex,
      });
      if (result?.urls?.length > 0) {
        assignSlide.mutate({
          draftId: draft.id,
          slideIndex,
          imageUrl: result.urls[0],
          currentMap: slideMap,
        });
      }
    } finally {
      setGeneratingSlide(null);
    }
  }

  const showLightbox = lightboxIndex !== null && images[lightboxIndex] !== undefined;

  return (
    <div
      className="space-y-3 rounded-lg p-3"
      style={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(0.22 0.01 250)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-3.5 w-3.5" style={{ color: "oklch(0.55 0.02 250)" }} />
          <span className="text-[11px] font-medium" style={{ color: "oklch(0.55 0.02 250)" }}>
            Imagens geradas por IA
          </span>
        </div>
        {hasSlides && (
          <div className="flex gap-1">
            {(["global", "perslide"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                title={m === "global" ? "Pool de imagens" : "Por slide"}
                className="h-6 w-6 rounded flex items-center justify-center transition-colors"
                style={{
                  background: mode === m ? "oklch(0.26 0.06 262)" : "transparent",
                  color: mode === m ? "oklch(0.72 0.14 262)" : "oklch(0.40 0.01 250)",
                }}
              >
                {m === "global" ? <LayoutGrid className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global mode */}
      {mode === "global" && (
        <GlobalPool
          draft={draft}
          images={images}
          selected={selected}
          qty={qty}
          setQty={setQty}
          onOpenLightbox={(url) => {
            const idx = images.indexOf(url);
            setLightboxIndex(idx >= 0 ? idx : 0);
          }}
        />
      )}

      {/* Per-slide mode */}
      {mode === "perslide" && hasSlides && (
        <PerSlideMode
          draft={draft}
          slides={slides}
          slideMap={slideMap}
          images={images}
          onOpenLightbox={(url) => {
            const idx = images.indexOf(url);
            setLightboxIndex(idx >= 0 ? idx : 0);
          }}
          generatingSlide={generatingSlide}
          onGenerateForSlide={handleGenerateForSlide}
        />
      )}

      {/* Replace existing image row (for posts that already have an image) */}
      {draft.image_url && images.length === 0 && (
        <div className="flex items-center gap-2 pt-1">
          <img
            src={draft.image_url}
            alt="imagem atual"
            className="h-10 w-10 rounded object-cover shrink-0"
            style={{ border: "1px solid oklch(0.28 0.01 250)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px]" style={{ color: "oklch(0.45 0.01 250)" }}>
              Imagem atual do post
            </p>
          </div>
          <Button
            size="sm"
            disabled={generateImages.isPending}
            onClick={() => generateImages.mutate({ draftId: draft.id, count: qty })}
            className="h-7 gap-1 shrink-0 text-[11px]"
            style={{
              background: "oklch(0.22 0.06 262)",
              color: "oklch(0.72 0.14 262)",
              border: "1px solid oklch(0.32 0.08 262)",
            }}
          >
            {generateImages.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Substituir
          </Button>
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex!}
          selected={selected}
          onClose={() => setLightboxIndex(null)}
          onSelect={(url) => selectImage.mutate({ draftId: draft.id, imageUrl: url })}
          onAssignSlide={
            hasSlides
              ? (si, url) =>
                  assignSlide.mutate({
                    draftId: draft.id,
                    slideIndex: si,
                    imageUrl: url || null,
                    currentMap: slideMap,
                  })
              : undefined
          }
          slides={slides}
          slideMap={slideMap}
        />
      )}
    </div>
  );
}

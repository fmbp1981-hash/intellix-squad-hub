import { cn } from "@/lib/utils";
import type { MarketingDraft } from "@/hooks/useMarketingDrafts";

interface Props {
  draft: MarketingDraft;
}

// ─── LinkedIn ────────────────────────────────────────────────────────────────

function formatLinkedIn(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(#\w+)/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          part.startsWith("#") ? (
            <span key={j} className="text-[oklch(0.65_0.15_240)]">{part}</span>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
        {"\n"}
      </span>
    );
  });
}

function LinkedInPreview({ draft }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(0.26 0.01 250)" }}
    >
      {/* Profile header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="h-11 w-11 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))" }}
        >
          IX
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-tight">IntelliX.AI</p>
          <p className="text-[11px]" style={{ color: "oklch(0.58 0.02 250)" }}>
            Consultoria Inteligente · Agora
          </p>
        </div>
        <div className="ml-auto">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}
            style={{ color: "oklch(0.55 0.12 240)" }}>
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p
          className="whitespace-pre-wrap text-[13px] leading-[1.6]"
          style={{ color: "oklch(0.88 0.01 250)" }}
        >
          {formatLinkedIn(draft.content)}
        </p>
      </div>

      {/* Image */}
      {draft.image_url && (
        <div className="relative w-full" style={{ paddingTop: "52.5%" }}>
          <img
            src={draft.image_url}
            alt={draft.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      )}

      {/* Engagement bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 text-[11px]"
        style={{
          borderTop: "1px solid oklch(0.24 0.01 250)",
          color: "oklch(0.55 0.02 250)",
        }}
      >
        <div className="flex items-center gap-1">
          <span>👍</span><span>Curtir</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💬</span><span>Comentar</span>
        </div>
        <div className="flex items-center gap-1">
          <span>↗</span><span>Compartilhar</span>
        </div>
        <div className="flex items-center gap-1">
          <span>✉</span><span>Enviar</span>
        </div>
      </div>
    </div>
  );
}

// ─── Instagram ───────────────────────────────────────────────────────────────

function InstagramPreview({ draft }: Props) {
  const slides = draft.content.includes("---SLIDE---")
    ? draft.content.split("---SLIDE---").map((s) => s.trim()).filter(Boolean)
    : null;

  const caption = slides ? slides[slides.length - 1] : draft.content;
  const parts = caption.split(/(#\w+)/g);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "oklch(0.11 0.01 250)", border: "1px solid oklch(0.22 0.01 250)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
        >
          IX
        </div>
        <p className="text-[13px] font-semibold text-white">intellixai</p>
        <span className="ml-auto text-[11px]" style={{ color: "oklch(0.55 0.02 250)" }}>•••</span>
      </div>

      {/* Image / Carousel */}
      {draft.image_url ? (
        <div className="relative w-full" style={{ paddingTop: "100%" }}>
          <img
            src={draft.image_url}
            alt={draft.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {slides && slides.length > 1 && (
            <>
              {/* Carousel indicator */}
              <div className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ background: "oklch(0.08 0.01 250 / 0.7)" }}>
                1 / {slides.length}
              </div>
              {/* Slide dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {slides.map((_, i) => (
                  <div key={i} className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === 0 ? "16px" : "6px",
                      background: i === 0 ? "white" : "oklch(1 0 0 / 0.4)",
                    }} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full flex items-center justify-center"
          style={{ paddingTop: "100%", position: "relative", background: "oklch(0.15 0.02 270)" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[11px]" style={{ color: "oklch(0.45 0.02 250)" }}>Imagem sendo gerada...</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center px-3 py-2">
        <div className="flex gap-3 text-lg">
          <span>🤍</span><span>💬</span><span>↗</span>
        </div>
        <span className="ml-auto text-lg">🔖</span>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 space-y-1">
        <p className="text-[12px] leading-[1.5]" style={{ color: "oklch(0.88 0.01 250)" }}>
          <span className="font-semibold mr-1">intellixai</span>
          {parts.map((part, i) =>
            part.startsWith("#") ? (
              <span key={i} style={{ color: "oklch(0.65 0.15 240)" }}>{part} </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
        {slides && slides.length > 1 && (
          <div className="space-y-1.5 pt-1">
            {slides.slice(0, -1).map((slide, i) => (
              <div key={i}
                className="rounded-lg p-2.5 text-[11px] leading-[1.5]"
                style={{ background: "oklch(0.16 0.01 250)", color: "oklch(0.75 0.01 250)" }}>
                <span className="font-semibold mr-1" style={{ color: "oklch(0.65 0.12 262)" }}>
                  Slide {i + 1}
                </span>
                {slide}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

function WhatsAppPreview({ draft }: Props) {
  const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="rounded-xl overflow-hidden p-3"
      style={{
        background: "oklch(0.14 0.02 155)",
        backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.16 0.03 160 / 0.4), transparent 60%)",
      }}
    >
      {/* Sender header */}
      <div className="flex items-center gap-2 mb-3 pb-2.5"
        style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))" }}
        >
          IX
        </div>
        <div>
          <p className="text-[12px] font-semibold" style={{ color: "oklch(0.75 0.12 155)" }}>IntelliX.AI</p>
          <p className="text-[10px]" style={{ color: "oklch(0.55 0.04 155)" }}>online</p>
        </div>
      </div>

      {/* Bubble */}
      <div className="flex justify-end">
        <div
          className="relative max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5"
          style={{ background: "oklch(0.38 0.10 155)" }}
        >
          <p className="whitespace-pre-wrap text-[13px] leading-[1.55]"
            style={{ color: "oklch(0.96 0.01 155)" }}>
            {draft.content}
          </p>
          <p className="text-right mt-1 text-[10px]" style={{ color: "oklch(0.75 0.05 155)" }}>
            {now} ✓✓
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function PostPreview({ draft }: Props) {
  if (draft.platform === "instagram") return <InstagramPreview draft={draft} />;
  if (draft.platform === "whatsapp") return <WhatsAppPreview draft={draft} />;
  return <LinkedInPreview draft={draft} />;
}

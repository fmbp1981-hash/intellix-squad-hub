import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MarketingDraft } from "@/hooks/useMarketingDrafts";
import intellixLogo from "@/assets/intellix-logo-transparent.png";

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

// ─── Cores IntelliX ───────────────────────────────────────────────────────────
const IX = {
  bg:      "#171723",
  bgCard:  "#1F1F2E",
  primary: "#196FA8",
  accent:  "#F2A82A",
  gold2:   "#F6C97D",
  text:    "#FAFAFA",
  muted:   "#BDBDC3",
};

function InstagramCarouselSlide({ text, index, total }: { text: string; index: number; total: number }) {
  const isLast = index === total - 1;

  const clean = text.replace(/\*\*/g, "").replace(/→\s*$/, "").trim();
  const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines[0] ?? "";
  const body  = lines.slice(1).join("  ");

  // clamp(min, preferred-vw, max-px) — evita overflow em monitores largos
  // O card tem max-w-2xl (~672px), o slide ocupa ~600px de largura
  const titleSize =
    title.length > 70 ? "clamp(13px, 2.2vw, 17px)" :
    title.length > 45 ? "clamp(15px, 2.6vw, 20px)" :
    title.length > 28 ? "clamp(18px, 3.0vw, 26px)" :
                        "clamp(22px, 3.6vw, 32px)";
  const bodySize = "clamp(12px, 1.6vw, 15px)";

  return (
    <div
      className="absolute inset-0"
      style={{
        background: IX.bg,
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        padding: "6% 7%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Orbs — posicionados em % para escalar com o slide */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "55%", paddingBottom: "55%",
          borderRadius: "50%", top: "-20%", right: "-18%",
          background: `radial-gradient(circle, ${IX.primary}1A 0%, transparent 55%)`,
        }} />
        <div style={{
          position: "absolute", width: "42%", paddingBottom: "42%",
          borderRadius: "50%", bottom: "-15%", left: "-12%",
          background: `radial-gradient(circle, ${IX.accent}12 0%, transparent 55%)`,
        }} />
      </div>

      {/* HEADER: logo + wordmark + contador */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3%" }}>
          <img src={intellixLogo} alt="IntelliX.AI"
            style={{ height: "11%", minHeight: 32, maxHeight: 44, width: "auto", objectFit: "contain" }} />
          <div>
            <p style={{ fontSize: "clamp(11px, 1.8vw, 15px)", fontWeight: 700, lineHeight: 1.15, color: IX.text, margin: 0 }}>
              IntelliX<span style={{ color: IX.accent }}>.AI</span>
            </p>
            <p style={{ fontSize: "clamp(9px, 1.3vw, 12px)", color: IX.muted, lineHeight: 1.2, margin: 0 }}>@ai_intellix</p>
          </div>
        </div>
        <span style={{
          fontSize: "clamp(9px, 1.3vw, 12px)", fontWeight: 600, color: IX.muted,
          background: "rgba(255,255,255,0.08)", padding: "2px 10px", borderRadius: 99,
        }}>
          {index + 1}/{total}
        </span>
      </div>

      {/* Linha separadora azul — ancorada à esquerda como na referência */}
      <div style={{
        height: 2, width: "42%", borderRadius: 2, flexShrink: 0,
        marginTop: "5%",
        background: `linear-gradient(90deg, ${IX.primary}, ${IX.primary}00)`,
      }} />

      {/* CONTEÚDO — ocupa o restante, texto alinhado ao meio-inferior */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", paddingTop: "4%",
      }}>
        <p style={{
          fontSize: titleSize,
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: "-0.02em",
          color: isLast ? IX.accent : IX.text,
          margin: 0,
        }}>
          {title}
        </p>

        {body && (
          <p style={{
            fontSize: bodySize,
            fontWeight: 400,
            lineHeight: 1.6,
            color: IX.muted,
            marginTop: "4%",
          }}>
            {body}
          </p>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        display: "flex", alignItems: "flex-end",
        justifyContent: "space-between", flexShrink: 0,
        paddingTop: "3%",
      }}>
        <p style={{
          fontSize: "clamp(8px, 1.1vw, 10px)", fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: `${IX.muted}55`, margin: 0,
        }}>
          Resultado Visível · Tecnologia Invisível
        </p>
        {!isLast && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 1.5, background: `linear-gradient(90deg, transparent, ${IX.accent})` }} />
            <span style={{ fontSize: "clamp(20px, 3vw, 28px)", color: IX.accent, lineHeight: 1, fontWeight: 300 }}>›</span>
          </div>
        )}
      </div>
    </div>
  );
}

function InstagramPreview({ draft }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = draft.content.includes("---SLIDE---")
    ? draft.content.split("---SLIDE---").map((s) => s.trim()).filter(Boolean)
    : null;

  const isCarousel = slides && slides.length > 1;
  const captionText = slides ? slides[slides.length - 1] : draft.content;
  const captionParts = captionText.split(/(#\w+)/g);

  const goNext = () => setCurrentSlide((p) => Math.min(p + 1, (slides?.length ?? 1) - 1));
  const goPrev = () => setCurrentSlide((p) => Math.max(p - 1, 0));

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#0E0E18",
        border: `1px solid #196FA822`,
        boxShadow: "0 0 0 1px rgba(25,111,168,0.08), 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header — Instagram style */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center p-0.5"
          style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
        >
          <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: "#171723" }}>
            <img src={intellixLogo} alt="IX" style={{ height: 24, width: 24, objectFit: "contain" }} />
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white leading-tight">intellixai</p>
          <p className="text-[10px]" style={{ color: "oklch(0.50 0.02 250)" }}>IntelliX.AI</p>
        </div>
        <span className="ml-auto text-[15px]" style={{ color: "oklch(0.55 0.02 250)" }}>•••</span>
      </div>

      {/* Slide area */}
      <div className="relative w-full select-none" style={{ paddingTop: "100%" }}>
        {/* Slide content */}
        {isCarousel ? (
          <InstagramCarouselSlide
            text={slides[currentSlide]}
            index={currentSlide}
            total={slides.length}
          />
        ) : draft.image_url ? (
          <img
            src={draft.image_url}
            alt={draft.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "oklch(0.15 0.02 270)" }}>
            <p className="text-[11px]" style={{ color: "oklch(0.45 0.02 250)" }}>
              Sem imagem
            </p>
          </div>
        )}

        {/* Navigation arrows */}
        {isCarousel && (
          <>
            {currentSlide > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-105"
                style={{ background: "rgba(25,111,168,0.55)", backdropFilter: "blur(8px)", fontSize: 18 }}
              >
                ‹
              </button>
            )}
            {currentSlide < slides.length - 1 && (
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-105"
                style={{ background: "rgba(25,111,168,0.55)", backdropFilter: "blur(8px)", fontSize: 18 }}
              >
                ›
              </button>
            )}

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === currentSlide ? "18px" : "6px",
                    background: i === currentSlide ? "#F2A82A" : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center px-3 py-2">
        <div className="flex gap-3 text-lg">
          <span>🤍</span><span>💬</span><span>↗</span>
        </div>
        <span className="ml-auto text-lg">🔖</span>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-[12px] leading-[1.5]" style={{ color: "oklch(0.88 0.01 250)" }}>
          <span className="font-semibold mr-1">intellixai</span>
          {captionParts.map((part, i) =>
            part.startsWith("#") ? (
              <span key={i} style={{ color: "oklch(0.65 0.15 240)" }}>{part} </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
        {isCarousel && (
          <p className="text-[11px] mt-1" style={{ color: "oklch(0.45 0.02 250)" }}>
            {slides.length} slides · arraste para navegar
          </p>
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

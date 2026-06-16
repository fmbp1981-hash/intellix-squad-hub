import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MarketingDraft, SlideImage } from "@/hooks/useMarketingDrafts";
import intellixLogo from "@/assets/intellix-logo-transparent.png";
import { InstagramAppShell, LinkedInAppShell, WhatsAppAppShell } from "./SocialAppFrame";

interface Props {
  draft: MarketingDraft;
}

// ─── LinkedIn ────────────────────────────────────────────────────────────────

// LinkedIn renderiza parágrafos com espaçamento explícito (duplo \n = parágrafo).
// Padrão LinkedIn: linhas vazias = quebra de parágrafo com espaçamento visual.
function formatLinkedIn(text: string) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pi) => {
    const lines = para.split("\n");
    return (
      <span key={pi} style={{ display: "block", marginBottom: pi < paragraphs.length - 1 ? "10px" : 0 }}>
        {lines.map((line, li) => {
          const parts = line.split(/(#\w+)/g);
          return (
            <span key={li} style={{ display: "block" }}>
              {parts.map((part, j) =>
                part.startsWith("#") ? (
                  <span key={j} style={{ color: "oklch(0.65 0.15 240)" }}>{part}</span>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </span>
          );
        })}
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

      {/* Content — LinkedIn: 15px, line-height 1.65, parágrafos espaçados */}
      <div className="px-4 pb-3">
        <div
          style={{ fontSize: 15, lineHeight: 1.65, color: "oklch(0.88 0.01 250)" }}
        >
          {formatLinkedIn(draft.content)}
        </div>
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
  const bodyLines = lines.slice(1);

  // Slide âncora numérica: título muito curto (≤10 chars) e poucas linhas de body
  // Ex: "46%" — número deve dominar visualmente
  const isNumberAnchor = title.length <= 10 && bodyLines.length <= 2;

  // Tamanhos calibrados para slide ~600×600px (escala Instagram 1080px)
  // Padrão: headline 35-45px, body 17-20px
  const titleSize = isNumberAnchor
    ? "72px"  // número âncora: dominante, ~60% do slide
    : title.length > 70 ? "15px"
    : title.length > 45 ? "18px"
    : title.length > 28 ? "22px"
    : "32px";

  const bodySize = "17px";

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
      {/* Orbs */}
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
            style={{ height: "11%", minHeight: 28, maxHeight: 38, width: "auto", objectFit: "contain" }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15, margin: 0 }}>
              <span style={{ color: IX.accent }}>IntelliX</span><span style={{ color: IX.primary }}>.AI</span>
            </p>
            <p style={{ fontSize: 11, color: IX.muted, lineHeight: 1.2, margin: 0 }}>@ai_intellix</p>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: IX.muted, background: "rgba(255,255,255,0.08)", padding: "2px 10px", borderRadius: 99 }}>
          {index + 1}/{total}
        </span>
      </div>

      {/* Linha separadora */}
      <div style={{
        height: 2, width: "42%", borderRadius: 2, flexShrink: 0, marginTop: "4%",
        background: `linear-gradient(90deg, ${IX.primary}, ${IX.primary}00)`,
      }} />

      {/* CONTEÚDO */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: isNumberAnchor ? "center" : "flex-start",
        paddingTop: isNumberAnchor ? "0" : "6%",
        gap: isNumberAnchor ? "4%" : "0",
      }}>
        {/* Título */}
        <p style={{
          fontSize: titleSize,
          fontWeight: 800,
          lineHeight: isNumberAnchor ? 1 : 1.2,
          letterSpacing: isNumberAnchor ? "-0.04em" : "-0.02em",
          color: isNumberAnchor ? IX.accent : (isLast ? IX.accent : IX.text),
          margin: 0,
        }}>
          {title}
        </p>

        {/* Body — preserva parágrafos */}
        {bodyLines.length > 0 && (
          <div style={{ marginTop: isNumberAnchor ? "2%" : "5%" }}>
            {bodyLines.map((line, i) => (
              <p key={i} style={{
                fontSize: bodySize,
                fontWeight: isNumberAnchor && i === 0 ? 500 : 400,
                lineHeight: 1.55,
                color: isNumberAnchor && i === 0 ? IX.text : IX.muted,
                margin: 0,
                marginBottom: i < bodyLines.length - 1 ? "3%" : 0,
              }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexShrink: 0, paddingTop: "3%" }}>
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: `${IX.muted}55`, margin: 0 }}>
          Resultado Visível · Tecnologia Invisível
        </p>
        {!isLast && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 1.5, background: `linear-gradient(90deg, transparent, ${IX.accent})` }} />
            <span style={{ fontSize: 26, color: IX.accent, lineHeight: 1, fontWeight: 300 }}>›</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── News Digest Slide (Monday carrossel) ─────────────────────────────────────

function NewsDigestSlide({ slide, index, total }: { slide: SlideImage; index: number; total: number }) {
  const isCapa = index === 0;
  const isCta = index === total - 1;
  const lines = slide.copy.split("\n").filter(Boolean);
  const headline = lines[0] ?? slide.title;
  const context = lines.slice(1).find((l) => !l.startsWith("Como usar"));
  const tip = lines.find((l) => l.startsWith("Como usar"));

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: IX.bg, fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden" }}>
      {/* Orbs decorativos */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "55%", paddingBottom: "55%", borderRadius: "50%", top: "-20%", right: "-18%", background: `radial-gradient(circle, ${IX.primary}1A 0%, transparent 55%)` }} />
        <div style={{ position: "absolute", width: "42%", paddingBottom: "42%", borderRadius: "50%", bottom: "-15%", left: "-12%", background: `radial-gradient(circle, ${IX.accent}12 0%, transparent 55%)` }} />
      </div>

      {/* OG Image (slides de notícia que têm imagem) */}
      {!isCapa && !isCta && slide.image_url && (
        <div className="relative w-full shrink-0" style={{ height: "38%" }}>
          <img src={slide.image_url} alt={headline} className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 40%, ${IX.bg})` }} />
        </div>
      )}

      {/* Capa especial */}
      {isCapa && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10">
          <img src={intellixLogo} alt="IntelliX.AI" style={{ height: 36, objectFit: "contain", marginBottom: 16 }} />
          <p style={{ fontSize: 26, fontWeight: 800, color: IX.text, lineHeight: 1.2, margin: 0 }}>
            Tudo que rolou de IA<br />
            <span style={{ color: IX.accent }}>nessa semana 🤖</span>
          </p>
          <p style={{ fontSize: 14, color: IX.muted, marginTop: 10 }}>
            Resumo para Líderes e Empreendedores
          </p>
          <div style={{ marginTop: 16, padding: "4px 14px", borderRadius: 99, background: `${IX.primary}22`, border: `1px solid ${IX.primary}44` }}>
            <span style={{ fontSize: 12, color: IX.primary, fontWeight: 600 }}>
              {total - 2} notícias · arraste →
            </span>
          </div>
        </div>
      )}

      {/* CTA slide */}
      {isCta && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10 gap-3">
          <img src={intellixLogo} alt="IntelliX.AI" style={{ height: 32, objectFit: "contain" }} />
          <p style={{ fontSize: 22, fontWeight: 800, color: IX.accent, lineHeight: 1.2, margin: 0 }}>
            Quer resultado real com IA?
          </p>
          <p style={{ fontSize: 15, color: IX.muted, lineHeight: 1.5 }}>
            A IntelliX.AI cuida de tudo:<br />estratégia, automação e deploy.
          </p>
          <div style={{ marginTop: 8, padding: "8px 20px", borderRadius: 99, background: IX.primary, color: "#fff", fontWeight: 700, fontSize: 14 }}>
            Link na bio 👆
          </div>
        </div>
      )}

      {/* Slide de notícia */}
      {!isCapa && !isCta && (
        <div className="flex flex-col relative z-10" style={{ flex: 1, padding: slide.image_url ? "4% 6% 5%" : "6% 7%", justifyContent: "flex-end" }}>
          {!slide.image_url && <div style={{ flex: 1 }} />}
          <p style={{ fontSize: 20, fontWeight: 800, color: IX.text, lineHeight: 1.2, marginBottom: 8 }}>
            {headline}
          </p>
          {context && (
            <p style={{ fontSize: 15, color: IX.muted, lineHeight: 1.55, marginBottom: 10 }}>
              {context}
            </p>
          )}
          {tip && (
            <div style={{ borderLeft: `3px solid ${IX.accent}`, paddingLeft: 10, marginTop: 4 }}>
              <p style={{ fontSize: 14, color: IX.accent, fontWeight: 600, lineHeight: 1.4, margin: 0 }}>
                {tip}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3% 6%", flexShrink: 0, borderTop: `1px solid ${IX.primary}18`, zIndex: 10 }}>
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: `${IX.muted}55`, margin: 0 }}>
          Resultado Visível · Tecnologia Invisível
        </p>
        <span style={{ fontSize: 11, fontWeight: 600, color: IX.muted, background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 99 }}>
          {index + 1}/{total}
        </span>
      </div>
    </div>
  );
}

function InstagramPreview({ draft }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // News digest: usa slide_images do banco
  // JSONB pode vir como string — parse defensivo
  const rawSlideImages = draft.slide_images;
  const parsedSlideImages: SlideImage[] | null = (() => {
    if (!rawSlideImages) return null;
    if (typeof rawSlideImages === "string") {
      try { return JSON.parse(rawSlideImages); } catch { return null; }
    }
    return Array.isArray(rawSlideImages) ? rawSlideImages : null;
  })();

  const isNewsDigest = draft.content_type === "news_data" && parsedSlideImages && parsedSlideImages.length > 0;

  // virada_inteligente com image_url → sempre imagem única, nunca carrossel
  const isVirada = draft.content_type === "virada_inteligente" && Boolean(draft.image_url);

  const slides = !isNewsDigest && !isVirada && draft.content.includes("---SLIDE---")
    ? draft.content.split("---SLIDE---").map((s) => s.trim()).filter(Boolean)
    : null;

  const isCarousel = isNewsDigest || (slides && slides.length > 1);
  const slideCount = isNewsDigest ? parsedSlideImages!.length : (slides?.length ?? 1);
  const captionText = isNewsDigest ? draft.content : (slides ? slides[slides.length - 1] : draft.content);
  const captionParts = captionText.split(/(#\w+)/g);

  const goNext = () => setCurrentSlide((p) => Math.min(p + 1, slideCount - 1));
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
        {isNewsDigest ? (
          <NewsDigestSlide
            slide={parsedSlideImages![currentSlide]}
            index={currentSlide}
            total={parsedSlideImages!.length}
          />
        ) : isVirada ? (
          // Virada Inteligente: imagem full-cover, sem slides
          <img
            src={draft.image_url!}
            alt={draft.title}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ background: "#0a0a1a" }}
          />
        ) : isCarousel && slides ? (
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
                style={{ background: "rgba(25,111,168,0.55)", backdropFilter: "blur(8px)", fontSize: 18, zIndex: 50 }}
              >
                ‹
              </button>
            )}
            {currentSlide < slideCount - 1 && (
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-105"
                style={{ background: "rgba(25,111,168,0.55)", backdropFilter: "blur(8px)", fontSize: 18, zIndex: 50 }}
              >
                ›
              </button>
            )}

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" style={{ zIndex: 50 }}>
              {Array.from({ length: slideCount }).map((_, i) => (
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
            {slideCount} slides · arraste para navegar
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

// ─── Exports ──────────────────────────────────────────────────────────────────

export function PostPreview({ draft }: Props) {
  if (draft.platform === "instagram") return <InstagramPreview draft={draft} />;
  if (draft.platform === "whatsapp") return <WhatsAppPreview draft={draft} />;
  return <LinkedInPreview draft={draft} />;
}

// PostPreviewWithFrame: wraps each post card inside the authentic social network
// app shell (top nav + stories/feed context) so the preview mirrors what
// followers actually see in their feed — inspired by Metricool's right panel.
export function PostPreviewWithFrame({ draft }: Props) {
  if (draft.platform === "instagram") {
    return (
      <InstagramAppShell>
        <InstagramPreview draft={draft} />
      </InstagramAppShell>
    );
  }
  if (draft.platform === "linkedin") {
    return (
      <LinkedInAppShell>
        <LinkedInPreview draft={draft} />
      </LinkedInAppShell>
    );
  }
  if (draft.platform === "whatsapp") {
    return (
      <WhatsAppAppShell>
        <WhatsAppPreview draft={draft} />
      </WhatsAppAppShell>
    );
  }
  return <PostPreview draft={draft} />;
}

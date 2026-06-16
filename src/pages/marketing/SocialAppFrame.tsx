import { type ReactNode } from "react";
import intellixLogo from "@/assets/intellix-logo-transparent.png";

// ─── Shared: Ghost post skeleton ──────────────────────────────────────────────

function IgGhostPost({
  avatarGradient,
  imageHeight = 180,
}: {
  avatarGradient: string;
  imageHeight?: number;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px 8px" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarGradient, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: 72, height: 9, borderRadius: 4, background: "#242424", marginBottom: 5 }} />
          <div style={{ width: 48, height: 7, borderRadius: 4, background: "#1a1a1a" }} />
        </div>
        <div style={{ width: 3, height: 14, borderRadius: 99, background: "#2a2a2a", marginLeft: 4 }} />
      </div>
      <div style={{ height: imageHeight, background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px 6px" }}>
        <div style={{ width: 19, height: 17, borderRadius: 4, background: "#1c1c1c" }} />
        <div style={{ width: 19, height: 17, borderRadius: 4, background: "#1c1c1c" }} />
        <div style={{ width: 19, height: 17, borderRadius: 4, background: "#1c1c1c" }} />
        <div style={{ marginLeft: "auto", width: 19, height: 17, borderRadius: 4, background: "#1c1c1c" }} />
      </div>
      <div style={{ padding: "0 14px 12px" }}>
        <div style={{ width: "78%", height: 8, borderRadius: 4, background: "#1c1c1c", marginBottom: 4 }} />
        <div style={{ width: "52%", height: 7, borderRadius: 4, background: "#151515" }} />
      </div>
    </div>
  );
}

// ─── Instagram App Shell ──────────────────────────────────────────────────────

export function InstagramAppShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#000",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.09)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.75)",
      }}
    >
      {/* ── Top Navigation ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px 11px",
          borderBottom: "0.5px solid rgba(255,255,255,0.11)",
        }}
      >
        {/* Wordmark — approximation of Billabong italic */}
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 22,
            letterSpacing: -0.3,
            color: "#fff",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          Instagram
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Heart / Notifications */}
          <svg
            viewBox="0 0 24 24"
            style={{ width: 22, height: 22, display: "block" }}
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {/* Direct Messages */}
          <svg
            viewBox="0 0 24 24"
            style={{ width: 22, height: 22, display: "block" }}
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>

      {/* ── Stories Row ── */}
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "11px 14px 10px",
          overflowX: "auto",
          borderBottom: "0.5px solid rgba(255,255,255,0.08)",
          scrollbarWidth: "none",
        }}
      >
        {/* Your Story */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: "1.5px dashed rgba(255,255,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#111",
              position: "relative",
            }}
          >
            <img
              src={intellixLogo}
              alt=""
              style={{ width: 28, height: 28, objectFit: "contain", opacity: 0.4 }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: "#0095F6",
                border: "2px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: "#fff",
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              +
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              color: "#767676",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            Seu story
          </span>
        </div>

        {/* Feed stories */}
        {[
          {
            g: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
            i: "IX",
            l: "ai_intellix",
          },
          {
            g: "linear-gradient(135deg,#0095F6,#1877F2)",
            i: "FM",
            l: "fmbp1981",
          },
          {
            g: "linear-gradient(135deg,#F2A82A,#E05F20)",
            i: "MK",
            l: "mkt.hacks",
          },
          {
            g: "linear-gradient(135deg,#22C55E,#16A34A)",
            i: "IA",
            l: "ia.diaria",
          },
          {
            g: "linear-gradient(135deg,#A855F7,#7C3AED)",
            i: "TC",
            l: "tech.sp",
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                padding: 2.5,
                background: s.g,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#111",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  border: "2px solid #000",
                }}
              >
                {s.i}
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                color: "#767676",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {s.l}
            </span>
          </div>
        ))}
      </div>

      {/* ── Feed: ghost above ── */}
      <div
        style={{
          borderBottom: "0.5px solid rgba(255,255,255,0.055)",
          filter: "blur(2px)",
          opacity: 0.2,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <IgGhostPost
          avatarGradient="linear-gradient(135deg,#6C63FF,#3B82F6)"
          imageHeight={155}
        />
      </div>

      {/* ── Actual Post ── */}
      <div style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
        {children}
      </div>

      {/* ── Feed: ghost below ── */}
      <div
        style={{
          filter: "blur(3.5px)",
          opacity: 0.10,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <IgGhostPost
          avatarGradient="linear-gradient(135deg,#F2A82A,#E05F20)"
          imageHeight={90}
        />
      </div>
    </div>
  );
}

// ─── LinkedIn App Shell ───────────────────────────────────────────────────────

function LiGhostPost({ avatarGradient }: { avatarGradient: string }) {
  return (
    <div
      style={{
        borderRadius: 8,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 11,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: avatarGradient,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: "58%",
              height: 9,
              borderRadius: 4,
              background: "#252b3b",
              marginBottom: 5,
            }}
          />
          <div
            style={{
              width: "38%",
              height: 7,
              borderRadius: 4,
              background: "#1c2130",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ width: "100%", height: 8, borderRadius: 4, background: "#1c2130" }} />
        <div style={{ width: "87%",  height: 8, borderRadius: 4, background: "#1c2130" }} />
        <div style={{ width: "62%",  height: 8, borderRadius: 4, background: "#171b28" }} />
      </div>
    </div>
  );
}

export function LinkedInAppShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#0d1117",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.02), 0 32px 80px rgba(0,0,0,0.65)",
      }}
    >
      {/* ── LinkedIn Top Nav ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "#141926",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* "in" logo */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 5,
            background: "#0A66C2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 900,
              color: "#fff",
              fontFamily: "Georgia, serif",
              lineHeight: 1,
              paddingTop: 2,
            }}
          >
            in
          </span>
        </div>

        {/* Search bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            height: 30,
            borderRadius: 5,
            padding: "0 10px",
            background: "#1e2436",
            flex: 1,
            maxWidth: 170,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{ width: 12, height: 12, flexShrink: 0 }}
            fill="none"
            stroke="#556"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span style={{ fontSize: 11, color: "#445", lineHeight: 1 }}>
            Pesquisar
          </span>
        </div>

        {/* Nav icons */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* Home — active */}
          <svg
            viewBox="0 0 24 24"
            style={{ width: 20, height: 20, color: "#fff" }}
            fill="currentColor"
          >
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          {/* Network */}
          <svg
            viewBox="0 0 24 24"
            style={{ width: 20, height: 20 }}
            fill="none"
            stroke="#394152"
            strokeWidth="1.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {/* Jobs */}
          <svg
            viewBox="0 0 24 24"
            style={{ width: 20, height: 20 }}
            fill="none"
            stroke="#394152"
            strokeWidth="1.5"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
          {/* Notifications */}
          <svg
            viewBox="0 0 24 24"
            style={{ width: 20, height: 20 }}
            fill="none"
            stroke="#394152"
            strokeWidth="1.5"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
      </div>

      {/* ── Feed ── */}
      <div style={{ padding: "13px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Ghost above */}
        <div
          style={{
            filter: "blur(1.5px)",
            opacity: 0.22,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <LiGhostPost avatarGradient="linear-gradient(135deg,#6C63FF,#3B82F6)" />
        </div>

        {/* Actual post */}
        <div>{children}</div>

        {/* Ghost below */}
        <div
          style={{
            filter: "blur(2.5px)",
            opacity: 0.11,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <LiGhostPost avatarGradient="linear-gradient(135deg,#22C55E,#059669)" />
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp App Shell ───────────────────────────────────────────────────────

export function WhatsAppAppShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#0a1929",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 14px",
          background: "#182033",
          borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
          WhatsApp
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }} fill="none" stroke="#5a6a7a" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }} fill="none" stroke="#5a6a7a" strokeWidth="1.5">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </div>
      </div>

      {/* Chat header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          background: "#111e2e",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill="none" stroke="#6b7280" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#196FA8,#F2A82A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          IX
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", lineHeight: 1.2 }}>
            IntelliX.AI
          </div>
          <div style={{ fontSize: 10, color: "#25D366", lineHeight: 1.3 }}>online</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }} fill="none" stroke="#5a6a7a" strokeWidth="1.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.37a2 2 0 0 1 1.49-2.05L5.12.32a2 2 0 0 1 2 1.22l.87 2.12a2 2 0 0 1-.46 2.27l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.27-.46l2.12.87a2 2 0 0 1 1.22 2.01z" />
          </svg>
          <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }} fill="none" stroke="#5a6a7a" strokeWidth="1.5">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </div>
      </div>

      {/* Chat body */}
      <div style={{ padding: "10px 12px", background: "#0b1829" }}>
        {children}
      </div>
    </div>
  );
}

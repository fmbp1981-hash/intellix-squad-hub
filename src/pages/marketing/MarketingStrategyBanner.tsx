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
        const current = counts[pt.platform as keyof typeof counts] ?? 0;
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

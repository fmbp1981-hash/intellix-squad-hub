// src/pages/marketing/MarketingCalendar.tsx
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MarketingDraft } from "@/hooks/useMarketingDrafts";

const PILAR_COLORS: Record<string, string> = {
  resultado_ia:     "oklch(0.72 0.14 160)",
  educacao_pratica: "oklch(0.70 0.14 240)",
  bastidores:       "oklch(0.72 0.16 262)",
  posicionamento:   "oklch(0.80 0.14 38)",
  comercial:        "oklch(0.72 0.16 15)",
};

const PLATFORM_DISPLAY: Record<string, string> = {
  linkedin:  "LI",
  instagram: "IG",
  whatsapp:  "WA",
};

interface MarketingCalendarProps {
  drafts: MarketingDraft[];
  selectedId: string | null;
  onSelectDraft: (draft: MarketingDraft) => void;
}

interface DayChipProps {
  draft: MarketingDraft;
  isSelected: boolean;
  onClick: () => void;
}

function DayChip({ draft, isSelected, onClick }: DayChipProps) {
  const color = PILAR_COLORS[draft.pilar] ?? "oklch(0.65 0.02 250)";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-all hover:opacity-90"
      style={{
        background: isSelected ? `${color.replace(")", " / 0.25)")}` : `${color.replace(")", " / 0.12)")}`,
        border: isSelected ? `1px solid ${color}` : "1px solid transparent",
      }}
    >
      <span className="text-[8px] font-bold shrink-0" style={{ color: "oklch(0.60 0.02 250)" }}>
        {PLATFORM_DISPLAY[draft.platform]}
      </span>
      <span className="truncate text-[9px] font-medium" style={{ color }}>
        {draft.title}
      </span>
    </button>
  );
}

export function MarketingCalendar({ drafts, selectedId, onSelectDraft }: MarketingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const scheduledDrafts = useMemo(
    () => drafts.filter((d) => d.scheduled_for && d.status !== "rejected"),
    [drafts]
  );

  const unscheduled = useMemo(
    () => drafts.filter((d) => !d.scheduled_for && d.status !== "rejected" && d.status !== "published"),
    [drafts]
  );

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDayDrafts = (day: Date) =>
    scheduledDrafts.filter((d) => d.scheduled_for && isSameDay(new Date(d.scheduled_for), day));

  const today = new Date();
  const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex gap-4 h-full">
      {/* Calendar grid */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-md p-1.5 transition-colors hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: "oklch(0.55 0.02 250)" }} />
          </button>
          <span className="text-[13px] font-semibold text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-md p-1.5 transition-colors hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" style={{ color: "oklch(0.55 0.02 250)" }} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium" style={{ color: "oklch(0.48 0.02 250)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px" style={{ background: "oklch(0.20 0.01 250)" }}>
          {calendarDays.map((day) => {
            const dayDrafts = getDayDrafts(day);
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={day.toISOString()}
                className="min-h-[80px] p-1.5 space-y-1"
                style={{
                  background: isToday ? "oklch(0.18 0.02 262)" : "oklch(0.145 0.01 250)",
                  opacity: isCurrentMonth ? 1 : 0.4,
                }}
              >
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium"
                  style={{
                    background: isToday ? "oklch(0.52 0.18 262)" : "transparent",
                    color: isToday ? "white" : isCurrentMonth ? "oklch(0.75 0.02 250)" : "oklch(0.48 0.02 250)",
                  }}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayDrafts.slice(0, 3).map((draft) => (
                    <DayChip
                      key={draft.id}
                      draft={draft}
                      isSelected={selectedId === draft.id}
                      onClick={() => onSelectDraft(draft)}
                    />
                  ))}
                  {dayDrafts.length > 3 && (
                    <p className="text-[8px] pl-1" style={{ color: "oklch(0.48 0.02 250)" }}>
                      +{dayDrafts.length - 3} mais
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled sidebar */}
      {unscheduled.length > 0 && (
        <div className="w-44 shrink-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.48 0.02 250)" }}>
            Não agendado ({unscheduled.length})
          </p>
          <div className="space-y-1.5">
            {unscheduled.map((draft) => {
              const color = PILAR_COLORS[draft.pilar] ?? "oklch(0.65 0.02 250)";
              return (
                <button
                  key={draft.id}
                  onClick={() => onSelectDraft(draft)}
                  className="w-full rounded-lg p-2 text-left transition-all"
                  style={{
                    background: selectedId === draft.id ? "oklch(0.18 0.02 262)" : "oklch(0.16 0.01 250)",
                    border: selectedId === draft.id ? "1px solid oklch(0.52 0.18 262)" : "1px solid oklch(0.22 0.01 250)",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    <p className="line-clamp-2 text-[10px] font-medium" style={{ color: "oklch(0.70 0.02 250)" }}>
                      {draft.title}
                    </p>
                  </div>
                  <p className="mt-1 text-[9px]" style={{ color: "oklch(0.48 0.02 250)" }}>
                    {PLATFORM_DISPLAY[draft.platform]} · {draft.status === "idea_pending" ? "Ideia" : draft.status === "generated" ? "Gerado" : "Aprovado"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Calendar, LayoutGrid, List,
  Linkedin, Instagram,
} from "lucide-react";
import {
  useMarketingDrafts,
  useMarketingDraftCounts,
  type MarketingStatus,
  type MarketingPlatform,
  type MarketingPilar,
  type MarketingDraft,
} from "@/hooks/useMarketingDrafts";
import { MarketingProposeDialog } from "./MarketingProposeDialog";
import { MarketingPostPanel } from "./MarketingPostPanel";
import { MarketingCalendar } from "./MarketingCalendar";
import { MarketingGridView } from "./MarketingGridView";
import { MarketingListView } from "./MarketingListView";

type ViewMode = "calendar" | "grid" | "list";

const STATUS_OPTIONS: { value: MarketingStatus | "all"; label: string }[] = [
  { value: "all",          label: "Todos"      },
  { value: "idea_pending", label: "Ideias"     },
  { value: "generated",    label: "Gerados"    },
  { value: "approved",     label: "Aprovados"  },
  { value: "published",    label: "Publicados" },
  { value: "rejected",     label: "Rejeitados" },
];

const PILAR_OPTIONS: { value: MarketingPilar | "all"; label: string }[] = [
  { value: "all",               label: "Todos os pilares"  },
  { value: "resultado_ia",      label: "Resultado IA"      },
  { value: "educacao_pratica",  label: "Educação"          },
  { value: "bastidores",        label: "Bastidores"        },
  { value: "posicionamento",    label: "Posicionamento"    },
  { value: "comercial",         label: "Comercial"         },
];

const STATUS_DOT_COLORS: Record<string, string> = {
  all:          "oklch(0.55 0.02 250)",
  idea_pending: "oklch(0.78 0.14 60)",
  generated:    "oklch(0.70 0.14 240)",
  approved:     "oklch(0.68 0.18 145)",
  published:    "oklch(0.72 0.14 160)",
  rejected:     "oklch(0.72 0.16 15)",
};

export default function MarketingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<MarketingStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<MarketingPlatform | "all">("all");
  const [pilarFilter, setPilarFilter] = useState<MarketingPilar | "all">("all");
  const [selectedDraft, setSelectedDraft] = useState<MarketingDraft | null>(null);
  const [showPropose, setShowPropose] = useState(false);

  const { data: allDrafts = [], isLoading } = useMarketingDrafts();
  const { data: counts } = useMarketingDraftCounts();

  const filteredDrafts = useMemo(() => {
    return allDrafts.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (platformFilter !== "all" && d.platform !== platformFilter) return false;
      if (pilarFilter !== "all" && d.pilar !== pilarFilter) return false;
      return true;
    });
  }, [allDrafts, statusFilter, platformFilter, pilarFilter]);

  const handleSelectDraft = (draft: MarketingDraft) => {
    setSelectedDraft((prev) => (prev?.id === draft.id ? null : draft));
  };

  const syncedSelectedDraft = selectedDraft
    ? (allDrafts.find((d) => d.id === selectedDraft.id) ?? null)
    : null;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex w-52 shrink-0 flex-col gap-5 overflow-y-auto p-4"
        style={{ borderRight: "1px solid oklch(0.20 0.01 250)" }}
      >
        <div className="space-y-2">
          <h1 className="text-[14px] font-bold tracking-tight text-foreground">Marketing</h1>
          <Button
            size="sm"
            onClick={() => setShowPropose(true)}
            className="w-full h-8 gap-1.5 text-[11px] justify-start"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
              color: "white",
              border: "none",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Propor tema
          </Button>
        </div>

        {/* View mode toggle */}
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.01 250)" }}>
            Visualização
          </p>
          {(
            [
              { mode: "calendar" as ViewMode, icon: Calendar,   label: "Calendário" },
              { mode: "grid"     as ViewMode, icon: LayoutGrid, label: "Grade"      },
              { mode: "list"     as ViewMode, icon: List,       label: "Lista"      },
            ] as const
          ).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-all"
              style={{
                background: viewMode === mode ? "oklch(0.22 0.02 262)" : "transparent",
                color: viewMode === mode ? "oklch(0.72 0.16 262)" : "oklch(0.55 0.02 250)",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.01 250)" }}>
            Status
          </p>
          {STATUS_OPTIONS.map((opt) => {
            const count = opt.value === "all"
              ? allDrafts.length
              : (counts?.[opt.value as MarketingStatus] ?? 0);
            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all"
                style={{
                  background: statusFilter === opt.value ? "oklch(0.20 0.01 250)" : "transparent",
                  color: statusFilter === opt.value ? "oklch(0.80 0.02 250)" : "oklch(0.52 0.02 250)",
                }}
              >
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: STATUS_DOT_COLORS[opt.value] }}
                />
                <span className="flex-1 text-left">{opt.label}</span>
                {count > 0 && (
                  <span className="text-[9px]" style={{ color: "oklch(0.45 0.02 250)" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Platform filter */}
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.01 250)" }}>
            Plataforma
          </p>
          {(
            [
              { value: "all" as const,      label: "Todas",     icon: null      },
              { value: "linkedin" as const,  label: "LinkedIn",  icon: Linkedin  },
              { value: "instagram" as const, label: "Instagram", icon: Instagram },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setPlatformFilter(value)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all"
              style={{
                background: platformFilter === value ? "oklch(0.20 0.01 250)" : "transparent",
                color: platformFilter === value ? "oklch(0.80 0.02 250)" : "oklch(0.52 0.02 250)",
              }}
            >
              {Icon ? <Icon className="h-3 w-3" /> : <div className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>

        {/* Pilar filter */}
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.01 250)" }}>
            Pilar
          </p>
          {PILAR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPilarFilter(opt.value)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all text-left"
              style={{
                background: pilarFilter === opt.value ? "oklch(0.20 0.01 250)" : "transparent",
                color: pilarFilter === opt.value ? "oklch(0.80 0.02 250)" : "oklch(0.52 0.02 250)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid oklch(0.20 0.01 250)" }}
        >
          <p className="text-[12px] font-medium text-foreground">
            {filteredDrafts.length} post{filteredDrafts.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* View content */}
        <div className="flex-1 overflow-y-auto p-5">
          {viewMode === "calendar" ? (
            <MarketingCalendar
              drafts={filteredDrafts}
              selectedId={syncedSelectedDraft?.id ?? null}
              onSelectDraft={handleSelectDraft}
            />
          ) : viewMode === "grid" ? (
            <MarketingGridView
              drafts={filteredDrafts}
              isLoading={isLoading}
              selectedId={syncedSelectedDraft?.id ?? null}
              onSelectDraft={handleSelectDraft}
            />
          ) : (
            <MarketingListView
              drafts={filteredDrafts}
              isLoading={isLoading}
              selectedId={syncedSelectedDraft?.id ?? null}
              statusFilter={statusFilter}
              onSelectDraft={handleSelectDraft}
            />
          )}
        </div>
      </main>

      {/* ── Right Detail Panel ────────────────────────────────────── */}
      {syncedSelectedDraft && (
        <aside className="w-80 shrink-0 xl:w-96 overflow-hidden">
          <MarketingPostPanel
            draft={syncedSelectedDraft}
            onClose={() => setSelectedDraft(null)}
          />
        </aside>
      )}

      {/* Propose Dialog */}
      <MarketingProposeDialog open={showPropose} onClose={() => setShowPropose(false)} />
    </div>
  );
}

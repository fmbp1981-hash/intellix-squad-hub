import { Loader2 } from "lucide-react";
import type { MarketingDraft } from "@/hooks/useMarketingDrafts";
import { GridCard } from "./MarketingDraftCard";

interface MarketingGridViewProps {
  drafts: MarketingDraft[];
  isLoading: boolean;
  selectedId: string | null;
  onSelectDraft: (draft: MarketingDraft) => void;
}

export function MarketingGridView({ drafts, isLoading, selectedId, onSelectDraft }: MarketingGridViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "oklch(0.55 0.02 250)" }} />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <p className="py-16 text-center text-[13px]" style={{ color: "oklch(0.48 0.02 250)" }}>
        Nenhum post encontrado.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {drafts.map((draft) => (
        <GridCard
          key={draft.id}
          draft={draft}
          isSelected={selectedId === draft.id}
          onClick={() => onSelectDraft(draft)}
        />
      ))}
    </div>
  );
}

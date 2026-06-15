import { Loader2 } from "lucide-react";
import type { MarketingDraft, MarketingStatus } from "@/hooks/useMarketingDrafts";
import { ListCard } from "./MarketingDraftCard";

interface MarketingListViewProps {
  drafts: MarketingDraft[];
  isLoading: boolean;
  selectedId: string | null;
  statusFilter: MarketingStatus | "all";
  onSelectDraft: (draft: MarketingDraft) => void;
}

export function MarketingListView({ drafts, isLoading, selectedId, statusFilter, onSelectDraft }: MarketingListViewProps) {
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
    <div className="space-y-2">
      {drafts.map((draft) => (
        <ListCard
          key={draft.id}
          draft={draft}
          isSelected={selectedId === draft.id}
          onClick={() => onSelectDraft(draft)}
        />
      ))}
    </div>
  );
}

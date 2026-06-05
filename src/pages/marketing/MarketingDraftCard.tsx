import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RefreshCw, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useApproveDraft,
  useRejectDraft,
  useMarkPublished,
  useRegenerateDraft,
  type MarketingDraft,
} from "@/hooks/useMarketingDrafts";

const PILAR_LABELS: Record<string, string> = {
  resultado_ia: "Resultado IA",
  educacao_pratica: "Educação",
  bastidores: "Bastidores",
  posicionamento: "Posicionamento",
  comercial: "Comercial",
};

const PILAR_COLORS: Record<string, string> = {
  resultado_ia: "hsl(160 84% 39% / 0.15)",
  educacao_pratica: "hsl(217 91% 60% / 0.15)",
  bastidores: "hsl(262 83% 58% / 0.15)",
  posicionamento: "hsl(38 92% 50% / 0.15)",
  comercial: "hsl(0 84% 60% / 0.15)",
};

interface Props {
  draft: MarketingDraft;
}

export function MarketingDraftCard({ draft }: Props) {
  const [expanded, setExpanded] = useState(false);
  const approve = useApproveDraft();
  const reject = useRejectDraft();
  const markPublished = useMarkPublished();
  const regenerate = useRegenerateDraft();

  const isLoading =
    approve.isPending || reject.isPending || markPublished.isPending || regenerate.isPending;

  const previewText = draft.content.slice(0, 200);
  const hasMore = draft.content.length > 200;

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold leading-snug">{draft.title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              className="text-[10px] font-medium"
              style={{ background: PILAR_COLORS[draft.pilar], border: "none" }}
            >
              {PILAR_LABELS[draft.pilar]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {draft.platform}
            </Badge>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true, locale: ptBR })}
          {draft.trigger_mode === "manual" && (
            <span className="ml-1.5 text-primary">· manual</span>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {draft.image_url && (
          <img
            src={draft.image_url}
            alt={draft.title}
            className="w-full rounded-md object-cover"
            style={{ maxHeight: 220 }}
          />
        )}

        <div className="rounded-md bg-muted/40 p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {expanded ? draft.content : previewText}
            {!expanded && hasMore && "..."}
          </p>
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "ver menos" : "ver mais"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {draft.status === "generated" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => regenerate.mutate({ draft })}
                className="text-xs"
              >
                <RefreshCw className={`mr-1 h-3 w-3 ${regenerate.isPending ? "animate-spin" : ""}`} />
                Regerar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => reject.mutate(draft.id)}
                className="text-xs text-destructive hover:text-destructive"
              >
                <XCircle className="mr-1 h-3 w-3" />
                Rejeitar
              </Button>
              <Button
                size="sm"
                disabled={isLoading}
                onClick={() => approve.mutate(draft.id)}
                className="ml-auto text-xs"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                {approve.isPending ? "Aprovando..." : "Aprovar"}
              </Button>
            </>
          )}

          {draft.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => markPublished.mutate(draft.id)}
              className="ml-auto text-xs"
            >
              <Upload className="mr-1 h-3 w-3" />
              {markPublished.isPending ? "Salvando..." : "Marcar como publicado"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

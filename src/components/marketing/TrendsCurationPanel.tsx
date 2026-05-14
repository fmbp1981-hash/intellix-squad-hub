import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star, TrendingUp } from "lucide-react";

interface CuratedItem {
  id: string;
  titulo_original: string;
  url?: string;
  fonte?: string;
  relevancia_score?: number;
  categoria?: string;
  angulo_editorial?: string;
  potencial_engajamento?: string;
  formato_sugerido?: string;
  is_top_5_semana?: boolean;
  is_viral_candidate?: boolean;
}

interface TrendsCurationPanelProps {
  items: CuratedItem[];
  loading?: boolean;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return "text-success";
  if (score >= 6) return "text-warning";
  return "text-muted-foreground";
};

export function TrendsCurationPanel({ items, loading }: TrendsCurationPanelProps) {
  if (loading) return <p className="text-sm text-muted-foreground">Carregando curadoria…</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Nenhum item curado ainda. Inicie a pesquisa semanal.</p>;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "rounded-xl border border-border bg-card p-4 transition-colors",
            item.is_top_5_semana && "border-success/30 bg-success/5",
          )}
        >
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <p className="flex-1 text-sm font-medium text-foreground leading-snug">{item.titulo_original}</p>
            <div className="flex shrink-0 items-center gap-1">
              {item.is_top_5_semana    && <Star  className="h-3.5 w-3.5 text-warning fill-warning" />}
              {item.is_viral_candidate && <TrendingUp className="h-3.5 w-3.5 text-primary" />}
              {item.relevancia_score && (
                <span className={cn("text-xs font-bold", SCORE_COLOR(item.relevancia_score))}>
                  {item.relevancia_score}/10
                </span>
              )}
            </div>
          </div>
          {item.angulo_editorial && (
            <p className="mb-2 text-xs text-muted-foreground italic">{item.angulo_editorial}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {item.fonte && (
              <Badge variant="secondary" className="text-[10px]">{item.fonte}</Badge>
            )}
            {item.categoria && (
              <Badge variant="outline" className="text-[10px]">{item.categoria.replace(/_/g, " ")}</Badge>
            )}
            {item.potencial_engajamento && (
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px]">{item.potencial_engajamento}</Badge>
            )}
            {item.formato_sugerido && (
              <Badge variant="outline" className="text-[10px]">{item.formato_sugerido}</Badge>
            )}
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline-offset-2 hover:underline">
                fonte ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

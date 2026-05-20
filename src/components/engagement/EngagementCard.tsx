import { ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface EngagementCardData {
  id: string;
  client_name: string;
  title?: string | null;
  esp_type?: string | null;       // engagement_type enum
  status?: string | null;
  progress?: number;              // 0..100
  next_gate?: string | null;
  eta?: string | null;            // ISO date
  owner?: string | null;
  active_module_codes?: string[]; // ['A','B','C','D','E']
}

const TYPE_LABEL: Record<string, string> = {
  consulting: "Consultoria",
  agent: "Agente IA",
  automation: "Automação",
  product: "Produto",
  hybrid: "Híbrido",
  undetermined: "A definir",
};

const TYPE_COLOR: Record<string, string> = {
  consulting: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  agent: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  automation: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  product: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  hybrid: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  undetermined: "bg-muted text-muted-foreground border-muted-foreground/20",
};

export function EngagementCard({
  e,
  onClick,
}: {
  e: EngagementCardData;
  onClick?: () => void;
}) {
  const typeKey = (e.esp_type ?? "undetermined").toLowerCase();
  const typeLabel = TYPE_LABEL[typeKey] ?? typeKey;
  const typeColor = TYPE_COLOR[typeKey] ?? TYPE_COLOR.undetermined;
  const progress = Math.max(0, Math.min(100, e.progress ?? 0));

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-stretch gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{e.client_name}</p>
            {e.title && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.title}</p>
            )}
          </div>
          <Badge variant="outline" className={cn("shrink-0 text-[10px]", typeColor)}>
            {typeLabel}
          </Badge>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{e.next_gate ?? "Próximo gate: —"}</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            {(e.active_module_codes ?? []).map((m) => (
              <span
                key={m}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold"
                title={`Módulo ESP ${m}`}
              >
                {m}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {e.owner && <span>{e.owner}</span>}
            {e.eta && <span>ETA {new Date(e.eta).toLocaleDateString("pt-BR")}</span>}
          </div>
        </div>
      </div>

      <ChevronRight className="self-center text-muted-foreground/60 transition-colors group-hover:text-foreground" />
    </button>
  );
}

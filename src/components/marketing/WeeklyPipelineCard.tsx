import { cn } from "@/lib/utils";
import { Check, Clock, Loader2 } from "lucide-react";

const STAGES = [
  { key: "pesquisa",  label: "Pesquisa" },
  { key: "curadoria", label: "Curadoria" },
  { key: "pauta",     label: "Pauta" },
  { key: "copy",      label: "Copy" },
  { key: "visual",    label: "Visual" },
  { key: "revisao",   label: "Revisão" },
  { key: "publicado", label: "Publicado" },
] as const;

interface WeeklyPipelineCardProps {
  currentStage?: string;
  completedStages?: string[];
}

export function WeeklyPipelineCard({ currentStage, completedStages = [] }: WeeklyPipelineCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Pipeline da Semana
      </p>
      <div className="flex items-center gap-0">
        {STAGES.map((stage, idx) => {
          const isDone    = completedStages.includes(stage.key);
          const isCurrent = currentStage === stage.key;
          const isPending = !isDone && !isCurrent;

          return (
            <div key={stage.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    isDone    && "border-success bg-success/20 text-success",
                    isCurrent && "border-primary bg-primary/20 text-primary",
                    isPending && "border-border bg-muted/30 text-muted-foreground",
                  )}
                >
                  {isDone    && <Check className="h-4 w-4" />}
                  {isCurrent && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPending && <Clock className="h-3 w-3" />}
                </div>
                <span className={cn("text-[10px] font-medium", isCurrent ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground")}>
                  {stage.label}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div className={cn("h-[2px] flex-1 mb-4", isDone ? "bg-success/40" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

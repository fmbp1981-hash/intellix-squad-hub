import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";

const PILLAR_COLORS: Record<string, string> = {
  P1: "bg-red-500/15 text-red-400 border-red-500/25",
  P2: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  P3: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  P4: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  P5: "bg-orange-500/15 text-orange-400 border-orange-500/25",
};

const STATUS_MAP = {
  draft:    { label: "Rascunho",   icon: Clock,        cls: "bg-muted/50 text-muted-foreground border-border" },
  review:   { label: "Revisão",    icon: Clock,        cls: "bg-warning/15 text-warning border-warning/25" },
  approved: { label: "Aprovado",   icon: CheckCircle2, cls: "bg-success/15 text-success border-success/25" },
  rejected: { label: "Rejeitado",  icon: XCircle,      cls: "bg-destructive/15 text-destructive border-destructive/25" },
} as const;

interface PostCardProps {
  theme: string;
  pillar: string;
  format: string;
  scheduledFor: string;
  status: keyof typeof STATUS_MAP;
  hasCopy?: boolean;
  hasVisual?: boolean;
  onClick?: () => void;
}

export function PostCard({ theme, pillar, format, scheduledFor, status, hasCopy, hasVisual, onClick }: PostCardProps) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.draft;
  const Icon = s.icon;
  const dayName = new Date(scheduledFor).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-accent"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {dayName}
        </div>
        <Badge variant="outline" className={cn("text-[10px]", PILLAR_COLORS[pillar] ?? "")}>{pillar}</Badge>
      </div>
      <p className="mb-3 line-clamp-2 text-sm font-medium text-foreground">{theme}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">{format}</span>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", s.cls)}>
          <Icon className="h-3 w-3" />
          {s.label}
        </span>
      </div>
      {(hasCopy || hasVisual) && (
        <div className="mt-2 flex gap-1">
          {hasCopy   && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Copy ✓</span>}
          {hasVisual && <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] text-secondary">Visual ✓</span>}
        </div>
      )}
    </button>
  );
}

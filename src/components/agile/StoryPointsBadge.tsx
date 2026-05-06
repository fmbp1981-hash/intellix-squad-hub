import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StoryPointsBadge({ points, className }: { points?: number | null; className?: string }) {
  if (points == null) {
    return (
      <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] text-muted-foreground", className)}>
        ?
      </Badge>
    );
  }
  const tone =
    points <= 3
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : points <= 8
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-orange-500/40 bg-orange-500/10 text-orange-400";
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-semibold", tone, className)}>
      {points} pts
    </Badge>
  );
}

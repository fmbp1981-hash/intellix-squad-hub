import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Moscow = "must" | "should" | "could" | "wont";

const labels: Record<Moscow, string> = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
};

const styles: Record<Moscow, string> = {
  must: "border-destructive/40 bg-destructive/10 text-destructive",
  should: "border-primary/40 bg-primary/10 text-primary",
  could: "border-accent/40 bg-accent/10 text-accent-foreground",
  wont: "border-muted bg-muted text-muted-foreground",
};

export function MoSCoWBadge({ value, className }: { value?: Moscow | null; className?: string }) {
  if (!value) return null;
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-medium", styles[value], className)}>
      {labels[value]}
    </Badge>
  );
}

import { cn } from "@/lib/utils";

const FIB = [1, 2, 3, 5, 8, 13, 21] as const;

export function PointsSelector({
  value,
  onChange,
  className,
}: {
  value?: number | null;
  onChange: (n: number | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {FIB.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={cn(
            "h-8 w-10 rounded-md border text-xs font-semibold transition-colors",
            value === n
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

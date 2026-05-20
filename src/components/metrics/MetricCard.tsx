import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { dir: "up" | "down" | "flat"; pct?: number; label?: string };
  chart?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MetricCard({ label, value, hint, trend, chart, onClick, className }: MetricCardProps) {
  const TrendIcon = trend?.dir === "up" ? TrendingUp : trend?.dir === "down" ? TrendingDown : Minus;
  const trendColor =
    trend?.dir === "up" ? "text-emerald-500" :
    trend?.dir === "down" ? "text-rose-500" : "text-muted-foreground";

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-4 transition-all",
        onClick && "cursor-pointer hover:border-primary/40 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {trend && (
          <span className={cn("flex items-center gap-1 text-xs font-semibold", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend.pct !== undefined ? `${trend.pct > 0 ? "+" : ""}${trend.pct}%` : trend.label}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {chart && <div className="mt-3 h-16">{chart}</div>}
    </div>
  );
}

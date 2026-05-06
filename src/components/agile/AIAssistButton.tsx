import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AIAssistButton({
  label,
  onClick,
  loading,
  className,
  size = "sm",
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  className?: string;
  size?: "sm" | "default";
}) {
  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className={cn("gap-2 border-primary/40 text-primary hover:bg-primary/10", className)}
    >
      <Sparkles className={cn("h-4 w-4", loading && "animate-pulse")} />
      {loading ? "Pensando..." : label}
    </Button>
  );
}

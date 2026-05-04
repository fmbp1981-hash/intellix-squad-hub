import logo from "@/assets/intellix-logo-transparent.png";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  variant?: "compact" | "full";
  className?: string;
}

export function BrandLogo({ variant = "full", className }: BrandLogoProps) {
  if (variant === "compact") {
    return (
      <img
        src={logo}
        alt="IntelliX.AI"
        className={cn("h-9 w-9 object-contain", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img src={logo} alt="IntelliX.AI" className="h-10 w-10 object-contain" />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-sm font-semibold text-foreground">
          OpenSquad Platform
        </span>
        <span className="text-[11px] text-muted-foreground">
          IntelliX.AI · Consultoria Inteligente
        </span>
      </div>
    </div>
  );
}

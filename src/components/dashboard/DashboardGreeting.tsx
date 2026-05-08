import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles } from "lucide-react";

const greeting = (h: number) =>
  h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

export function DashboardGreeting() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const name =
    (user?.user_metadata as Record<string, unknown>)?.full_name as string ||
    user?.email?.split("@")[0] ||
    "Felipe";

  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const timeStr = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fade-in-up flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary opacity-70" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Cockpit executivo
          </p>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {greeting(now.getHours())},{" "}
          <span className="text-gradient-brand">{name}</span>
        </h1>

        <p className="text-sm text-muted-foreground">
          Visão em tempo real — squads, pipeline e projetos da IntelliX.AI
        </p>
      </div>

      <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-0.5">
        <p className="font-mono text-xl font-semibold text-foreground md:text-2xl">
          {timeStr}
        </p>
        <p className="text-[11px] capitalize text-muted-foreground">{dateStr}</p>
      </div>
    </div>
  );
}

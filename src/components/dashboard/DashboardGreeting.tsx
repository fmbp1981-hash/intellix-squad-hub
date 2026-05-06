import { useAuth } from "@/hooks/useAuth";

const HOURS_GREETING = (h: number) =>
  h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

export function DashboardGreeting() {
  const { user } = useAuth();
  const now = new Date();
  const greeting = HOURS_GREETING(now.getHours());
  const name =
    (user?.user_metadata as any)?.full_name ||
    user?.email?.split("@")[0] ||
    "Felipe";
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {greeting}, {name}! ☀️
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão executiva da IntelliX em tempo real
        </p>
      </div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {dateStr} — {timeStr}
      </p>
    </div>
  );
}

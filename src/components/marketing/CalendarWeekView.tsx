import { PostCard } from "./PostCard";
import type { useContentCalendar } from "@/hooks/useContentCalendar";

type CalendarItem = ReturnType<typeof useContentCalendar>["query"]["data"] extends (infer T)[] | undefined ? T : never;

interface CalendarWeekViewProps {
  items: any[];
  onPostClick?: (id: string) => void;
}

const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function CalendarWeekView({ items, onPostClick }: CalendarWeekViewProps) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <p className="text-sm text-muted-foreground">Sem pautas para essa semana.</p>
        <p className="mt-1 text-xs text-muted-foreground">Inicie a pesquisa semanal para gerar o calendário.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <PostCard
          key={item.id}
          theme={item.theme}
          pillar={item.pillar}
          format={item.format}
          scheduledFor={item.scheduled_for}
          status={item.status}
          onClick={() => onPostClick?.(item.id)}
        />
      ))}
    </div>
  );
}

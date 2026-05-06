import { DirectiveCard } from "./DirectiveCard";
import type { GestaoDirective } from "@/types";

const COLUMNS: Array<{ key: GestaoDirective["status"]; label: string }> = [
  { key: "pending", label: "Pendentes" },
  { key: "dispatched", label: "Despachadas" },
  { key: "completed", label: "Concluídas" },
  { key: "cancelled", label: "Canceladas" },
];

export function DirectiveKanban({ directives }: { directives: GestaoDirective[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const items = directives.filter((d) => d.status === col.key);
        return (
          <div key={col.key} className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {col.label}
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </h3>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4">Vazio</p>
              ) : (
                items.map((d) => <DirectiveCard key={d.id} directive={d} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface InvestState {
  invest_independent: boolean;
  invest_negotiable: boolean;
  invest_valuable: boolean;
  invest_estimable: boolean;
  invest_small: boolean;
  invest_testable: boolean;
}

const FIELDS: { key: keyof InvestState; label: string }[] = [
  { key: "invest_independent", label: "Independent" },
  { key: "invest_negotiable", label: "Negotiable" },
  { key: "invest_valuable", label: "Valuable" },
  { key: "invest_estimable", label: "Estimable" },
  { key: "invest_small", label: "Small" },
  { key: "invest_testable", label: "Testable" },
];

export function investScore(state: Partial<InvestState>): number {
  return FIELDS.reduce((acc, f) => acc + (state[f.key] ? 1 : 0), 0);
}

export function INVESTBar({ state, className }: { state: Partial<InvestState>; className?: string }) {
  const score = investScore(state);
  const ready = score >= 4;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-3 rounded-full",
              i < score ? (ready ? "bg-emerald-500" : "bg-orange-500") : "bg-muted"
            )}
          />
        ))}
      </div>
      <span className={cn("text-[10px] font-medium", ready ? "text-emerald-400" : "text-orange-400")}>
        {score}/6
      </span>
    </div>
  );
}

export function INVESTChecker({
  value,
  onChange,
}: {
  value: Partial<InvestState>;
  onChange: (next: InvestState) => void;
}) {
  const score = investScore(value);
  const ready = score >= 4;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">INVEST</span>
        <span className={cn("text-xs font-semibold", ready ? "text-emerald-400" : "text-orange-400")}>
          {score}/6 — {ready ? "Pode entrar no Sprint" : "Precisa refinamento"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!value[f.key]}
              onCheckedChange={(checked) =>
                onChange({
                  invest_independent: !!value.invest_independent,
                  invest_negotiable: !!value.invest_negotiable,
                  invest_valuable: !!value.invest_valuable,
                  invest_estimable: !!value.invest_estimable,
                  invest_small: !!value.invest_small,
                  invest_testable: !!value.invest_testable,
                  [f.key]: !!checked,
                } as InvestState)
              }
            />
            <span>{f.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

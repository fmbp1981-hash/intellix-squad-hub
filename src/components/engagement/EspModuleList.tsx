import { CheckCircle2, Circle, AlertCircle, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type EspModuleStatus = "not_started" | "drafting" | "review" | "approved" | "needs_revision";
export type EspModuleCode = "A" | "B" | "C" | "D" | "E";

export interface EspModule {
  module_code: EspModuleCode;
  required: boolean;
  status: EspModuleStatus;
  produced_by_agent?: string | null;
  approved_by_agent?: string | null;
  artifact_url?: string | null;
}

const MODULE_NAMES: Record<EspModuleCode, string> = {
  A: "Estratégia + Diagnóstico",
  B: "Agente IA",
  C: "Automação + Integração",
  D: "Produto / SaaS",
  E: "Brief Executivo + Roadmap",
};

const STATUS_META: Record<EspModuleStatus, { label: string; icon: any; className: string }> = {
  not_started:    { label: "Não iniciado", icon: Circle,        className: "text-muted-foreground" },
  drafting:       { label: "Em rascunho",  icon: Loader2,       className: "text-amber-400 animate-spin" },
  review:         { label: "Em revisão",   icon: FileText,      className: "text-blue-400" },
  approved:       { label: "Aprovado",     icon: CheckCircle2,  className: "text-emerald-400" },
  needs_revision: { label: "Revisar",      icon: AlertCircle,   className: "text-rose-400" },
};

export function EspModuleList({ modules, onOpenModule }: { modules: EspModule[]; onOpenModule?: (code: EspModuleCode) => void }) {
  if (modules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Nenhum módulo ESP ativo ainda.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {modules.map((m) => {
        const meta = STATUS_META[m.status];
        const Icon = meta.icon;
        return (
          <li key={m.module_code}>
            <button
              type="button"
              onClick={() => onOpenModule?.(m.module_code)}
              className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-all hover:border-primary/40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-sm font-bold">
                {m.module_code}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{MODULE_NAMES[m.module_code]}</p>
                  {m.required && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
                      Obrig.
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.produced_by_agent ?? "Sem owner"}
                  {m.approved_by_agent && ` · aprovado por ${m.approved_by_agent}`}
                </p>
              </div>
              <span className={cn("flex items-center gap-1.5 text-xs font-medium", meta.className)}>
                <Icon className="h-4 w-4" />
                {meta.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

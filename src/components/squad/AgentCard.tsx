import { cn } from "@/lib/utils";

export type AgentStatus = "working" | "idle" | "blocked" | "off";

export interface AgentCardData {
  id: string;
  name: string;
  role?: string | null;
  status: AgentStatus;
  current_engagement?: string | null;
  current_job?: string | null;
  tokens_today?: number;
  duration_label?: string | null;
  llm_model?: string | null;
}

const STATUS_META: Record<AgentStatus, { label: string; dot: string; ring: string }> = {
  working: { label: "Trabalhando", dot: "bg-emerald-500", ring: "ring-emerald-500/30 border-emerald-500/40" },
  idle:    { label: "Disponível",  dot: "bg-sky-500",     ring: "ring-sky-500/30 border-sky-500/40" },
  blocked: { label: "Bloqueado",   dot: "bg-amber-500",   ring: "ring-amber-500/30 border-amber-500/40" },
  off:     { label: "Offline",     dot: "bg-zinc-500",    ring: "ring-zinc-500/20 border-border" },
};

export function AgentCard({ agent, onClick }: { agent: AgentCardData; onClick?: () => void }) {
  const meta = STATUS_META[agent.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:ring-2",
        meta.ring
      )}
    >
      <div className="flex w-full items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
        <p className="flex-1 truncate text-sm font-semibold text-foreground">{agent.name}</p>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </span>
      </div>

      {agent.role && <p className="truncate text-[11px] text-muted-foreground">{agent.role}</p>}

      <div className="mt-1 w-full space-y-0.5 text-[11px] text-muted-foreground">
        {agent.current_engagement && (
          <p className="truncate">↳ {agent.current_engagement}</p>
        )}
        {agent.current_job && (
          <p className="truncate font-medium text-foreground/80">{agent.current_job}</p>
        )}
      </div>

      <div className="mt-1 flex w-full items-center justify-between text-[10px] text-muted-foreground">
        <span>{agent.llm_model ?? "—"}</span>
        <span>
          {agent.tokens_today != null ? `${agent.tokens_today.toLocaleString("pt-BR")} tk` : ""}
          {agent.duration_label ? ` · ${agent.duration_label}` : ""}
        </span>
      </div>
    </button>
  );
}

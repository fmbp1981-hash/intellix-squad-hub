import { Check, Loader2, Pause, Send } from 'lucide-react';
import type { AgentState, AgentStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS: Record<
  AgentStatus,
  { label: string; classes: string; icon?: React.ComponentType<{ className?: string }> }
> = {
  idle:       { label: 'Aguardando', classes: 'bg-muted text-muted-foreground border-border' },
  working:    { label: 'Trabalhando', classes: 'bg-primary/15 text-primary border-primary/30', icon: Loader2 },
  done:       { label: 'Concluído', classes: 'bg-success/15 text-success border-success/30', icon: Check },
  checkpoint: { label: 'Checkpoint', classes: 'bg-warning/15 text-warning border-warning/30', icon: Pause },
  delivering: { label: 'Entregando', classes: 'bg-secondary/15 text-secondary border-secondary/30', icon: Send },
};

export function AgentList({ agents }: { agents: AgentState[] }) {
  if (agents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aguardando agentes do squad…</p>
    );
  }

  return (
    <ul className="space-y-2">
      {agents.map((a) => {
        const s = STATUS[a.status];
        const Icon = s.icon;
        return (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-base">
                {a.icon}
              </span>
              <div>
                <p className="font-display text-sm font-medium text-foreground">{a.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{a.gender === 'female' ? 'Agente' : 'Agente'}</p>
              </div>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                s.classes,
              )}
            >
              {Icon && (
                <Icon className={cn('h-3 w-3', a.status === 'working' && 'animate-spin')} />
              )}
              {s.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

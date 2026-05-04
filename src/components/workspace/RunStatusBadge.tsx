import type { RunStatus } from '@/types';
import { cn } from '@/lib/utils';

const STYLES: Record<RunStatus, { label: string; classes: string; pulse?: boolean }> = {
  pending:   { label: 'Pendente',   classes: 'bg-muted text-muted-foreground border-border' },
  running:   { label: 'Em execução', classes: 'bg-primary/15 text-primary border-primary/30', pulse: true },
  completed: { label: 'Concluído',  classes: 'bg-success/15 text-success border-success/30' },
  failed:    { label: 'Falhou',     classes: 'bg-destructive/15 text-destructive border-destructive/30' },
};

interface Props {
  status: RunStatus;
  className?: string;
}

export function RunStatusBadge({ status, className }: Props) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        s.classes,
        className,
      )}
    >
      {s.pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
      {s.label}
    </span>
  );
}

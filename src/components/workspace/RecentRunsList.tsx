import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AVAILABLE_SQUADS, type SquadRun } from '@/types';
import { RunStatusBadge } from './RunStatusBadge';

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function squadLabel(name: string): string {
  return AVAILABLE_SQUADS.find((s) => s.id === name)?.label ?? name;
}

interface Props {
  workspaceId: string;
  runs: SquadRun[];
}

export function RecentRunsList({ workspaceId, runs }: Props) {
  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Nenhum run executado ainda.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {runs.map((run) => (
        <li key={run.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <RunStatusBadge status={run.status} />
              <span className="truncate font-display text-sm font-medium text-foreground">
                {squadLabel(run.squad_name)}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {dateFmt.format(new Date(run.started_at ?? run.created_at))}
            </p>
          </div>

          {run.status === 'completed' && (
            <Link
              to={`/workspaces/${workspaceId}/runs/${run.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver output <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

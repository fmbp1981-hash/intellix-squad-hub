import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type { Workspace } from '@/types';
import type { RunsSummary } from '@/lib/supabase/workspaces';
import { RunStatusBadge } from './RunStatusBadge';

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

interface Props {
  workspace: Workspace;
  summary?: RunsSummary;
}

export function WorkspaceCard({ workspace, summary }: Props) {
  return (
    <Link
      to={`/workspaces/${workspace.id}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted hover:shadow-brand"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        {summary?.latestStatus ? (
          <RunStatusBadge status={summary.latestStatus} />
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            Sem runs
          </span>
        )}

        {workspace.drive_folder_url && (
          <a
            href={workspace.drive_folder_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Abrir pasta no Google Drive"
            className="text-secondary transition-colors hover:text-secondary/80"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <h3 className="font-display text-base font-semibold text-foreground">
        {workspace.client_name}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
        {workspace.engagement_name}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>Criado em {dateFmt.format(new Date(workspace.created_at))}</span>
        <span className="font-mono">{summary?.total ?? 0} run{(summary?.total ?? 0) === 1 ? '' : 's'}</span>
      </div>
    </Link>
  );
}

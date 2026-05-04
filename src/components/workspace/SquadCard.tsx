import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  workspaceId: string;
  squadId: string;
  label: string;
  icon: string;
  color: string;
}

export function SquadCard({ workspaceId, squadId, label, icon, color }: Props) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5"
      style={{ borderColor: `${color}55` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {icon}
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">{label}</h4>
          <p className="text-[11px] text-muted-foreground">Squad OpenSquad</p>
        </div>
      </div>

      <Button
        asChild
        size="sm"
        variant="outline"
        className="mt-auto border-border hover:bg-muted hover:text-foreground"
      >
        <Link to={`/workspaces/${workspaceId}/run/${squadId}`}>
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Rodar Squad
        </Link>
      </Button>
    </div>
  );
}

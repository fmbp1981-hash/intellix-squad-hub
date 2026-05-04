import { ArrowRight } from 'lucide-react';
import type { HandoffInfo } from '@/types';

export function HandoffCard({ handoff }: { handoff: HandoffInfo }) {
  return (
    <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-secondary">
        <span>{handoff.from}</span>
        <ArrowRight className="h-4 w-4" />
        <span>{handoff.to}</span>
      </div>
      <p className="text-sm text-foreground/90">{handoff.message}</p>
    </div>
  );
}

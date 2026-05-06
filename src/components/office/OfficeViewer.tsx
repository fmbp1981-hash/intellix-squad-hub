import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { SquadState } from '@/types';

const OfficeViewer2D = lazy(() => import('./OfficeViewer2D'));

interface Props {
  squadState: SquadState | null;
}

export function OfficeViewer({ squadState }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-foreground">
        Escritório virtual
      </h3>
      <Suspense fallback={<Skeleton className="aspect-[15/11] w-full rounded-xl" />}>
        <OfficeViewer2D squadState={squadState} />
      </Suspense>
    </div>
  );
}

export default OfficeViewer;

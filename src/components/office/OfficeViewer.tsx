import { lazy, Suspense, useEffect, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, Square } from 'lucide-react';
import type { SquadState } from '@/types';

const OfficeViewer2D = lazy(() => import('./OfficeViewer2D'));
const OfficeViewer3D = lazy(() => import('./OfficeViewer3D'));

interface Props {
  squadState: SquadState | null;
}

const STORAGE_KEY = 'office-view';

export function OfficeViewer({ squadState }: Props) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d');

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === '3d' || v === '2d') setMode(v);
  }, []);

  const change = (v: string) => {
    if (v !== '2d' && v !== '3d') return;
    setMode(v);
    localStorage.setItem(STORAGE_KEY, v);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">
          Escritório virtual
        </h3>
        <ToggleGroup type="single" value={mode} onValueChange={(v) => v && change(v)} size="sm">
          <ToggleGroupItem value="2d" aria-label="Vista 2D">
            <Square className="mr-1 h-3.5 w-3.5" />
            2D
          </ToggleGroupItem>
          <ToggleGroupItem value="3d" aria-label="Vista 3D">
            <Box className="mr-1 h-3.5 w-3.5" />
            3D
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Suspense fallback={<Skeleton className="aspect-[15/11] w-full rounded-xl" />}>
        {mode === '2d' ? (
          <OfficeViewer2D squadState={squadState} />
        ) : (
          <OfficeViewer3D squadState={squadState} />
        )}
      </Suspense>
    </div>
  );
}

export default OfficeViewer;

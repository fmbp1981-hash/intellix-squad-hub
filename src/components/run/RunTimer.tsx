import { useEffect, useState } from 'react';

function format(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  startedAt: string | null;
  running: boolean;
}

export function RunTimer({ startedAt, running }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed((Date.now() - start) / 1000);
    tick();
    if (!running) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, running]);

  if (!startedAt) return null;
  return <span className="font-mono text-sm text-muted-foreground">{format(elapsed)}</span>;
}

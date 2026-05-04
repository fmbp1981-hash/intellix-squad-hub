import { Sparkles } from 'lucide-react';

export function OfficeViewerPlaceholder() {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-background to-card">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.25), transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--secondary) / 0.2), transparent 40%)',
        }}
      />
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand-soft">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <p className="font-display text-base font-semibold text-foreground">
          Escritório Virtual
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Animação Phaser 2D será carregada no Prompt 5
        </p>
      </div>
    </div>
  );
}

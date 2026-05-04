import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  step: string;
  description?: string;
}

export default function Placeholder({ title, step, description }: PlaceholderProps) {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand-soft">
          <Construction className="h-5 w-5 text-primary" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs uppercase tracking-wider text-gradient-brand">{step}</p>
        {description && (
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

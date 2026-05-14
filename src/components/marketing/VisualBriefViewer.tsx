import { Badge } from "@/components/ui/badge";

interface SlideSpec {
  slide_index: number;
  layout: string;
  visual_notes: string;
  canva_prompt: string;
}

interface VisualBriefViewerProps {
  bgColor?: string;
  accentColor?: string;
  primaryColor?: string;
  fontHeading?: string;
  fontBody?: string;
  canvaMasterPrompt?: string;
  slideSpecs?: SlideSpec[];
  coverStyle?: string;
}

export function VisualBriefViewer({
  bgColor = "#0D2B45",
  accentColor = "#F5C434",
  primaryColor = "#269BEA",
  fontHeading = "DM Sans Bold",
  fontBody = "Inter Regular",
  canvaMasterPrompt,
  slideSpecs = [],
  coverStyle,
}: VisualBriefViewerProps) {
  return (
    <div className="space-y-4">
      {/* Paleta */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paleta</p>
        <div className="flex gap-2">
          {[
            { label: "BG",      color: bgColor },
            { label: "Accent",  color: accentColor },
            { label: "Primary", color: primaryColor },
          ].map(({ label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="h-10 w-10 rounded-lg border border-border" style={{ background: color }} />
              <span className="text-[10px] font-mono text-muted-foreground">{color}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tipografia */}
      <div className="flex gap-4">
        <div><p className="text-[10px] text-muted-foreground">Título</p><p className="text-sm font-medium">{fontHeading}</p></div>
        <div><p className="text-[10px] text-muted-foreground">Corpo</p><p className="text-sm font-medium">{fontBody}</p></div>
        {coverStyle && <div><p className="text-[10px] text-muted-foreground">Capa</p><p className="text-sm font-medium capitalize">{coverStyle}</p></div>}
      </div>

      {/* Master prompt */}
      {canvaMasterPrompt && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canva Master Prompt</p>
          <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap">
            {canvaMasterPrompt}
          </div>
        </div>
      )}

      {/* Slides */}
      {slideSpecs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Slides ({slideSpecs.length})
          </p>
          <div className="space-y-2">
            {slideSpecs.map((s) => (
              <div key={s.slide_index} className="rounded-lg border border-border bg-card/50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">{s.slide_index}</span>
                  <Badge variant="outline" className="text-[10px]">{s.layout}</Badge>
                </div>
                <p className="mb-1 text-xs text-muted-foreground">{s.visual_notes}</p>
                {s.canva_prompt && (
                  <p className="text-[11px] font-mono text-foreground/70 italic">"{s.canva_prompt}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

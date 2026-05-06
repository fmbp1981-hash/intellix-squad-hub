import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GestaoBriefing } from "@/types";

export function BriefingViewer({ briefing }: { briefing: GestaoBriefing }) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <Badge variant="outline" className="mb-2">{briefing.type}</Badge>
          <h3 className="text-lg font-semibold">
            {briefing.trigger_question ?? `Briefing ${briefing.type}`}
          </h3>
          <p className="text-xs text-muted-foreground">
            {new Date(briefing.created_at).toLocaleString("pt-BR")} · por {briefing.triggered_by}
          </p>
        </div>
      </div>
      <article className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{briefing.content_markdown}</ReactMarkdown>
      </article>
      {briefing.recommendations?.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold mb-2">Decisões para Felipe</h4>
          <ul className="space-y-1 text-sm">
            {briefing.recommendations.map((r, i) => (
              <li key={i} className="text-muted-foreground">• {r}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

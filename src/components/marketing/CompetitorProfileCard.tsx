import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface Adaptation {
  area: string;
  suggestion: string;
}

interface CompetitorProfileCardProps {
  handleOrUrl: string;
  platform: string;
  analyzedAt: string;
  editorialInsights?: string;
  dominantFormat?: string;
  postingFrequency?: string;
  avgEngagementRate?: number;
  recommendedAdaptations?: Adaptation[];
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-500/15 text-pink-400 border-pink-500/25",
  website:   "bg-blue-500/15 text-blue-400 border-blue-500/25",
  blog:      "bg-purple-500/15 text-purple-400 border-purple-500/25",
  linkedin:  "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
};

export function CompetitorProfileCard({
  handleOrUrl, platform, analyzedAt, editorialInsights,
  dominantFormat, postingFrequency, avgEngagementRate, recommendedAdaptations = [],
}: CompetitorProfileCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{handleOrUrl}</p>
          <p className="text-xs text-muted-foreground">
            Analisado em {new Date(analyzedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={PLATFORM_COLORS[platform] ?? ""}>{platform}</Badge>
          {avgEngagementRate && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/25">
              {avgEngagementRate.toFixed(1)}% eng.
            </Badge>
          )}
        </div>
      </div>

      {editorialInsights && (
        <p className="text-sm text-muted-foreground leading-relaxed">{editorialInsights}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {dominantFormat   && <div className="text-xs"><span className="text-muted-foreground">Formato: </span><span className="font-medium">{dominantFormat}</span></div>}
        {postingFrequency && <div className="text-xs"><span className="text-muted-foreground">Frequência: </span><span className="font-medium">{postingFrequency}</span></div>}
      </div>

      {recommendedAdaptations.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adaptações sugeridas</p>
          <ul className="space-y-1">
            {recommendedAdaptations.map((a, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-primary">{a.area}:</span>{" "}
                <span className="text-muted-foreground">{a.suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

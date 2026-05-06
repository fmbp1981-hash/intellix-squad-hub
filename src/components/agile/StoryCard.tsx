import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { MoSCoWBadge } from "./MoSCoWBadge";
import { StoryPointsBadge } from "./StoryPointsBadge";
import { INVESTBar } from "./INVESTChecker";
import type { Story } from "@/hooks/useProductBacklog";
import { cn } from "@/lib/utils";

export function StoryCard({
  story,
  epic,
  onClick,
}: {
  story: Story;
  epic?: { color: string | null; title: string } | null;
  onClick?: () => void;
}) {
  const tooBig = (story.story_points ?? 0) >= 13;
  const accepted = story.status === "accepted";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer space-y-2 rounded-md border border-border bg-card p-3 text-left text-xs shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
        story.blocked && "border-t-2 border-t-destructive",
        accepted && "ring-1 ring-emerald-500/40"
      )}
      style={{ borderLeft: `3px solid ${epic?.color ?? "hsl(var(--primary))"}` }}
    >
      <div className="flex items-center gap-1.5">
        {epic && <span className="truncate text-[10px] text-muted-foreground">{epic.title}</span>}
        <div className="ml-auto flex items-center gap-1">
          <MoSCoWBadge value={story.moscow ?? undefined} />
          {accepted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
        </div>
      </div>

      <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
        Como {story.persona}, quero {story.action}
      </p>

      {story.blocked && (
        <div className="flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3" /> {story.blocked_reason ?? "Bloqueada"}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <StoryPointsBadge points={story.story_points} />
        {story.tags?.slice(0, 2).map((t) => (
          <Badge key={t} variant="outline" className="h-5 px-1.5 text-[10px]">
            {t}
          </Badge>
        ))}
        {tooBig && (
          <Badge variant="outline" className="h-5 border-orange-500/40 px-1.5 text-[10px] text-orange-400">
            divida
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <INVESTBar state={story} />
        {story.started_at && story.completed_at && (
          <span className="flex items-center gap-1">
            <ListChecks className="h-3 w-3" />
            {Math.max(
              1,
              Math.round(
                (new Date(story.completed_at).getTime() - new Date(story.started_at).getTime()) /
                  86400000
              )
            )}
            d
          </span>
        )}
      </div>
    </div>
  );
}

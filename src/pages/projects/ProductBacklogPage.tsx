import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProductBacklog, type Epic, type Story } from "@/hooks/useProductBacklog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoSCoWBadge } from "@/components/agile/MoSCoWBadge";
import { StoryPointsBadge } from "@/components/agile/StoryPointsBadge";
import { INVESTBar, investScore } from "@/components/agile/INVESTChecker";
import { StoryDetailDialog } from "@/components/agile/StoryDetailDialog";
import { EpicCreateDialog } from "@/components/agile/EpicCreateDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProductBacklogPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useProductBacklog(projectId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [newEpicOpen, setNewEpicOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState<Record<string, string>>({});

  const toggle = (id: string) => {
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const quickAddStory = useMutation({
    mutationFn: async ({ epicId, title }: { epicId: string | null; title: string }) => {
      const { error } = await supabase.from("user_stories").insert({
        project_id: projectId!,
        epic_id: epicId,
        persona: "usuário",
        action: title,
        benefit: "atingir o objetivo",
        acceptance_criteria: "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-backlog", projectId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }

  const { epics, stories } = data;
  const orphan = stories.filter((s) => !s.epic_id);
  const totalPoints = stories.reduce((s, x) => s + (x.story_points ?? 0), 0);

  const groupStories = (epicId: string | null) =>
    stories.filter((s) => s.epic_id === epicId);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Product Backlog</h1>
          <p className="text-xs text-muted-foreground">
            {stories.length} stories · {totalPoints} pts · {epics.length} épicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewEpicOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo épico
          </Button>
        </div>
      </header>

      <div className="space-y-3">
        {epics.map((epic) => {
          const items = groupStories(epic.id);
          const isCollapsed = collapsed.has(epic.id);
          const points = items.reduce((s, x) => s + (x.story_points ?? 0), 0);
          return (
            <Card key={epic.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(epic.id)}
                className="flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left hover:bg-muted/40"
                style={{ borderLeftColor: epic.color ?? "#7c3aed" }}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="font-semibold">{epic.title}</span>
                <MoSCoWBadge value={epic.moscow ?? undefined} />
                <Badge variant="outline" className="ml-auto">
                  {items.length} stories · {points} pts
                </Badge>
              </button>
              {!isCollapsed && (
                <CardContent className="space-y-1 border-t border-border p-3">
                  {items.map((story) => (
                    <StoryRow key={story.id} story={story} onClick={() => setOpenStory(story)} />
                  ))}
                  <QuickAdd
                    value={quickAdd[epic.id] ?? ""}
                    onChange={(v) => setQuickAdd((s) => ({ ...s, [epic.id]: v }))}
                    onSubmit={(v) =>
                      quickAddStory.mutate(
                        { epicId: epic.id, title: v },
                        { onSuccess: () => setQuickAdd((s) => ({ ...s, [epic.id]: "" })) }
                      )
                    }
                  />
                </CardContent>
              )}
            </Card>
          );
        })}

        {orphan.length > 0 && (
          <Card>
            <div className="border-l-4 border-muted-foreground/40 px-4 py-3 text-sm font-semibold text-muted-foreground">
              Sem épico ({orphan.length})
            </div>
            <CardContent className="space-y-1 border-t border-border p-3">
              {orphan.map((story) => (
                <StoryRow key={story.id} story={story} onClick={() => setOpenStory(story)} />
              ))}
            </CardContent>
          </Card>
        )}

        {epics.length === 0 && orphan.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Backlog vazio. Crie um épico para começar.
            </CardContent>
          </Card>
        )}
      </div>

      <StoryDetailDialog story={openStory} onClose={() => setOpenStory(null)} />
      <EpicCreateDialog
        open={newEpicOpen}
        onClose={() => setNewEpicOpen(false)}
        projectId={projectId!}
      />
    </div>
  );
}

function StoryRow({ story, onClick }: { story: Story; onClick: () => void }) {
  const score = investScore(story);
  const tooBig = (story.story_points ?? 0) >= 13;
  const lowInvest = score < 4;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50"
    >
      <MoSCoWBadge value={story.moscow ?? undefined} />
      <StoryPointsBadge points={story.story_points} />
      <span className={cn("flex-1 truncate", story.blocked && "line-through opacity-60")}>
        Como <span className="text-muted-foreground">{story.persona}</span>, quero {story.action}
      </span>
      {story.blocked && (
        <Badge variant="outline" className="border-destructive/40 text-destructive">
          Bloqueada
        </Badge>
      )}
      {tooBig && (
        <Badge variant="outline" className="border-orange-500/40 text-orange-400">
          {">"}8 pts
        </Badge>
      )}
      {lowInvest && <INVESTBar state={story} />}
    </button>
  );
}

function QuickAdd({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 pt-2">
      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSubmit(value.trim());
          }
        }}
        placeholder="Adicionar story rápida (Enter para criar)"
        className="h-7 border-0 bg-transparent text-xs focus-visible:ring-0"
      />
    </div>
  );
}

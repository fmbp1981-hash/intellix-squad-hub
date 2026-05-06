import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSprintBoard } from "@/hooks/useSprintBoard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StoryCard } from "@/components/agile/StoryCard";
import { StoryDetailDialog } from "@/components/agile/StoryDetailDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Story } from "@/hooks/useProductBacklog";

const COLUMNS: { key: string; label: string; wipKey?: "wip_limit_in_progress" | "wip_limit_review" }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "ready", label: "Ready" },
  { key: "in_progress", label: "In Progress", wipKey: "wip_limit_in_progress" },
  { key: "in_review", label: "In Review", wipKey: "wip_limit_review" },
  { key: "done", label: "Done" },
];

function bucket(story: Story): string {
  if (story.status === "accepted") return "done";
  if (story.status === "sprint") return "ready";
  if (COLUMNS.some((c) => c.key === story.status)) return story.status;
  return "backlog";
}

export default function SprintBoardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useSprintBoard(projectId);
  const [openStory, setOpenStory] = useState<Story | null>(null);

  const move = useMutation({
    mutationFn: async ({ storyId, toStatus, sprintId }: { storyId: string; toStatus: string; sprintId?: string | null }) => {
      const { data: res, error } = await supabase.functions.invoke("agile-story-move", {
        body: { storyId, toStatus, sprintId },
      });
      if (error) throw error;
      if (!res?.ok) throw new Error(res?.reason ?? "Falha ao mover");
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprint-board", projectId] }),
    onError: (e: any) => {
      if (String(e.message).includes("wip_limit")) {
        toast.error("Limite de WIP atingido nesta coluna.");
      } else {
        toast.error(e.message ?? "Erro ao mover");
      }
      qc.invalidateQueries({ queryKey: ["sprint-board", projectId] });
    },
  });

  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const { project, activeSprint, stories, epics } = data;
  const epicMap = new Map(epics.map((e) => [e.id, e]));

  const grouped: Record<string, Story[]> = {};
  COLUMNS.forEach((c) => (grouped[c.key] = []));
  stories.forEach((s) => grouped[bucket(s)].push(s));

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const toStatus = result.destination.droppableId;
    const fromStatus = result.source.droppableId;
    if (toStatus === fromStatus) return;
    const story = stories.find((s) => s.id === result.draggableId);
    if (!story) return;
    const sprintId =
      toStatus === "in_progress" || toStatus === "in_review" || toStatus === "done"
        ? activeSprint?.id ?? story.sprint_id
        : story.sprint_id;
    move.mutate({ storyId: story.id, toStatus, sprintId });
  };

  const sprintProgress =
    activeSprint && (activeSprint.committed_points ?? 0) > 0
      ? Math.round(((activeSprint.completed_points ?? 0) / (activeSprint.committed_points ?? 1)) * 100)
      : 0;

  return (
    <div className="flex h-[calc(100vh-1rem)] flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{project.client_name ?? "Projeto"}</p>
          <h1 className="text-lg font-semibold">{project.name}</h1>
        </div>
        {activeSprint ? (
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Sprint {activeSprint.number}</p>
              <p className="text-sm font-medium">"{activeSprint.goal}"</p>
            </div>
            <div className="w-40">
              <Progress value={sprintProgress} className="h-2" />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {activeSprint.completed_points ?? 0} / {activeSprint.committed_points ?? 0} pts ({sprintProgress}%)
              </p>
            </div>
          </div>
        ) : (
          <Badge variant="outline" className="border-orange-500/40 text-orange-400">
            Nenhum sprint ativo
          </Badge>
        )}
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid flex-1 grid-cols-5 gap-3 overflow-hidden">
          {COLUMNS.map((col) => {
            const items = grouped[col.key];
            const wipLimit = col.wipKey ? project[col.wipKey] : null;
            const overWip = wipLimit != null && items.length > wipLimit;
            return (
              <div key={col.key} className="flex min-h-0 flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      {col.label}
                    </h3>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {items.length}
                      {wipLimit != null && `/${wipLimit}`}
                    </Badge>
                  </div>
                  {overWip && <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />}
                </div>
                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 space-y-2 overflow-y-auto rounded-md border border-dashed border-border/50 bg-muted/20 p-2 transition-colors",
                        snapshot.isDraggingOver && "border-primary/60 bg-primary/5"
                      )}
                    >
                      {items.map((story, idx) => (
                        <Draggable key={story.id} draggableId={story.id} index={idx}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={cn(snap.isDragging && "rotate-1 opacity-90")}
                            >
                              <StoryCard
                                story={story}
                                epic={story.epic_id ? epicMap.get(story.epic_id) ?? null : null}
                                onClick={() => setOpenStory(story)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <StoryDetailDialog story={openStory} onClose={() => setOpenStory(null)} />
    </div>
  );
}

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

export type KanbanStatus = "todo" | "doing" | "review" | "done";

export interface KanbanTask {
  id: string;
  title: string;
  status: KanbanStatus;
  assignee?: string | null;
  estimate?: number | null;
  module_code?: string | null;
}

const COLUMNS: { id: KanbanStatus; label: string; tone: string }[] = [
  { id: "todo",   label: "A fazer",  tone: "border-muted-foreground/30" },
  { id: "doing",  label: "Em curso", tone: "border-amber-500/40" },
  { id: "review", label: "Revisão",  tone: "border-blue-500/40" },
  { id: "done",   label: "Concluído",tone: "border-emerald-500/40" },
];

export function SprintKanban({
  tasks,
  onMove,
}: {
  tasks: KanbanTask[];
  onMove?: (taskId: string, newStatus: KanbanStatus) => void;
}) {
  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const newStatus = r.destination.droppableId as KanbanStatus;
    const taskId = r.draggableId;
    if (r.source.droppableId !== newStatus) onMove?.(taskId, newStatus);
  };

  const byColumn = (col: KanbanStatus) => tasks.filter((t) => t.status === col);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className={cn("rounded-xl border-t-2 bg-card/40 p-2", col.tone)}>
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{col.label}</span>
              <span className="text-[10px] text-muted-foreground">{byColumn(col.id).length}</span>
            </div>

            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "min-h-32 space-y-2 rounded-lg p-1 transition-colors",
                    snapshot.isDraggingOver && "bg-primary/5"
                  )}
                >
                  {byColumn(col.id).map((t, idx) => (
                    <Draggable key={t.id} draggableId={t.id} index={idx}>
                      {(p, s) => (
                        <li
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          className={cn(
                            "rounded-md border bg-background p-2.5 text-xs shadow-sm transition-shadow",
                            s.isDragging && "shadow-lg ring-2 ring-primary/40"
                          )}
                        >
                          <p className="line-clamp-2 text-sm font-medium text-foreground">{t.title}</p>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{t.assignee ?? "—"}</span>
                            <span className="flex items-center gap-1.5">
                              {t.module_code && (
                                <span className="rounded-full border bg-card px-1.5 py-0.5 text-[9px] font-bold">
                                  {t.module_code}
                                </span>
                              )}
                              {t.estimate != null && <span>{t.estimate}pt</span>}
                            </span>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

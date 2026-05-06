import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Play, CheckCircle2, ListChecks, MessageSquare, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const statusBadge: Record<string, { label: string; tone: string }> = {
  planned: { label: "Planejada", tone: "bg-muted text-muted-foreground" },
  active: { label: "Em andamento", tone: "bg-primary/20 text-primary" },
  completed: { label: "Concluída", tone: "bg-emerald-500/20 text-emerald-400" },
};

export default function SprintsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [ceremonyOpen, setCeremonyOpen] = useState<{ sprintId: string; type: "planning" | "review" | "retrospective" } | null>(null);

  const { data: project } = useQuery({
    enabled: !!projectId,
    queryKey: ["agile-project-sp", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("agile_projects").select("*").eq("id", projectId!).single();
      return data;
    },
  });

  const { data: sprints, refetch } = useQuery({
    enabled: !!projectId,
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sprints")
        .select("*")
        .eq("project_id", projectId!)
        .order("number", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!projectId) return;
    const ch = supabase.channel(`sprints-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sprints", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, qc]);

  const startSprint = async (sprintId: string) => {
    // Encerra qualquer outra ativa
    await supabase.from("sprints").update({ status: "planned" }).eq("project_id", projectId!).eq("status", "active");
    await supabase.from("sprints").update({ status: "active", planning_done: true }).eq("id", sprintId);
    toast.success("Sprint iniciada");
  };

  const completeSprint = async (sprintId: string) => {
    const sprint = sprints?.find(s => s.id === sprintId);
    if (!sprint) return;
    // calcula completed/velocity das stories
    const { data: stories } = await supabase.from("user_stories").select("status, story_points").eq("sprint_id", sprintId);
    const committed = (stories ?? []).reduce((s: number, st: any) => s + (st.story_points ?? 0), 0);
    const completed = (stories ?? []).filter((st: any) => st.status === "done").reduce((s: number, st: any) => s + (st.story_points ?? 0), 0);
    await supabase.from("sprints").update({
      status: "completed",
      committed_points: committed,
      completed_points: completed,
      velocity: completed,
    }).eq("id", sprintId);
    await supabase.from("velocity_history").insert({
      project_id: projectId!,
      sprint_id: sprintId,
      sprint_number: sprint.number,
      committed,
      completed,
      velocity: completed,
    });
    toast.success("Sprint concluída e velocity registrada");
  };

  const createSprint = async (form: { name: string; goal: string; start: string; end: string }) => {
    const nextNumber = (sprints?.[0]?.number ?? 0) + 1;
    const { error } = await supabase.from("sprints").insert({
      project_id: projectId!,
      number: nextNumber,
      name: form.name || `Sprint ${nextNumber}`,
      goal: form.goal,
      start_date: form.start,
      end_date: form.end,
      status: "planned",
    });
    if (error) toast.error(error.message);
    else { toast.success("Sprint criada"); setCreateOpen(false); refetch(); }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sprints</h1>
          <p className="text-sm text-muted-foreground">{project?.name} · cerimônias e cadência</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova Sprint</Button>
      </header>

      {sprints && sprints.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma sprint ainda. Crie a primeira.</CardContent></Card>
      )}

      <div className="space-y-3">
        {sprints?.map((s: any) => {
          const meta = statusBadge[s.status] ?? statusBadge.planned;
          return (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Sprint {s.number} {s.name && s.name !== `Sprint ${s.number}` ? `· ${s.name}` : ""}</CardTitle>
                      <Badge className={meta.tone} variant="secondary">{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.goal}</p>
                    <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {s.start_date} → {s.end_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "planned" && (
                      <Button size="sm" onClick={() => startSprint(s.id)}><Play className="mr-1.5 h-3.5 w-3.5" /> Iniciar</Button>
                    )}
                    {s.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => completeSprint(s.id)}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Concluir</Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-4">
                <Stat label="Comprometido" value={`${s.committed_points ?? 0} pts`} />
                <Stat label="Concluído" value={`${s.completed_points ?? 0} pts`} />
                <Stat label="Velocity" value={s.velocity ? `${Number(s.velocity).toFixed(0)} pts` : "—"} />
                <div className="flex items-end gap-2">
                  <CeremonyBtn done={s.planning_done} icon={ListChecks} label="Planning" onClick={() => setCeremonyOpen({ sprintId: s.id, type: "planning" })} />
                  <CeremonyBtn done={s.review_done} icon={MessageSquare} label="Review" onClick={() => setCeremonyOpen({ sprintId: s.id, type: "review" })} />
                  <CeremonyBtn done={s.retrospective_done} icon={RotateCcw} label="Retro" onClick={() => setCeremonyOpen({ sprintId: s.id, type: "retrospective" })} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreateSprintDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={createSprint} duration={project?.sprint_duration_days ?? 14} />
      {ceremonyOpen && (
        <CeremonyDialog
          open={!!ceremonyOpen}
          onOpenChange={(o) => !o && setCeremonyOpen(null)}
          sprintId={ceremonyOpen.sprintId}
          type={ceremonyOpen.type}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function CeremonyBtn({ done, icon: Icon, label, onClick }: any) {
  return (
    <Button size="sm" variant={done ? "secondary" : "outline"} className="text-xs" onClick={onClick}>
      <Icon className="mr-1 h-3 w-3" /> {label}{done && " ✓"}
    </Button>
  );
}

function CreateSprintDialog({ open, onOpenChange, onSubmit, duration }: any) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date(Date.now() + duration * 86400000).toISOString().slice(0, 10));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Sprint</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome (opcional)" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Sprint goal *" value={goal} onChange={e => setGoal(e.target.value)} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs">Início</label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div><label className="text-xs">Fim</label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onSubmit({ name, goal, start, end })} disabled={!goal}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CeremonyDialog({ open, onOpenChange, sprintId, type }: any) {
  const [notes, setNotes] = useState("");
  const titles = { planning: "Sprint Planning", review: "Sprint Review", retrospective: "Sprint Retrospective" };
  const fields = { planning: "planning_notes", review: "review_notes", retrospective: "retrospective_notes" };
  const flags = { planning: "planning_done", review: "review_done", retrospective: "retrospective_done" };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sprints").select(fields[type as keyof typeof fields]).eq("id", sprintId).single();
      setNotes((data as any)?.[fields[type as keyof typeof fields]] ?? "");
    })();
  }, [sprintId, type]);

  const save = async () => {
    const update: any = {
      [fields[type as keyof typeof fields]]: notes,
      [flags[type as keyof typeof flags]]: true,
    };
    await supabase.from("sprints").update(update).eq("id", sprintId);
    toast.success("Cerimônia registrada");
    onOpenChange(false);
  };
    toast.success("Cerimônia registrada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{titles[type as keyof typeof titles]}</DialogTitle></DialogHeader>
        <Textarea rows={10} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações, decisões, ações…" />
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Navigate } from "react-router-dom";
import {
  Loader2, PlayCircle, RefreshCw, Pencil, Trash2,
  Save, X, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

type Job = {
  id: string;
  kind: string;
  status: string;
  department: string | null;
  payload: unknown;
  output_markdown: string | null;
  created_at: string;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed:  "bg-green-500/15 text-green-400 border-green-500/30",
  failed:     "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_DOT: Record<string, string> = {
  pending:    "bg-yellow-400",
  processing: "bg-blue-400 animate-pulse",
  completed:  "bg-green-400",
  failed:     "bg-red-400",
};

export default function JobsPage() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter]     = useState("all");
  const [loading, setLoading]           = useState(true);
  const [triggering, setTriggering]     = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  // Edit
  const [editing, setEditing] = useState<Job | null>(null);
  const [editFields, setEditFields] = useState({ kind: "", status: "", department: "" });

  // ── Data loading ────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("internal_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Erro ao carregar jobs", description: error.message, variant: "destructive" });
    } else {
      setJobs((data ?? []) as Job[]);
    }
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const kinds = useMemo(() => Array.from(new Set(jobs.map((j) => j.kind))), [jobs]);
  const filtered = useMemo(
    () => jobs.filter((j) =>
      (statusFilter === "all" || j.status === statusFilter) &&
      (kindFilter === "all"   || j.kind === kindFilter)
    ),
    [jobs, statusFilter, kindFilter],
  );

  // ── Actions ─────────────────────────────────────────────────────────────
  const trigger = async () => {
    setTriggering(true);
    const { error } = await supabase.functions.invoke("internal-job-trigger", {
      body: { kind: "daily-standup" },
    });
    if (error) {
      toast({ title: "Falha ao disparar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job disparado" });
      await load();
    }
    setTriggering(false);
  };

  const deleteJob = async (id: string) => {
    const { error } = await supabase.from("internal_jobs").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao apagar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job apagado" });
      if (selected?.id === id) setSelected(null);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    }
    setDeleteId(null);
  };

  const clearAll = async () => {
    const { error } = await supabase
      .from("internal_jobs")
      .delete()
      .gte("created_at", new Date(0).toISOString());
    if (error) {
      toast({ title: "Erro ao limpar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${jobs.length} job(s) apagados` });
      setJobs([]);
      setSelected(null);
    }
    setClearAllOpen(false);
  };

  const startEdit = (job: Job) => {
    setEditing(job);
    setEditFields({ kind: job.kind, status: job.status, department: job.department ?? "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const patch = {
      kind: editFields.kind,
      status: editFields.status,
      department: editFields.department || null,
    };
    const { error } = await supabase.from("internal_jobs").update(patch).eq("id", editing.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job atualizado" });
      const updated = { ...editing, ...patch };
      setJobs((prev) => prev.map((j) => (j.id === editing.id ? updated : j)));
      if (selected?.id === editing.id) setSelected(updated);
      setEditing(null);
    }
  };

  // ── Guards ───────────────────────────────────────────────────────────────
  if (roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/workspaces" replace />;

  return (
    <div className="flex h-screen flex-col p-6">
      {/* ── Header ── */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs Internos</h1>
          <p className="text-sm text-muted-foreground">
            Relatórios automatizados e execuções agendadas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => setClearAllOpen(true)}
            disabled={jobs.length === 0}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar tudo
          </Button>
          <Button size="sm" onClick={trigger} disabled={triggering}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Disparar daily-standup
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="mb-3 flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {kinds.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Main ── */}
      <div className="grid flex-1 grid-cols-2 gap-4 overflow-hidden">

        {/* Card list */}
        <div className="overflow-auto">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Nenhum job encontrado.
            </div>
          ) : (
            <div className="space-y-2 pr-1">
              {filtered.map((j) => (
                <div
                  key={j.id}
                  onClick={() => setSelected(j)}
                  className={`group relative cursor-pointer rounded-xl border p-4 transition-all hover:border-primary/40 hover:bg-accent/40 ${
                    selected?.id === j.id
                      ? "border-primary/60 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[j.status] ?? "bg-muted-foreground"}`} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{j.kind}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[j.status] ?? ""}`}>
                          {j.status}
                        </Badge>
                        {j.department && (
                          <span className="text-[11px] text-muted-foreground">{j.department}</span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(j.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    {/* Action buttons — appear on hover */}
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(j); }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(j.id); }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Apagar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail / edit panel */}
        <div className="overflow-auto rounded-xl border border-border bg-card p-5">
          {editing ? (
            /* ── Edit form ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Editar Job</h2>
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo (kind)</Label>
                  <Input
                    className="mt-1"
                    value={editFields.kind}
                    onChange={(e) => setEditFields((f) => ({ ...f, kind: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={editFields.status}
                    onValueChange={(v) => setEditFields((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Departamento</Label>
                  <Input
                    className="mt-1"
                    placeholder="opcional"
                    value={editFields.department}
                    onChange={(e) => setEditFields((f) => ({ ...f, department: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveEdit}>
                  <Save className="mr-2 h-4 w-4" /> Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : selected ? (
            /* ── Detail view ── */
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{selected.kind}</h2>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => startEdit(selected)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(selected.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Apagar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={STATUS_BADGE[selected.status] ?? ""}>
                    {selected.status}
                  </Badge>
                  {selected.department && <span>{selected.department}</span>}
                  <span>Criado: {new Date(selected.created_at).toLocaleString("pt-BR")}</span>
                  {selected.completed_at && (
                    <span>Concluído: {new Date(selected.completed_at).toLocaleString("pt-BR")}</span>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Payload
                </p>
                <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>

              {selected.output_markdown && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Output
                  </p>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{selected.output_markdown}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione um job para ver detalhes.
            </p>
          )}
        </div>
      </div>

      {/* ── Delete single ── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este job?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteJob(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Clear all ── */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Limpar todos os jobs?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai apagar permanentemente todos os {jobs.length} job(s) do banco de dados.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

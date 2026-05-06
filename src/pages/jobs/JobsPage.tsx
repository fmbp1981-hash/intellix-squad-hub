import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Navigate } from "react-router-dom";
import { Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Job = {
  id: string;
  kind: string;
  status: string;
  department: string | null;
  payload: any;
  output_markdown: string | null;
  created_at: string;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  processing: "bg-blue-500/20 text-blue-300",
  completed: "bg-green-500/20 text-green-300",
  failed: "bg-red-500/20 text-red-300",
};

export default function JobsPage() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("internal_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({
        title: "Erro ao carregar jobs",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setJobs((data ?? []) as Job[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const kinds = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.kind))),
    [jobs]
  );
  const filtered = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (statusFilter === "all" || j.status === statusFilter) &&
          (kindFilter === "all" || j.kind === kindFilter)
      ),
    [jobs, statusFilter, kindFilter]
  );

  const trigger = async () => {
    setTriggering(true);
    const { error } = await supabase.functions.invoke("internal-job-trigger", {
      body: { kind: "daily_report" },
    });
    if (error) {
      toast({
        title: "Falha ao disparar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Job disparado" });
      await load();
    }
    setTriggering(false);
  };

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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs Internos</h1>
          <p className="text-sm text-muted-foreground">
            Relatórios automatizados e execuções agendadas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Atualizar
          </Button>
          <Button size="sm" onClick={trigger} disabled={triggering}>
            <PlayCircle className="mr-2 h-4 w-4" /> Disparar daily_report
          </Button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4 overflow-hidden">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Depto</th>
                <th className="px-3 py-2 text-left">Criado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
                <tr
                  key={j.id}
                  onClick={() => setSelected(j)}
                  className={`cursor-pointer border-t border-border hover:bg-muted/50 ${
                    selected?.id === j.id ? "bg-muted" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{j.kind}</td>
                  <td className="px-3 py-2">
                    <Badge className={STATUS_COLORS[j.status] ?? ""}>
                      {j.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {j.department ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(j.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Nenhum job encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-auto rounded-lg border border-border bg-card p-4">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.kind}</h2>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge className={STATUS_COLORS[selected.status] ?? ""}>
                    {selected.status}
                  </Badge>
                  <span>
                    Criado:{" "}
                    {new Date(selected.created_at).toLocaleString("pt-BR")}
                  </span>
                  {selected.completed_at && (
                    <span>
                      Concluído:{" "}
                      {new Date(selected.completed_at).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Payload
                </p>
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
              {selected.output_markdown && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
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
    </div>
  );
}

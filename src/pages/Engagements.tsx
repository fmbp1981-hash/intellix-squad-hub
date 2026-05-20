import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { useEngagementsOverview } from "@/hooks/useEngagementsOverview";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { NewEngagementDialog } from "@/components/engagement/NewEngagementDialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ESP_TYPES = ["all", "consulting", "agent", "automation", "product", "hybrid", "undetermined"] as const;
const STATUSES = ["all", "planning", "active", "blocked", "completed", "cancelled"] as const;

export default function Engagements() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useEngagementsOverview();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [createOpen, setCreateOpen] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof ESP_TYPES)[number]>("all");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((e) => {
      if (type !== "all" && (e.esp_type ?? "undetermined") !== type) return false;
      if (status !== "all" && e.status !== status) return false;
      if (term && !e.client_name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [data, q, type, status]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Engagements</h1>
          <p className="text-sm text-muted-foreground">Como está cada projeto?</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo engagement
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente"
            className="pl-9"
          />
        </div>

        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo ESP" /></SelectTrigger>
          <SelectContent>
            {ESP_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t === "all" ? "Todos os tipos" : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "Todos os status" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto inline-flex rounded-lg border bg-card p-0.5">
          <Button
            variant={view === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Nenhum engagement encontrado com esses filtros.
        </div>
      ) : view === "cards" ? (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <li key={e.id}>
              <EngagementCard e={e} onClick={() => navigate(`/engagements/${e.id}`)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Owner</th>
                <th className="px-3 py-2.5">Módulos</th>
                <th className="px-3 py-2.5">ETA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/engagements/${e.id}`)}
                  className="cursor-pointer border-b last:border-0 transition-colors hover:bg-accent/40"
                >
                  <td className="px-3 py-2.5 font-medium">{e.client_name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{e.esp_type}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{e.status}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{e.owner ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {(e.active_module_codes ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {e.eta ? new Date(e.eta).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewEngagementDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

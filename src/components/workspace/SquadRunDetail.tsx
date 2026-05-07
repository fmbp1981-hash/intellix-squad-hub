import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSquadRun } from "@/hooks/useSquadRun";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SquadRunDetail({ runId }: { runId: string }) {
  const { run, steps, loading } = useSquadRun(runId);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "markdown" | "json") => {
    if (!run) return;
    setExporting(true);
    try {
      if (format === "markdown") {
        const md = [
          `# ${run.squad_name}`,
          `Status: ${run.status}`,
          run.started_at ? `Início: ${new Date(run.started_at).toLocaleString()}` : "",
          "",
          ...steps.map(
            (s) =>
              `## Step ${s.step_number} — ${s.agent_name || s.agent_key}\n\n${s.output_markdown ?? ""}`,
          ),
        ].join("\n");
        downloadBlob(new Blob([md], { type: "text/markdown" }), `run-${runId}.md`);
        toast.success("Markdown exportado");
      } else {
        const payload = { run, steps };
        downloadBlob(
          new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
          `run-${runId}.json`,
        );
        toast.success("JSON exportado");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!run) return <p className="text-sm text-muted-foreground">Run não encontrado.</p>;

  return (
    <div className="space-y-4 fade-in-up">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">{run.squad_name}</h3>
          <p className="text-xs text-muted-foreground">
            {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{run.status}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={exporting}>
                <Download className="mr-2 h-3.5 w-3.5" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("markdown")}>Markdown (.md)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>JSON (.json)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="space-y-3">
        {steps.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem outputs ainda.</p>
        )}
        {steps.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4 hover-lift">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">Step {s.step_number}</Badge>
                <span className="font-medium text-sm">{s.agent_name || s.agent_key}</span>
              </div>
              <div className="text-[11px] text-muted-foreground space-x-2">
                <span>{s.tokens_in + s.tokens_out} tok</span>
                <span>${((s.cost_cents || 0) / 100).toFixed(3)}</span>
                {s.duration_ms != null && <span>{s.duration_ms}ms</span>}
              </div>
            </div>
            {s.output_markdown && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs text-foreground">
                {s.output_markdown}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

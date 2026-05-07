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

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!run) return <p className="text-sm text-muted-foreground">Run não encontrado.</p>;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">{run.squad_name}</h3>
          <p className="text-xs text-muted-foreground">
            {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
          </p>
        </div>
        <Badge variant="outline">{run.status}</Badge>
      </header>

      <div className="space-y-3">
        {steps.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem outputs ainda.</p>
        )}
        {steps.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4">
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

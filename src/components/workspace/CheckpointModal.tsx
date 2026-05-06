import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export function CheckpointModal({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);
  const [checkpoint, setCheckpoint] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("squad_checkpoints")
      .select("*")
      .eq("run_id", runId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCheckpoint(data));
  }, [open, runId]);

  async function resolve(decision: "approved" | "rejected") {
    if (!checkpoint) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("checkpoint-resolve", {
        body: { checkpointId: checkpoint.id, decision, notes },
      });
      if (error) throw error;
      toast.success(decision === "approved" ? "Aprovado" : "Rejeitado");
      setOpen(false);
      setNotes("");
    } catch (e) {
      toast.error("Erro", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Revisar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Checkpoint — Aprovação humana</DialogTitle>
        </DialogHeader>
        {!checkpoint ? (
          <p className="text-sm text-muted-foreground">Nenhum checkpoint pendente.</p>
        ) : (
          <>
            <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
              {checkpoint.context_md || "(sem contexto)"}
            </div>
            <Textarea
              placeholder="Notas (opcional)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" disabled={loading} onClick={() => resolve("rejected")}>
                Rejeitar
              </Button>
              <Button disabled={loading} onClick={() => resolve("approved")}>
                Aprovar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

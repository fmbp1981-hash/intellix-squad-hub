import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GestaoDirective } from "@/types";

const PRIO_COLOR: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  normal: "bg-primary text-primary-foreground",
  low: "bg-muted text-muted-foreground",
};

export function DirectiveCard({ directive }: { directive: GestaoDirective }) {
  const isCritical = directive.priority === "critical";
  const canApprove = directive.status === "pending";

  const approve = async () => {
    const ok = isCritical
      ? confirm("Esta diretiva é CRÍTICA. Confirmar aprovação?")
      : true;
    if (!ok) return;
    const { error } = await supabase.functions.invoke("gestao-directive-dispatch", {
      body: { directiveId: directive.id, approved: isCritical ? true : undefined },
    });
    if (error) toast.error(error.message);
    else toast.success("Diretiva despachada");
  };

  const reject = async () => {
    await supabase.from("gestao_directives").update({ status: "cancelled", cancelled_reason: "manual" }).eq("id", directive.id);
    toast("Diretiva cancelada");
  };

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Badge className={PRIO_COLOR[directive.priority] ?? ""}>{directive.priority}</Badge>
        <Badge variant="outline">{directive.status}</Badge>
      </div>
      <div>
        <p className="text-sm font-semibold">{directive.target_department} → {directive.job_id}</p>
        {directive.rationale && <p className="text-xs text-muted-foreground mt-1">{directive.rationale}</p>}
      </div>
      {canApprove && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant={isCritical ? "destructive" : "default"} onClick={approve}>
            {isCritical ? "Aprovar (crítico)" : "Aprovar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={reject}>Cancelar</Button>
        </div>
      )}
    </Card>
  );
}

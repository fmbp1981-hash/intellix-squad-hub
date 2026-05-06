import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrm } from "@/hooks/useCrm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EngagementStatus, EngagementHealth } from "@/types";

const STATUSES: EngagementStatus[] = ["planning","active","blocked","completed","cancelled"];
const HEALTH_COLOR: Record<EngagementHealth, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-destructive",
};

export default function EngagementList() {
  const { engagements } = useCrm();

  const updateStatus = async (id: string, status: EngagementStatus) => {
    const { error } = await supabase.from("engagements").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };

  if (engagements.length === 0) {
    return <Card className="p-8 text-center text-muted-foreground">Nenhum engagement. Eles são criados automaticamente quando um deal é "won".</Card>;
  }

  return (
    <div className="space-y-2">
      {engagements.map((e) => (
        <Card key={e.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${HEALTH_COLOR[e.health]}`} />
            <div>
              <p className="font-semibold">{e.name}</p>
              <p className="text-xs text-muted-foreground">Início {e.start_date}{e.end_date ? ` · Fim ${e.end_date}` : ""}</p>
              {e.blocker_note && <Badge variant="destructive" className="mt-1">{e.blocker_note}</Badge>}
            </div>
          </div>
          <Select value={e.status} onValueChange={(v) => updateStatus(e.id, v as EngagementStatus)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Card>
      ))}
    </div>
  );
}

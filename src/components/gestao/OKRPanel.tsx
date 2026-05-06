import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OKR } from "@/types";

const STATUS_COLOR: Record<string, string> = {
  on_track: "bg-emerald-500",
  at_risk: "bg-amber-500",
  off_track: "bg-destructive",
  completed: "bg-primary",
};

export function OKRPanel({ okrs }: { okrs: OKR[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");

  const save = async (id: string) => {
    const v = parseFloat(value);
    if (Number.isNaN(v)) return;
    const { error } = await supabase.from("okrs").update({ current_value: v }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("OKR atualizado");
    setEditing(null);
  };

  if (!okrs.length) {
    return <p className="text-sm text-muted-foreground italic">Nenhum OKR cadastrado.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {okrs.map((o) => (
        <Card key={o.id} className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline" className="text-xs">{o.quarter} · {o.department}</Badge>
              <h3 className="font-semibold mt-1">{o.objective}</h3>
              <p className="text-sm text-muted-foreground">{o.key_result}</p>
            </div>
            <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[o.status] ?? "bg-muted"}`} />
          </div>
          <Progress value={o.progress} />
          <div className="flex items-center justify-between text-sm">
            {editing === o.id ? (
              <>
                <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-8 w-24" />
                <Button size="sm" onClick={() => save(o.id)}>Salvar</Button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">
                  {o.current_value ?? 0} / {o.target_value ?? "—"} {o.metric_unit ?? ""} ({o.progress}%)
                </span>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(o.id); setValue(String(o.current_value ?? 0)); }}>
                  Editar
                </Button>
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Squad = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  department: string;
  squad_type: string;
  default_llm_config: string;
  active: boolean;
};

export default function SquadsSettings() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("squad_configs").select("*").order("squad_type").order("name");
    setSquads((data ?? []) as Squad[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, patch: Partial<Squad>) =>
    setSquads((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const save = async (s: Squad) => {
    const { error } = await supabase
      .from("squad_configs")
      .update({
        name: s.name,
        description: s.description,
        department: s.department,
        default_llm_config: s.default_llm_config,
        active: s.active,
      })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`${s.name} salvo`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Squads</h1>
        <p className="text-sm text-muted-foreground">Configure squads internos e de delivery.</p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="space-y-3">
        {squads.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{s.name}</CardTitle>
                <Badge variant="outline" className="text-[10px]">{s.squad_type}</Badge>
                <Badge variant="secondary" className="font-mono text-[10px]">{s.key}</Badge>
              </div>
              <Switch checked={s.active} onCheckedChange={(v) => update(s.id, { active: v })} />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label>Nome</Label>
                <Input value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} />
              </div>
              <div>
                <Label>Departamento</Label>
                <Input value={s.department} onChange={(e) => update(s.id, { department: e.target.value })} />
              </div>
              <div>
                <Label>LLM padrão</Label>
                <Input
                  value={s.default_llm_config}
                  onChange={(e) => update(s.id, { default_llm_config: e.target.value })}
                />
              </div>
              <div className="md:col-span-3">
                <Label>Descrição</Label>
                <Input
                  value={s.description ?? ""}
                  onChange={(e) => update(s.id, { description: e.target.value })}
                />
              </div>
              <div className="md:col-span-3">
                <Button size="sm" onClick={() => save(s)}>Salvar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

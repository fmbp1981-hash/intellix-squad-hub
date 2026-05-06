import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

type Agent = {
  id: string;
  name: string;
  role: string;
  agent_key: string | null;
  squad_name: string | null;
  squad_id: string;
  persona: string | null;
  system_prompt: string | null;
  llm_config_key: string;
  active: boolean;
};

export default function AgentsSettings() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Agent | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_configs")
      .select("*")
      .order("squad_name", { ascending: true })
      .order("name", { ascending: true });
    if (error) toast.error(error.message);
    setAgents((data ?? []) as Agent[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("agent_configs")
      .update({
        persona: editing.persona,
        system_prompt: editing.system_prompt,
        llm_config_key: editing.llm_config_key,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success(`${editing.name} atualizado`);
    setEditing(null);
    load();
  };

  const grouped = agents.reduce<Record<string, Agent[]>>((acc, a) => {
    const key = a.squad_name || "—";
    (acc[key] = acc[key] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agentes</h1>
        <p className="text-sm text-muted-foreground">
          Edite o system prompt e persona dos agentes IA.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {Object.entries(grouped).map(([squad, list]) => (
        <Card key={squad}>
          <CardHeader>
            <CardTitle className="text-base">{squad}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <Badge variant="outline" className="text-[10px]">{a.role}</Badge>
                    {!a.active && <Badge variant="secondary" className="text-[10px]">inativo</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.agent_key} · {a.llm_config_key}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Persona</Label>
                <Textarea
                  rows={3}
                  value={editing.persona ?? ""}
                  onChange={(e) => setEditing({ ...editing, persona: e.target.value })}
                />
              </div>
              <div>
                <Label>System Prompt</Label>
                <Textarea
                  rows={12}
                  className="font-mono text-xs"
                  value={editing.system_prompt ?? ""}
                  onChange={(e) => setEditing({ ...editing, system_prompt: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {editing.system_prompt?.length ?? 0} caracteres
                </p>
              </div>
              <div>
                <Label>LLM Config Key</Label>
                <Input
                  value={editing.llm_config_key}
                  onChange={(e) => setEditing({ ...editing, llm_config_key: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

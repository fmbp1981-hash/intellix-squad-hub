import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  workspaceId: string;
  onCreated?: () => void;
}

export function EngagementPlanWizard({ workspaceId, onCreated }: Props) {
  const [available, setAvailable] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [picker, setPicker] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("squad_configs")
      .select("key,name,squad_type")
      .eq("active", true)
      .eq("squad_type", "client")
      .then(({ data }) => setAvailable(data ?? []));
  }, []);

  function add() {
    if (picker && !selected.includes(picker)) {
      setSelected([...selected, picker]);
      setPicker("");
    }
  }
  function move(i: number, dir: -1 | 1) {
    const arr = [...selected];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSelected(arr);
  }
  function remove(s: string) {
    setSelected(selected.filter((x) => x !== s));
  }

  async function save() {
    if (selected.length === 0) {
      toast.error("Selecione ao menos um squad");
      return;
    }
    setSaving(true);
    try {
      const squads_ordered = selected.map((squad, idx) => ({
        squad,
        depends_on: idx === 0 ? [] : [selected[idx - 1]],
      }));
      const { error } = await supabase.from("engagement_plans").insert({
        workspace_id: workspaceId,
        squads_ordered,
        auto_advance: autoAdvance,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Plano de engagement criado");
      onCreated?.();
    } catch (e) {
      toast.error("Erro", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Adicionar squad</Label>
        <div className="flex gap-2 mt-1">
          <Select value={picker} onValueChange={setPicker}>
            <SelectTrigger><SelectValue placeholder="Escolha um squad" /></SelectTrigger>
            <SelectContent>
              {available
                .filter((s) => !selected.includes(s.key))
                .map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={add} disabled={!picker}>Adicionar</Button>
        </div>
      </div>

      <div className="space-y-2">
        {selected.map((s, i) => (
          <div key={s} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
            <span className="flex-1 text-sm font-medium">{s}</span>
            <Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(s)}><X className="h-3 w-3" /></Button>
          </div>
        ))}
        {selected.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Nenhum squad selecionado.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch id="auto" checked={autoAdvance} onCheckedChange={setAutoAdvance} />
        <Label htmlFor="auto" className="text-sm">Avançar automaticamente entre squads</Label>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar plano
      </Button>
    </div>
  );
}

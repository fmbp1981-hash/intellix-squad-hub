import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COLORS = ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export function EpicCreateDialog({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [businessValue, setBusinessValue] = useState("");
  const [moscow, setMoscow] = useState<string>("should");
  const [color, setColor] = useState(COLORS[0]);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("epics").insert({
        project_id: projectId,
        title,
        business_value: businessValue || null,
        moscow,
        color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-backlog", projectId] });
      toast.success("Épico criado");
      setTitle("");
      setBusinessValue("");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Épico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Automação Financeira" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor de negócio</Label>
            <Textarea rows={3} value={businessValue} onChange={(e) => setBusinessValue(e.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">MoSCoW</Label>
              <Select value={moscow} onValueChange={setMoscow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="must">Must</SelectItem>
                  <SelectItem value="should">Should</SelectItem>
                  <SelectItem value="could">Could</SelectItem>
                  <SelectItem value="wont">Won't</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-2 pt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-background ${color === c ? "ring-2 ring-foreground" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>
            Criar épico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { INVESTChecker } from "./INVESTChecker";
import { PointsSelector } from "./PointsSelector";
import { MoSCoWBadge } from "./MoSCoWBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Story } from "@/hooks/useProductBacklog";

const STATUS_OPTIONS = [
  "backlog",
  "ready",
  "sprint",
  "in_progress",
  "in_review",
  "done",
  "accepted",
  "cancelled",
];

export function StoryDetailDialog({
  story,
  onClose,
}: {
  story: Story | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Story | null>(story);

  useEffect(() => setForm(story), [story]);

  const update = useMutation({
    mutationFn: async (patch: Partial<Story>) => {
      const { error } = await supabase.from("user_stories").update(patch).eq("id", story!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-backlog"] });
      qc.invalidateQueries({ queryKey: ["sprint-board"] });
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_stories").delete().eq("id", story!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-backlog"] });
      onClose();
      toast.success("Story removida");
    },
  });

  if (!form) return null;

  const ac = form.acceptance_criteria
    ? form.acceptance_criteria.split("\n").filter(Boolean)
    : [];

  const setField = <K extends keyof Story>(key: K, value: Story[K]) => {
    setForm({ ...form, [key]: value });
  };

  const save = (patch: Partial<Story>) => {
    setForm({ ...form, ...patch });
    update.mutate(patch);
  };

  return (
    <Dialog open={!!story} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MoSCoWBadge value={form.moscow ?? undefined} />
            <Badge variant="outline">{form.status}</Badge>
            {form.blocked && (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                Bloqueada
              </Badge>
            )}
          </div>
          <DialogTitle className="mt-2 text-base font-semibold">
            Como {form.persona}, quero {form.action}, para {form.benefit}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Persona</Label>
              <Input value={form.persona} onChange={(e) => setField("persona", e.target.value)} onBlur={() => save({ persona: form.persona })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ação</Label>
              <Input value={form.action} onChange={(e) => setField("action", e.target.value)} onBlur={() => save({ action: form.action })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Benefício</Label>
              <Input value={form.benefit} onChange={(e) => setField("benefit", e.target.value)} onBlur={() => save({ benefit: form.benefit })} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Story Points</Label>
              <PointsSelector value={form.story_points} onChange={(n) => save({ story_points: n })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">MoSCoW</Label>
              <Select value={form.moscow ?? ""} onValueChange={(v) => save({ moscow: v as Story["moscow"] })}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
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
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => save({ status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              onBlur={() => save({ description: form.description })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Acceptance Criteria (uma por linha)</Label>
            <Textarea
              rows={5}
              placeholder="Dado que... / Quando... / Então..."
              value={form.acceptance_criteria ?? ""}
              onChange={(e) => setField("acceptance_criteria", e.target.value)}
              onBlur={() => save({ acceptance_criteria: form.acceptance_criteria })}
            />
            {ac.length > 0 && (
              <p className="text-xs text-muted-foreground">{ac.length} critério(s)</p>
            )}
          </div>

          <INVESTChecker
            value={form}
            onChange={(invest) =>
              save({
                invest_independent: invest.invest_independent,
                invest_negotiable: invest.invest_negotiable,
                invest_valuable: invest.invest_valuable,
                invest_estimable: invest.invest_estimable,
                invest_small: invest.invest_small,
                invest_testable: invest.invest_testable,
              })
            }
          />

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Bloqueio</Label>
              <Button
                size="sm"
                variant={form.blocked ? "destructive" : "outline"}
                onClick={() => save({ blocked: !form.blocked })}
              >
                {form.blocked ? "Desbloquear" : "Marcar como bloqueada"}
              </Button>
            </div>
            {form.blocked && (
              <Textarea
                rows={2}
                placeholder="Motivo do bloqueio..."
                value={form.blocked_reason ?? ""}
                onChange={(e) => setField("blocked_reason", e.target.value)}
                onBlur={() => save({ blocked_reason: form.blocked_reason })}
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove.mutate()}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Deletar
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

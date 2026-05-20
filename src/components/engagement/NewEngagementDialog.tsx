import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateEngagement,
  type EspType,
  type EspModuleCode,
} from "@/hooks/useCreateEngagement";

const ESP_TYPES: { value: EspType; label: string }[] = [
  { value: "undetermined", label: "A definir" },
  { value: "consulting",   label: "Consultoria" },
  { value: "agent",        label: "Agente IA" },
  { value: "automation",   label: "Automação" },
  { value: "product",      label: "Produto" },
  { value: "hybrid",       label: "Híbrido" },
];

const MODULES: { code: EspModuleCode; label: string; hint: string }[] = [
  { code: "A", label: "Diagnóstico",   hint: "Briefing, contexto, escopo" },
  { code: "B", label: "Solução",       hint: "Arquitetura e plano técnico" },
  { code: "C", label: "Execução",      hint: "Sprints e entregas" },
  { code: "D", label: "Operação",      hint: "Handoff, runbook, suporte" },
  { code: "E", label: "Evolução",      hint: "Roadmap pós-entrega" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function NewEngagementDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateEngagement();

  const [clientName, setClientName] = useState("");
  const [espType, setEspType] = useState<EspType>("undetermined");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [modules, setModules] = useState<Record<EspModuleCode, boolean>>({
    A: true, B: false, C: false, D: false, E: false,
  });

  const canSubmit = clientName.trim().length >= 2 && !!startDate && !create.isPending;

  const reset = () => {
    setClientName("");
    setEspType("undetermined");
    setStartDate(today());
    setEndDate("");
    setBudget("");
    setModules({ A: true, B: false, C: false, D: false, E: false });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const selected = (Object.entries(modules) as [EspModuleCode, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k);

    try {
      const res = await create.mutateAsync({
        client_name: clientName,
        esp_type: espType,
        start_date: startDate,
        end_date: endDate || null,
        budget_brl_estimate: budget ? Number(budget.replace(",", ".")) : null,
        module_codes: selected,
      });
      toast({ title: "Engagement criado", description: clientName.trim() });
      onOpenChange(false);
      reset();
      navigate(`/engagements/${res.id}`);
    } catch (err) {
      toast({
        title: "Falha ao criar engagement",
        description: err instanceof Error ? err.message : "Erro inesperado",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo engagement</DialogTitle>
          <DialogDescription>
            Cria o engagement, o ESP package e os módulos iniciais. Você pode ajustar tudo depois no detalhe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Cliente</Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex.: XPAG Brasil"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo ESP</Label>
              <Select value={espType} onValueChange={(v) => setEspType(v as EspType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget estimado (BRL)</Label>
              <Input
                id="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="Opcional"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Início</Label>
              <Input
                id="start-date" type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">ETA (opcional)</Label>
              <Input
                id="end-date" type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Módulos iniciais</Label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {MODULES.map((m) => (
                <label
                  key={m.code}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border bg-card p-2.5 hover:border-primary/40"
                >
                  <Checkbox
                    checked={modules[m.code]}
                    onCheckedChange={(v) =>
                      setModules((s) => ({ ...s, [m.code]: v === true }))
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">
                      <span className="text-primary">{m.code}</span> · {m.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar engagement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

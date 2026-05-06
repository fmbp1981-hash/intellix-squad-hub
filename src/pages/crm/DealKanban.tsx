import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCrm } from "@/hooks/useCrm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
import type { Deal, DealStatus } from "@/types";

interface Stage {
  key: string;
  name: string;
  order: number;
  color: string;
  enabled: boolean;
}

export default function DealKanban() {
  const { deals } = useCrm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", scope_summary: "", value: "", probability: "50" });
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    supabase.from("crm_pipeline_stages").select("key,name,order,color,enabled").eq("enabled", true).order("order")
      .then(({ data }) => setStages((data ?? []) as Stage[]));
  }, []);

  const create = async () => {
    if (!form.company_name || !form.value) return toast.error("Preencha empresa e valor");
    const { error } = await supabase.from("deals").insert({
      company_name: form.company_name,
      scope_summary: form.scope_summary || form.company_name,
      value: parseFloat(form.value),
      probability: parseInt(form.probability),
    });
    if (error) toast.error(error.message);
    else { toast.success("Deal criado"); setOpen(false); setForm({ company_name: "", scope_summary: "", value: "", probability: "50" }); }
  };

  const move = async (deal: Deal, status: DealStatus) => {
    const { error } = await supabase.from("deals").update({ status }).eq("id", deal.id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Deals ({deals.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo deal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo deal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Empresa *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              <Textarea placeholder="Escopo resumido" value={form.scope_summary} onChange={(e) => setForm({ ...form, scope_summary: e.target.value })} />
              <Input type="number" placeholder="Valor (R$) *" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              <Input type="number" placeholder="Probabilidade %" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {deals.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum deal ainda.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map((col) => {
            const items = deals.filter((d) => d.status === col.key);
            return (
              <div key={col.key} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">{col.label} ({items.length})</h3>
                {items.map((d) => (
                  <Card key={d.id} className="p-3 space-y-2">
                    <p className="font-semibold text-sm">{d.company_name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{d.scope_summary}</p>
                    <p className="text-sm font-bold">R$ {Number(d.value).toLocaleString("pt-BR")}</p>
                    <Select value={d.status} onValueChange={(v) => move(d, v as DealStatus)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={async () => {
                        toast.info("Gerando insights da IA…");
                        const { data, error } = await supabase.functions.invoke("ai-deal-coach", { body: { dealId: d.id } });
                        if (error || data?.error) toast.error(data?.error ?? error?.message ?? "erro");
                        else toast.success(`IA: ${data?.insight?.win_probability}% de probabilidade`);
                      }}>
                        <Sparkles className="h-3 w-3" /> IA
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

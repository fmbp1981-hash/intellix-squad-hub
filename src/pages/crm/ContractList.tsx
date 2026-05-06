import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCrm } from "@/hooks/useCrm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ContractStatus } from "@/types";

const STATUSES: ContractStatus[] = ["draft","sent","signed","active","completed","cancelled"];

export default function ContractList() {
  const { contracts } = useCrm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_name: "", scope_md: "", total_value: "", start_date: new Date().toISOString().slice(0, 10) });

  const create = async () => {
    if (!form.client_name || !form.total_value) return toast.error("Preencha cliente e valor");
    const { error } = await supabase.from("contracts").insert({
      client_name: form.client_name,
      scope_md: form.scope_md || "TBD",
      total_value: parseFloat(form.total_value),
      start_date: form.start_date,
    });
    if (error) toast.error(error.message);
    else { toast.success("Contrato criado"); setOpen(false); }
  };

  const updateStatus = async (id: string, status: ContractStatus) => {
    const update = status === "signed"
      ? { status, signed_at: new Date().toISOString() }
      : { status };
    const { error } = await supabase.from("contracts").update(update).eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Contratos ({contracts.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo contrato</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo contrato</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Cliente *" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              <Textarea placeholder="Escopo (markdown)" value={form.scope_md} onChange={(e) => setForm({ ...form, scope_md: e.target.value })} />
              <Input type="number" placeholder="Valor total *" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} />
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {contracts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum contrato ainda.</Card>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <Card key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{c.client_name}</p>
                <p className="text-xs text-muted-foreground">Início: {c.start_date} · R$ {Number(c.total_value).toLocaleString("pt-BR")}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.signed_at && <Badge variant="outline">Assinado</Badge>}
                <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v as ContractStatus)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const TRIGGERS = [
  { value: "lead_created", label: "Lead criado" },
  { value: "lead_qualified", label: "Lead qualificado" },
  { value: "deal_stage_changed", label: "Estágio do deal mudou" },
  { value: "deal_won", label: "Deal ganho" },
  { value: "deal_lost", label: "Deal perdido" },
  { value: "contract_signed", label: "Contrato assinado" },
  { value: "engagement_blocked", label: "Engagement bloqueado" },
];

const ACTIONS = [
  { value: "create_activity", label: "Criar atividade no CRM" },
  { value: "send_notification", label: "Enviar notificação interna" },
  { value: "send_email", label: "Enviar e-mail" },
  { value: "trigger_ai_coach", label: "Disparar IA Sales Coach" },
];

export default function CrmAutomations() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", description: "", trigger_type: "deal_won", actions: [{ type: "trigger_ai_coach" }] });

  const load = async () => {
    const { data } = await supabase.from("crm_automations").select("*").order("created_at", { ascending: false });
    setRules(data ?? []); setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("crm_automations").on("postgres_changes", { event: "*", schema: "public", table: "crm_automations" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const toggle = async (id: string, enabled: boolean) => {
    await supabase.from("crm_automations").update({ enabled }).eq("id", id);
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir automação?")) return;
    await supabase.from("crm_automations").delete().eq("id", id);
    toast.success("Excluída");
  };
  const save = async () => {
    if (!form.name) { toast.error("Nome obrigatório"); return; }
    const { error } = await supabase.from("crm_automations").insert({
      name: form.name, description: form.description, trigger_type: form.trigger_type,
      conditions: [], actions: form.actions, enabled: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Automação criada");
    setOpen(false); setForm({ name: "", description: "", trigger_type: "deal_won", actions: [{ type: "trigger_ai_coach" }] });
  };

  const updateAction = (i: number, patch: any) => {
    const next = [...form.actions]; next[i] = { ...next[i], ...patch }; setForm({ ...form, actions: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Automações de CRM</h2>
          <p className="text-sm text-muted-foreground">Reaja a eventos do funil com ações automáticas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nova regra</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova automação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Textarea placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div>
                <label className="text-xs font-medium">Quando ocorrer:</label>
                <Select value={form.trigger_type} onValueChange={v => setForm({ ...form, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Ações:</label>
                {form.actions.map((a: any, i: number) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <Select value={a.type} onValueChange={v => updateAction(i, { type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ACTIONS.map(x => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {a.type === "create_activity" && (
                      <Input placeholder="Assunto da atividade" value={a.subject ?? ""} onChange={e => updateAction(i, { subject: e.target.value })} />
                    )}
                    {a.type === "send_notification" && (
                      <>
                        <Input placeholder="Título" value={a.title ?? ""} onChange={e => updateAction(i, { title: e.target.value })} />
                        <Input placeholder="Mensagem" value={a.body ?? ""} onChange={e => updateAction(i, { body: e.target.value })} />
                      </>
                    )}
                    {a.type === "send_email" && (
                      <>
                        <Input placeholder="Para (e-mail)" value={a.to ?? ""} onChange={e => updateAction(i, { to: e.target.value })} />
                        <Input placeholder="Assunto" value={a.subject ?? ""} onChange={e => updateAction(i, { subject: e.target.value })} />
                        <Textarea placeholder="HTML do e-mail" value={a.body ?? ""} onChange={e => updateAction(i, { body: e.target.value })} />
                      </>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, actions: [...form.actions, { type: "send_notification" }] })}>+ Ação</Button>
              </div>
              <Button onClick={save} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
        <div className="grid gap-3">
          {rules.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma automação. Crie a primeira regra.</CardContent></Card>}
          {rules.map(r => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{r.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Quando: {TRIGGERS.find(t => t.value === r.trigger_type)?.label ?? r.trigger_type}</Badge>
                  {(r.actions ?? []).map((a: any, i: number) => (
                    <Badge key={i} variant="secondary">→ {ACTIONS.find(x => x.value === a.type)?.label ?? a.type}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

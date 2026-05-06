import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Webhook, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { useSendEmail } from "@/hooks/useSendEmail";

const EVENTS = ["deal_won", "deal_lost", "lead_qualified", "contract_signed", "sprint_completed", "impediment_critical", "*"];

export default function IntegrationsPage() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", url: "", events: ["deal_won"], secret: "" });

  const load = async () => {
    const { data } = await supabase.from("outbound_webhooks").select("*").order("created_at", { ascending: false });
    setHooks(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.url) { toast.error("Nome e URL obrigatórios"); return; }
    const secret = form.secret || crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("outbound_webhooks").insert({ name: form.name, url: form.url, events: form.events, secret, enabled: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Webhook criado. Guarde o secret: " + secret);
    setOpen(false); setForm({ name: "", url: "", events: ["deal_won"], secret: "" }); load();
  };
  const toggle = async (id: string, enabled: boolean) => { await supabase.from("outbound_webhooks").update({ enabled }).eq("id", id); load(); };
  const remove = async (id: string) => { if (!confirm("Excluir?")) return; await supabase.from("outbound_webhooks").delete().eq("id", id); load(); };

  const toggleEvent = (ev: string) => {
    setForm({ ...form, events: form.events.includes(ev) ? form.events.filter((e: string) => e !== ev) : [...form.events, ev] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-sm text-muted-foreground">E-mail, webhooks de saída e conectores externos.</p>
      </div>

      <ResendCard />



      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5 text-primary" /> Webhooks de saída</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo webhook</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="URL https://…" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
                <Input placeholder="Secret (deixe vazio para gerar)" value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} />
                <div>
                  <label className="text-xs font-medium">Eventos:</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {EVENTS.map(ev => (
                      <Badge key={ev} variant={form.events.includes(ev) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleEvent(ev)}>{ev}</Badge>
                    ))}
                  </div>
                </div>
                <Button onClick={save} className="w-full">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {hooks.length === 0 && <p className="text-sm text-muted-foreground">Nenhum webhook configurado.</p>}
          {hooks.map(h => (
            <div key={h.id} className="border rounded p-3 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-medium text-sm">{h.name}</div>
                <div className="text-xs text-muted-foreground truncate">{h.url}</div>
                <div className="flex gap-1 mt-1 flex-wrap">{h.events.map((e: string) => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}</div>
                {h.last_delivery_status && <div className="text-xs mt-1">Última: {h.last_delivery_status} ({new Date(h.last_delivery_at).toLocaleString("pt-BR")})</div>}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={h.enabled} onCheckedChange={(v) => toggle(h.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

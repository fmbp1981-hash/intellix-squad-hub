import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, Mail, Calendar, MessageSquare, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<string, any> = { call: Phone, email: Mail, meeting: Calendar, whatsapp: MessageSquare, note: FileText };

export default function CrmActivities() {
  const [acts, setActs] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: "note", subject: "", body: "", deal_id: "", lead_id: "" });

  const load = async () => {
    setLoading(true);
    const [a, d, l] = await Promise.all([
      supabase.from("crm_activities").select("*").order("occurred_at", { ascending: false }).limit(100),
      supabase.from("deals").select("id,company_name"),
      supabase.from("leads").select("id,company_name"),
    ]);
    setActs(a.data ?? []); setDeals(d.data ?? []); setLeads(l.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("crm_activities").on("postgres_changes", { event: "*", schema: "public", table: "crm_activities" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const save = async () => {
    if (!form.subject) { toast.error("Assunto obrigatório"); return; }
    const payload: any = { type: form.type, subject: form.subject, body: form.body };
    if (form.deal_id) payload.deal_id = form.deal_id;
    if (form.lead_id) payload.lead_id = form.lead_id;
    const { error } = await supabase.from("crm_activities").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Atividade registrada");
    setOpen(false); setForm({ type: "note", subject: "", body: "", deal_id: "", lead_id: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-semibold">Timeline de Atividades</h2></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nova atividade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar atividade</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Nota</SelectItem>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Assunto" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              <Textarea placeholder="Detalhes" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
              <Select value={form.deal_id} onValueChange={v => setForm({ ...form, deal_id: v })}>
                <SelectTrigger><SelectValue placeholder="Deal (opcional)" /></SelectTrigger>
                <SelectContent>{deals.map(d => <SelectItem key={d.id} value={d.id}>{d.company_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.lead_id} onValueChange={v => setForm({ ...form, lead_id: v })}>
                <SelectTrigger><SelectValue placeholder="Lead (opcional)" /></SelectTrigger>
                <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={save} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
        <Card>
          <CardContent className="p-0 divide-y">
            {acts.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma atividade registrada.</div>}
            {acts.map(a => {
              const Icon = ICONS[a.type] ?? FileText;
              const deal = deals.find(d => d.id === a.deal_id);
              const lead = leads.find(l => l.id === a.lead_id);
              return (
                <div key={a.id} className="p-4 flex gap-3">
                  <div className="rounded-full bg-primary/10 p-2 h-fit"><Icon className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{a.subject}</span>
                      <Badge variant="outline" className="text-xs">{a.type}</Badge>
                      {deal && <Badge variant="secondary" className="text-xs">Deal: {deal.company_name}</Badge>}
                      {lead && <Badge variant="secondary" className="text-xs">Lead: {lead.company_name}</Badge>}
                    </div>
                    {a.body && <p className="text-sm text-muted-foreground mt-1">{a.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(a.occurred_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCrm } from "@/hooks/useCrm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { LeadStatus } from "@/types";

const SOURCES = ["inbound_site","inbound_referral","outbound_prospect","event","linkedin","whatsapp","indication"] as const;
const STATUSES: LeadStatus[] = ["new","contacted","qualifying","qualified","disqualified","converted"];

const STATUS_COLOR: Record<LeadStatus, string> = {
  new: "bg-muted",
  contacted: "bg-blue-500/20 text-blue-300",
  qualifying: "bg-amber-500/20 text-amber-300",
  qualified: "bg-emerald-500/20 text-emerald-300",
  disqualified: "bg-destructive/20 text-destructive",
  converted: "bg-primary/20 text-primary",
};

export default function LeadList() {
  const { leads } = useCrm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_name: "", contact_email: "", source: "inbound_site", score: "" });

  const create = async () => {
    if (!form.company_name) return toast.error("Informe a empresa");
    const { error } = await supabase.from("leads").insert({
      company_name: form.company_name,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      source: form.source,
      score: form.score ? parseInt(form.score) : null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Lead criado");
      setOpen(false);
      setForm({ company_name: "", contact_name: "", contact_email: "", source: "inbound_site", score: "" });
    }
  };

  const updateStatus = async (id: string, status: LeadStatus) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Leads ({leads.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Empresa *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              <Input placeholder="Contato" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              <Input placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Score (0-100)" type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {leads.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum lead ainda. Crie o primeiro.</Card>
      ) : (
        <div className="space-y-2">
          {leads.map((l) => (
            <Card key={l.id} className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{l.company_name}</p>
                  {l.score !== null && <Badge variant="outline">Score {l.score}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {l.contact_name ?? "—"} · {l.contact_email ?? "—"} · {l.source}
                </p>
              </div>
              <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v as LeadStatus)}>
                <SelectTrigger className={`w-40 ${STATUS_COLOR[l.status]}`}><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

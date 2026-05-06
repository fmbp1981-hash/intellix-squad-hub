import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Plus, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const impactMeta: Record<string, { label: string; tone: string; slaH: number }> = {
  critical: { label: "Crítico", tone: "bg-destructive text-destructive-foreground", slaH: 4 },
  high: { label: "Alto", tone: "bg-orange-500/20 text-orange-400", slaH: 24 },
  medium: { label: "Médio", tone: "bg-yellow-500/20 text-yellow-400", slaH: 72 },
  low: { label: "Baixo", tone: "bg-muted text-muted-foreground", slaH: 168 },
};

export default function ImpedimentsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: impediments } = useQuery({
    enabled: !!projectId,
    queryKey: ["impediments", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("impediments")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!projectId) return;
    const ch = supabase.channel(`imp-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "impediments", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["impediments", projectId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, qc]);

  const resolve = async (id: string, resolution: string) => {
    await supabase.from("impediments").update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolution,
    }).eq("id", id);
    toast.success("Impedimento resolvido");
  };

  const open_ = impediments?.filter(i => i.status === "open") ?? [];
  const resolved = impediments?.filter(i => i.status === "resolved") ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-400" /> Impediment Log
          </h1>
          <p className="text-sm text-muted-foreground">Registro e SLA de impedimentos</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo Impedimento</Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <KPI label="Abertos" value={open_.length} tone={open_.length > 0 ? "text-orange-400" : ""} />
        <KPI label="SLA estourado" value={open_.filter(i => slaBreached(i)).length} tone="text-destructive" />
        <KPI label="Resolvidos" value={resolved.length} tone="text-emerald-400" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">ABERTOS ({open_.length})</h2>
        {open_.length === 0 && <p className="text-sm text-muted-foreground">Nenhum impedimento aberto 🎉</p>}
        {open_.map((i: any) => (
          <ImpedimentCard key={i.id} item={i} onResolve={resolve} />
        ))}
      </section>

      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">RESOLVIDOS ({resolved.length})</h2>
          {resolved.slice(0, 10).map((i: any) => (
            <ImpedimentCard key={i.id} item={i} onResolve={resolve} />
          ))}
        </section>
      )}

      <CreateDialog open={open} onOpenChange={setOpen} projectId={projectId!} />
    </div>
  );
}

function slaBreached(i: any) {
  if (i.status !== "open") return false;
  const sla = impactMeta[i.impact]?.slaH ?? 168;
  return (Date.now() - new Date(i.created_at).getTime()) / 3600000 > sla;
}

function ImpedimentCard({ item, onResolve }: any) {
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const meta = impactMeta[item.impact] ?? impactMeta.medium;
  const breached = slaBreached(item);
  const ageH = (Date.now() - new Date(item.created_at).getTime()) / 3600000;

  return (
    <Card className={breached ? "border-destructive/40" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Badge className={meta.tone} variant="secondary">{meta.label}</Badge>
            <CardTitle className="text-base">{item.title}</CardTitle>
          </div>
          {item.status === "open" ? (
            <Button size="sm" variant="outline" onClick={() => setResolveOpen(true)}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Resolver
            </Button>
          ) : (
            <Badge variant="outline" className="text-emerald-400">Resolvido</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {item.description && <p className="text-muted-foreground">{item.description}</p>}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {ageH < 24 ? `${ageH.toFixed(0)}h` : `${(ageH / 24).toFixed(1)}d`}</span>
          {breached && <span className="font-semibold text-destructive">⚠ SLA estourado ({meta.slaH}h)</span>}
        </div>
        {item.ai_suggested_resolution && (
          <details className="rounded border border-primary/20 bg-primary/5 p-2 text-xs">
            <summary className="cursor-pointer font-medium text-primary">💡 Sugestão da IA</summary>
            <p className="mt-2 whitespace-pre-wrap">{item.ai_suggested_resolution}</p>
          </details>
        )}
        {item.resolution && (
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs">
            <p className="font-medium text-emerald-400">Resolução:</p>
            <p className="mt-1 whitespace-pre-wrap">{item.resolution}</p>
          </div>
        )}
      </CardContent>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolver impedimento</DialogTitle></DialogHeader>
          <Textarea rows={5} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Descreva como foi resolvido…" />
          <DialogFooter>
            <Button onClick={() => { onResolve(item.id, resolution); setResolveOpen(false); }} disabled={!resolution}>
              Confirmar resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateDialog({ open, onOpenChange, projectId }: any) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [impact, setImpact] = useState("medium");

  const submit = async () => {
    const { error } = await supabase.from("impediments").insert({
      project_id: projectId,
      title,
      description: desc,
      impact,
      status: "open",
    });
    if (error) toast.error(error.message);
    else { toast.success("Impedimento registrado"); setTitle(""); setDesc(""); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Impedimento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título *" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Descrição" rows={4} value={desc} onChange={e => setDesc(e.target.value)} />
          <Select value={impact} onValueChange={setImpact}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Crítico (SLA 4h)</SelectItem>
              <SelectItem value="high">Alto (SLA 24h)</SelectItem>
              <SelectItem value="medium">Médio (SLA 72h)</SelectItem>
              <SelectItem value="low">Baixo (SLA 7d)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter><Button onClick={submit} disabled={!title}>Registrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KPI({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><p className={`text-2xl font-semibold ${tone}`}>{value}</p></CardContent>
    </Card>
  );
}

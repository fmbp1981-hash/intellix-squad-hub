import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Info, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const DEFAULT_DOD = `- Critérios de aceite verificados
- Funcionalidade demonstrável ao PO
- Sem impedimentos críticos abertos
- PO notificado (48h para aceite)`;

export default function NewProject() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("scrum");
  const [clientName, setClientName] = useState("");
  const [engagementId, setEngagementId] = useState<string>("none");
  const [duration, setDuration] = useState(14);
  const [wipInProgress, setWipInProgress] = useState(5);
  const [wipReview, setWipReview] = useState(3);
  const [dod, setDod] = useState(DEFAULT_DOD);
  const [triggerAI, setTriggerAI] = useState(true);

  const { data: engagements } = useQuery({
    queryKey: ["engagements-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("engagements")
        .select("id, name, workspace_id")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (engagementId !== "none" && engagements) {
      const eng = engagements.find((e) => e.id === engagementId);
      if (eng && !name) setName(eng.name);
    }
  }, [engagementId, engagements, name]);

  const create = useMutation({
    mutationFn: async () => {
      const eng = engagements?.find((e) => e.id === engagementId);
      const { data, error } = await supabase
        .from("agile_projects")
        .insert({
          name,
          description: description || null,
          project_type: type,
          client_name: clientName || null,
          engagement_id: engagementId === "none" ? null : engagementId,
          workspace_id: eng?.workspace_id ?? null,
          sprint_duration_days: duration,
          wip_limit_in_progress: wipInProgress,
          wip_limit_review: wipReview,
          definition_of_done: dod,
          status: "planning",
          auto_planning_status: triggerAI ? "pending" : "completed",
        })
        .select("id")
        .single();
      if (error) throw error;
      if (triggerAI && data?.id) {
        supabase.functions.invoke("operations-detail-project", {
          body: { project_id: data.id, mode: "initial" },
        }).catch(() => {});
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success("Projeto criado");
      navigate(`/projects/${data.id}`);
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao criar"),
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Novo Projeto Ágil</h1>
        <p className="text-sm text-muted-foreground">Configure os parâmetros iniciais do projeto.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do projeto *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: IntelliX @ Acme Corp" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Engagement vinculado</Label>
              <Select value={engagementId} onValueChange={setEngagementId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {engagements?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metodologia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scrum">Scrum</SelectItem>
                  <SelectItem value="kanban">Kanban</SelectItem>
                  <SelectItem value="scrumban">Scrumban</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sprint (dias)</Label>
              <Input type="number" min={1} max={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>WIP — In Progress</Label>
              <Input type="number" min={1} value={wipInProgress} onChange={(e) => setWipInProgress(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>WIP — In Review</Label>
              <Input type="number" min={1} value={wipReview} onChange={(e) => setWipReview(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Definition of Done</Label>
            <Textarea value={dod} onChange={(e) => setDod(e.target.value)} rows={5} className="font-mono text-xs" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          Cancelar
        </Button>
        <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
          Criar projeto
        </Button>
      </div>
    </div>
  );
}

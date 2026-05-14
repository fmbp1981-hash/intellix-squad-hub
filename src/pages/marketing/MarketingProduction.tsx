import { useState } from "react";
import { useContentDrafts } from "@/hooks/useContentDrafts";
import { CopyEditor } from "@/components/marketing/CopyEditor";
import { VisualBriefViewer } from "@/components/marketing/VisualBriefViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLS = ["draft", "review", "approved", "rejected"] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", review: "Revisão", approved: "Aprovado", rejected: "Rejeitado",
};

export default function MarketingProduction() {
  const { query, updateDraft, triggerReview } = useContentDrafts();
  const [editing, setEditing] = useState<any>(null);
  const [caption, setCaption] = useState("");

  const drafts = query.data ?? [];

  const openEdit = (d: any) => {
    setEditing(d);
    setCaption(d.caption ?? "");
  };

  const saveCaption = async () => {
    if (!editing) return;
    await updateDraft.mutateAsync({ id: editing.id, patch: { caption } });
    toast.success("Copy atualizada");
    setEditing(null);
  };

  const sendToReview = async (draftId: string) => {
    try {
      await triggerReview.mutateAsync(draftId);
      toast.success("Enviado para revisão da Sofia…");
    } catch {
      toast.error("Erro ao enviar para revisão");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Produção</h2>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Atualizar
        </Button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {STATUS_COLS.map((status) => {
          const col = drafts.filter((d) => d.status === status);
          return (
            <div key={status} className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{STATUS_LABELS[status]}</p>
                <Badge variant="secondary" className="text-[10px]">{col.length}</Badge>
              </div>
              <div className="space-y-2">
                {col.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <p className="line-clamp-2 text-xs font-medium">{d.hook}</p>
                    {d.forbidden_terms_found?.length > 0 && (
                      <p className="text-[10px] text-destructive">⚠ {d.forbidden_terms_found.join(", ")}</p>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 flex-1" onClick={() => openEdit(d)}>
                        Editar
                      </Button>
                      {status === "draft" && (
                        <Button size="sm" className="h-6 text-[10px] px-2 flex-1" onClick={() => sendToReview(d.id)}>
                          Revisar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {col.length === 0 && <p className="text-center text-[10px] text-muted-foreground py-3">Vazio</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog de edição */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Copy</DialogTitle>
          </DialogHeader>
          {editing && (
            <Tabs defaultValue="copy">
              <TabsList>
                <TabsTrigger value="copy">Copy</TabsTrigger>
                <TabsTrigger value="visual">Visual</TabsTrigger>
                <TabsTrigger value="review">Revisão</TabsTrigger>
              </TabsList>
              <TabsContent value="copy" className="space-y-3 pt-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Gancho</p>
                  <p className="rounded-md bg-muted/50 p-2 text-sm font-medium">{editing.hook}</p>
                </div>
                <CopyEditor
                  label="Legenda"
                  value={caption}
                  onChange={setCaption}
                  rows={8}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                  <Button onClick={saveCaption} disabled={updateDraft.isPending}>Salvar</Button>
                </div>
              </TabsContent>
              <TabsContent value="visual" className="pt-3">
                {editing.visual_briefs?.[0] ? (
                  <VisualBriefViewer
                    bgColor={editing.visual_briefs[0].bg_color}
                    accentColor={editing.visual_briefs[0].accent_color}
                    primaryColor={editing.visual_briefs[0].primary_color}
                    canvaMasterPrompt={editing.visual_briefs[0].canva_master_prompt}
                    slideSpecs={editing.visual_briefs[0].slide_specs}
                    coverStyle={editing.visual_briefs[0].cover_style}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Briefing visual ainda não gerado.</p>
                )}
              </TabsContent>
              <TabsContent value="review" className="pt-3">
                {editing.review_results?.[0] ? (
                  <div className="space-y-3">
                    <Badge className={cn(editing.review_results[0].status === "approved" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
                      {editing.review_results[0].status}
                    </Badge>
                    {editing.review_results[0].issues_found?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Problemas:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {editing.review_results[0].issues_found.map((issue: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {editing.review_results[0].suggestions && (
                      <p className="text-xs text-muted-foreground">{editing.review_results[0].suggestions}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ainda não revisado pela Sofia.</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

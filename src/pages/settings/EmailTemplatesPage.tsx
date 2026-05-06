import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Eye, Send, Mail } from "lucide-react";
import { useEmailTemplates, renderTemplate, type EmailTemplate } from "@/hooks/useEmailTemplates";
import { useSendEmail } from "@/hooks/useSendEmail";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const empty: Partial<EmailTemplate> = { key: "", name: "", subject: "", html: "", text: "", description: "", variables: [], enabled: true };

export default function EmailTemplatesPage() {
  const { templates, loading, save, remove } = useEmailTemplates();
  const [editing, setEditing] = useState<Partial<EmailTemplate> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const { send, loading: sending } = useSendEmail();

  const open = (t?: EmailTemplate) => setEditing(t ? { ...t } : { ...empty });
  const close = () => setEditing(null);

  const onSave = async () => {
    if (!editing?.key || !editing.name || !editing.subject || !editing.html) {
      toast.error("Preencha key, nome, assunto e HTML");
      return;
    }
    const ok = await save(editing as any);
    if (ok) close();
  };

  const previewSubject = useMemo(() => editing ? renderTemplate(editing.subject ?? "", previewVars) : "", [editing, previewVars]);
  const previewHtml = useMemo(() => editing ? renderTemplate(editing.html ?? "", previewVars) : "", [editing, previewVars]);

  const sendTest = async () => {
    const { data } = await supabase.auth.getUser();
    const to = data.user?.email;
    if (!to) { toast.error("Sem usuário logado"); return; }
    if (!editing?.key) { toast.error("Salve o template antes de testar"); return; }
    const r = await send({ to, template_key: editing.key, variables: previewVars, silent: true });
    if (r.ok) toast.success(`Enviado para ${to}`);
    else if (r.skipped) toast.warning(r.reason ?? "Conector não conectado");
    else toast.error(r.error ?? "Falha");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-primary"/> Templates de E-mail</h2>
          <p className="text-sm text-muted-foreground">Modelos reutilizáveis com placeholders <code className="bg-muted px-1 rounded">{'{{nome}}'}</code>.</p>
        </div>
        <Button onClick={() => open()} className="gap-2"><Plus className="h-4 w-4" /> Novo template</Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="cursor-pointer hover:border-primary/50" onClick={() => open(t)}>
            <CardHeader className="flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="text-xs text-muted-foreground">key: <code>{t.key}</code></p>
              </div>
              <Badge variant={t.enabled ? "default" : "outline"}>{t.enabled ? "Ativo" : "Inativo"}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <p className="text-sm font-medium truncate">{t.subject}</p>
              {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
              <div className="flex flex-wrap gap-1">
                {(t.variables ?? []).map((v: string) => <Badge key={v} variant="outline" className="text-xs">{v}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && templates.length === 0 && <p className="text-sm text-muted-foreground">Nenhum template ainda.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar template" : "Novo template"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Key (única)</Label>
                  <Input value={editing.key ?? ""} onChange={(e) => setEditing({ ...editing, key: e.target.value })} placeholder="ex: deal_won_welcome" disabled={!!editing.id} />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Assunto</Label>
                <Input value={editing.subject ?? ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
              </div>
              <div>
                <Label>HTML</Label>
                <Textarea rows={8} className="font-mono text-xs" value={editing.html ?? ""} onChange={(e) => setEditing({ ...editing, html: e.target.value })} />
              </div>
              <div>
                <Label>Texto (opcional)</Label>
                <Textarea rows={3} className="font-mono text-xs" value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              </div>
              <div>
                <Label>Variáveis (separadas por vírgula)</Label>
                <Input
                  value={(editing.variables ?? []).join(", ")}
                  onChange={(e) => setEditing({ ...editing, variables: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                  placeholder="nome, empresa, valor"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.enabled ?? true} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} />
                <Label>Ativo</Label>
              </div>

              <div className="border-t pt-3 space-y-2">
                <Label className="flex items-center gap-1"><Eye className="h-3 w-3" /> Pré-visualização</Label>
                <div className="grid gap-2">
                  {(editing.variables ?? []).map((v: string) => (
                    <div key={v} className="flex items-center gap-2">
                      <span className="text-xs w-24 font-mono">{v}</span>
                      <Input className="h-8" value={previewVars[v] ?? ""} onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })} placeholder={`valor de ${v}`} />
                    </div>
                  ))}
                </div>
                <div className="border rounded p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Assunto:</p>
                  <p className="font-semibold text-sm mb-2">{previewSubject || <span className="text-muted-foreground italic">vazio</span>}</p>
                  <p className="text-xs text-muted-foreground mb-1">Corpo:</p>
                  <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {editing?.id && (
              <Button variant="destructive" size="sm" className="gap-1 mr-auto" onClick={async () => { if (confirm("Excluir?")) { await remove(editing.id!); close(); } }}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
            <Button variant="outline" onClick={sendTest} disabled={sending} className="gap-1">
              <Send className="h-4 w-4" /> Enviar teste
            </Button>
            <Button onClick={onSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

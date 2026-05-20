import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";

export default function TemplatesSettings() {
  const navigate = useNavigate();
  const { templates, loading, save } = useEmailTemplates();

  const onToggle = async (id: string, currentEnabled: boolean, t: typeof templates[number]) => {
    await save({
      id,
      key: t.key,
      name: t.name,
      subject: t.subject,
      html: t.html,
      text: t.text,
      description: t.description,
      variables: t.variables,
      enabled: !currentEnabled,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Configurações
          </Button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Modelos transacionais reutilizados em emails do squad e do CRM.
          </p>
        </div>
        <Button onClick={() => navigate("/settings/email-templates")}>
          <Pencil className="mr-2 h-4 w-4" /> Editor avançado
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
          <p className="text-sm font-medium text-foreground">Nenhum template cadastrado.</p>
          <Button className="mt-3" onClick={() => navigate("/settings/email-templates")}>
            Criar no editor avançado
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="grid grid-cols-12 gap-3 border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-5">Template</div>
            <div className="col-span-3">Key</div>
            <div className="col-span-2">Variáveis</div>
            <div className="col-span-2 text-right">Ativo</div>
          </div>
          {templates.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
            >
              <div className="col-span-5 flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
                </div>
              </div>
              <div className="col-span-3">
                <Badge variant="outline" className="font-mono text-[10px]">{t.key}</Badge>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">
                {t.variables.length > 0 ? t.variables.join(", ") : "—"}
              </div>
              <div className="col-span-2 flex justify-end">
                <Switch
                  checked={t.enabled}
                  onCheckedChange={() => onToggle(t.id, t.enabled, t)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

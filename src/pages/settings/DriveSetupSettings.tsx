import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FolderPlus } from "lucide-react";
import { toast } from "sonner";

type DriveFolder = {
  id: string;
  scope: string;
  scope_id: string | null;
  folder_id: string;
  folder_url: string | null;
  created_at: string;
};

type DriveSetup = {
  id?: string;
  workspace_id: string | null;
  provider: string;
  root_folder_id: string | null;
  root_folder_url: string | null;
  auto_create_folders: boolean;
  folder_template: any;
  status: string;
};

const DEFAULT_TEMPLATE = {
  engagement: "/Clients/{client}/{engagement}",
  project: "/Projects/{project}",
};

export default function DriveSetupSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<DriveSetup>({
    workspace_id: null,
    provider: "none",
    root_folder_id: "",
    root_folder_url: "",
    auto_create_folders: true,
    folder_template: DEFAULT_TEMPLATE,
    status: "disconnected",
  });
  const [templateText, setTemplateText] = useState(JSON.stringify(DEFAULT_TEMPLATE, null, 2));
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [folderName, setFolderName] = useState("Intellix Squad Hub");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const loadFolders = async () => {
    const { data } = await supabase
      .from("drive_settings")
      .select("*")
      .order("created_at", { ascending: false });
    setFolders((data ?? []) as DriveFolder[]);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("drive_setup")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setConfig(data as DriveSetup);
        setTemplateText(JSON.stringify(data.folder_template ?? DEFAULT_TEMPLATE, null, 2));
      }
      await loadFolders();
      setLoading(false);
    })();
  }, []);

  const createDriveFolder = async () => {
    setCreatingFolder(true);
    const { data, error } = await supabase.functions.invoke("drive-setup", {
      body: { name: folderName, scope: "root" },
    });
    setCreatingFolder(false);
    if (error) return toast.error(error.message);
    toast.success(`Pasta "${data?.name}" criada no Drive`);
    loadFolders();
  };

  const save = async () => {
    let parsedTemplate: any = DEFAULT_TEMPLATE;
    try {
      parsedTemplate = JSON.parse(templateText);
    } catch {
      return toast.error("Template de pasta com JSON inválido");
    }

    setSaving(true);
    const payload = {
      workspace_id: config.workspace_id,
      provider: config.provider,
      root_folder_id: config.root_folder_id || null,
      root_folder_url: config.root_folder_url || null,
      auto_create_folders: config.auto_create_folders,
      folder_template: parsedTemplate,
      status: config.provider === "none" ? "disconnected" : "configured",
    };

    const { error } = config.id
      ? await supabase.from("drive_setup").update(payload).eq("id", config.id)
      : await supabase.from("drive_setup").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drive Setup</h1>
          <p className="text-sm text-muted-foreground">
            Configure o destino dos arquivos gerados pelos squads.
          </p>
        </div>
        <Badge variant={config.status === "connected" ? "default" : "secondary"}>
          {config.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Provedor</Label>
            <Select
              value={config.provider}
              onValueChange={(v) => setConfig({ ...config, provider: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="google_drive">Google Drive</SelectItem>
                <SelectItem value="onedrive">Microsoft OneDrive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Root Folder ID</Label>
              <Input
                value={config.root_folder_id ?? ""}
                onChange={(e) => setConfig({ ...config, root_folder_id: e.target.value })}
                placeholder="abc123..."
              />
            </div>
            <div>
              <Label>Root Folder URL</Label>
              <Input
                value={config.root_folder_url ?? ""}
                onChange={(e) => setConfig({ ...config, root_folder_url: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Criar pastas automaticamente</p>
              <p className="text-xs text-muted-foreground">
                Cria estrutura de pastas para cada engagement/projeto.
              </p>
            </div>
            <Switch
              checked={config.auto_create_folders}
              onCheckedChange={(v) => setConfig({ ...config, auto_create_folders: v })}
            />
          </div>

          <div>
            <Label>Templates de pasta (JSON)</Label>
            <Textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="font-mono text-xs"
              rows={6}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Variáveis: <code>{"{client}"}</code>, <code>{"{engagement}"}</code>, <code>{"{project}"}</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              variant="outline"
              disabled={config.provider === "none"}
              onClick={() => toast.info("Conexão OAuth real será habilitada via connector em breve.")}
            >
              Testar conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderPlus className="h-4 w-4" /> Pastas no Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Cria uma pasta na conta Google Drive conectada via Lovable Connector.
          </p>
          <div className="flex gap-2">
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Nome da pasta"
            />
            <Button onClick={createDriveFolder} disabled={creatingFolder || !folderName.trim()}>
              {creatingFolder ? "Criando…" : "Criar pasta"}
            </Button>
          </div>

          {folders.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma pasta criada ainda.</p>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {folders.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.scope}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{f.folder_id}</p>
                  </div>
                  {f.folder_url && (
                    <Button asChild variant="ghost" size="sm">
                      <a href={f.folder_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

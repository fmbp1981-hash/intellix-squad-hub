import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { LLM_CONFIGS, MARKETING_SQUAD_LLM_DEFAULTS } from "@/lib/llm-catalog";

type Agent = {
  id: string;
  name: string;
  role: string;
  llm_config_key: string;
  active: boolean;
};

type SecretStatus = {
  key: string;
  label: string;
  desc: string;
  isSet: boolean;
  masked: string;
  updated_at?: string;
};

const SECRET_META: { key: string; label: string; desc: string }[] = [
  { key: "LOVABLE_API_KEY",      label: "Lovable AI Gateway",    desc: "Gateway para todos os modelos LLM" },
  { key: "BRAVE_SEARCH_API_KEY", label: "Brave Search",          desc: "search.brave.com/app — Free: 2k req/mês" },
  { key: "GOOGLE_AI_API_KEY",    label: "Google AI (Gemini)",    desc: "aistudio.google.com" },
  { key: "APIFY_API_TOKEN",      label: "Apify (Otto — Instagram)", desc: "console.apify.com" },
  { key: "ANTHROPIC_API_KEY",    label: "Anthropic (Claude)",    desc: "console.anthropic.com" },
];

function SecretRow({ meta, initial, onSaved }: {
  meta: { key: string; label: string; desc: string };
  initial: SecretStatus | undefined;
  onSaved: (key: string, isSet: boolean, masked: string) => void;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-secret`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ key: meta.key, value: value.trim() }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar");
      const masked = value.length > 8
        ? value.substring(0, 4) + "****" + value.slice(-4)
        : "****";
      onSaved(meta.key, true, masked);
      setValue("");
      toast.success(`${meta.label} salvo com sucesso`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-border/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-mono font-medium">{meta.key}</p>
          <p className="text-xs text-muted-foreground">{meta.label} — {meta.desc}</p>
        </div>
        {initial?.isSet ? (
          <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-600 bg-green-500/10 gap-1">
            <Check className="h-3 w-3" /> configurado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-600 bg-yellow-500/10">
            não configurado
          </Badge>
        )}
      </div>
      {initial?.isSet && (
        <p className="text-[11px] font-mono text-muted-foreground">{initial.masked}</p>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            placeholder={initial?.isSet ? "Nova chave (deixe vazio para manter)" : "Cole sua chave aqui…"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pr-9 h-8 text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!value.trim() || saving}
          onClick={handleSave}
          className="h-8 gap-1.5"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

export default function MarketingSettings() {
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [strategy, setStrategy]   = useState<any>(null);
  const [autoResearch, setAutoResearch] = useState(true);
  const [secrets, setSecrets]     = useState<Record<string, SecretStatus>>({});
  const [secretsLoading, setSecretsLoading] = useState(true);

  const loadSecrets = useCallback(async () => {
    setSecretsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-secret`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (!res.ok) throw new Error("Erro ao carregar secrets");
      const rows: { key: string; masked: string; isSet: boolean; description: string; updated_at: string }[] = await res.json();
      const map: Record<string, SecretStatus> = {};
      for (const row of rows) {
        const meta = SECRET_META.find((m) => m.key === row.key);
        map[row.key] = {
          key: row.key,
          label: meta?.label ?? row.key,
          desc: meta?.desc ?? row.description ?? "",
          isSet: row.isSet,
          masked: row.masked,
          updated_at: row.updated_at,
        };
      }
      setSecrets(map);
    } catch {
      // non-fatal — secrets card will still render with unknown status
    } finally {
      setSecretsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: agentData }, { data: strat }] = await Promise.all([
      supabase
        .from("agent_configs")
        .select("id,name,role,llm_config_key,active,squad_name")
        .eq("squad_name", "Marketing Interno")
        .order("name"),
      supabase
        .from("strategy_context")
        .select("value")
        .eq("key", "intellix_instagram_strategy")
        .single(),
    ]);
    setAgents((agentData ?? []) as Agent[]);
    setStrategy((strat as any)?.value ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadSecrets();
  }, [load, loadSecrets]);

  const saveAgent = async (agent: Agent) => {
    const { error } = await supabase
      .from("agent_configs")
      .update({ llm_config_key: agent.llm_config_key, active: agent.active })
      .eq("id", agent.id);
    if (error) return toast.error(error.message);
    toast.success(`${agent.name} salvo`);
  };

  const updateAgent = (id: string, patch: Partial<Agent>) =>
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const handleSecretSaved = (key: string, isSet: boolean, masked: string) => {
    setSecrets((prev) => ({
      ...prev,
      [key]: { ...prev[key], isSet, masked },
    }));
  };

  const pillars = (strategy?.pillars ?? []) as { id: string; name: string; format: string; goal: string }[];
  const forbidden = (strategy?.forbidden_terms ?? []) as string[];

  const configuredCount = Object.values(secrets).filter((s) => s.isSet).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing Squad</h1>
        <p className="text-sm text-muted-foreground">
          Configure os agentes do pipeline @ai_intellix.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {/* Agentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {agents.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-md border border-border/50 p-3">
              <Switch
                checked={a.active}
                onCheckedChange={(v) => updateAgent(a.id, { active: v })}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{a.name}</p>
                  <Badge variant="outline" className="text-[10px]">{a.role}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Padrão: {MARKETING_SQUAD_LLM_DEFAULTS[a.name.toLowerCase()] ?? "—"}
                </p>
              </div>
              <Select
                value={a.llm_config_key}
                onValueChange={(v) => updateAgent(a.id, { llm_config_key: v })}
              >
                <SelectTrigger className="w-52 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_CONFIGS.map((cfg) => (
                    <SelectItem key={cfg.key} value={cfg.key} className="text-xs">
                      {cfg.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => saveAgent(a)}>Salvar</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cadência */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
            <div>
              <p className="text-sm font-medium">Pesquisa automática toda segunda</p>
              <p className="text-xs text-muted-foreground">pg_cron às 09:00 BRT (12:00 UTC)</p>
            </div>
            <Switch checked={autoResearch} onCheckedChange={setAutoResearch} />
          </div>
        </CardContent>
      </Card>

      {/* Estratégia */}
      {strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estratégia @ai_intellix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {pillars.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-muted/30 p-2 text-center">
                  <p className="text-xs font-bold text-primary">{p.id}</p>
                  <p className="text-[10px] font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.format}</p>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Termos Proibidos ({forbidden.length})
              </Label>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {forbidden.map((t) => (
                  <Badge key={t} variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Chaves de API</CardTitle>
            {!secretsLoading && (
              <Badge variant="outline" className={`text-[10px] ${configuredCount === SECRET_META.length ? "border-green-500/40 text-green-600 bg-green-500/10" : "border-yellow-500/40 text-yellow-600 bg-yellow-500/10"}`}>
                {configuredCount}/{SECRET_META.length} configuradas
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            As chaves são armazenadas de forma segura no banco de dados e usadas pelas Edge Functions do Marketing Squad.
            Cole o valor completo da chave e clique em Salvar.
          </p>
          {secretsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando status das chaves…
            </div>
          ) : (
            <div className="space-y-3">
              {SECRET_META.map((meta) => (
                <SecretRow
                  key={meta.key}
                  meta={meta}
                  initial={secrets[meta.key]}
                  onSaved={handleSecretSaved}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

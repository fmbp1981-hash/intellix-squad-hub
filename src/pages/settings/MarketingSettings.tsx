import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { LLM_CONFIGS, MARKETING_SQUAD_LLM_DEFAULTS } from "@/lib/llm-catalog";

type Agent = {
  id: string;
  name: string;
  role: string;
  llm_config_key: string;
  active: boolean;
};

const SECRETS = [
  { key: "BRAVE_SEARCH_API_KEY", label: "Brave Search", desc: "search.brave.com/app — Free: 2k req/mês" },
  { key: "GOOGLE_AI_API_KEY",    label: "Google AI (Gemini)", desc: "aistudio.google.com" },
  { key: "APIFY_API_TOKEN",      label: "Apify (Otto — Instagram)", desc: "console.apify.com" },
  { key: "ANTHROPIC_API_KEY",    label: "Anthropic (Claude)", desc: "console.anthropic.com" },
];

export default function MarketingSettings() {
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [strategy, setStrategy]   = useState<any>(null);
  const [autoResearch, setAutoResearch] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: agentData }, { data: strat }] = await Promise.all([
      supabase
        .from("agent_configs")
        .select("id,name,role,llm_config_key,active,squad_name")
        .eq("squad_name", "Marketing Squad")
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
  };

  useEffect(() => { load(); }, []);

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

  const pillars = (strategy?.pillars ?? []) as { id: string; name: string; format: string; goal: string }[];
  const forbidden = (strategy?.forbidden_terms ?? []) as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing Squad</h1>
        <p className="text-sm text-muted-foreground">
          Configure os 7 agentes do pipeline @ai_intellix.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {/* Agentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">7 Agentes</CardTitle>
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

      {/* Secrets checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Secrets (Supabase)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Configure no Supabase Dashboard → Settings → Edge Functions → Secrets.
          </p>
          <div className="space-y-2">
            {SECRETS.map((s) => (
              <div key={s.key} className="flex items-center gap-3 rounded-md border border-border/50 p-3">
                <div className="flex-1">
                  <p className="text-sm font-mono font-medium">{s.key}</p>
                  <p className="text-xs text-muted-foreground">{s.label} — {s.desc}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-warning/40 text-warning bg-warning/10">
                  configurar
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

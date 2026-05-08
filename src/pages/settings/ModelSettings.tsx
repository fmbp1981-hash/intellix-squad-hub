import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LLM_CATALOG, PROVIDERS, providerFromModel } from "@/lib/llm-catalog";

interface LlmConfig {
  config_key: string;
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  temperature: number;
  max_tokens: number;
}

const NONE = "__none__";

const CONFIG_LABELS: Record<string, { label: string; desc: string }> = {
  default:      { label: "Padrão", desc: "Modelo base para tarefas gerais" },
  analysis:     { label: "Análise", desc: "Raciocínio e análise de dados" },
  generation:   { label: "Geração", desc: "Criação de conteúdo e texto" },
  embedding:    { label: "Embedding", desc: "Vetorização semântica" },
  vision:       { label: "Visão", desc: "Processamento de imagens" },
  agent:        { label: "Agente", desc: "Orquestração de agentes IA" },
  agata:        { label: "Ágata", desc: "Agente COO — gestão interna" },
  commercial:   { label: "Comercial", desc: "Agente de vendas e leads" },
  delivery:     { label: "Delivery", desc: "Squad de entrega de projetos" },
};

function getLabel(key: string) {
  return CONFIG_LABELS[key] ?? { label: key, desc: "" };
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    openai: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    google: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    anthropic: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px]", colors[provider] ?? "bg-muted text-muted-foreground")}>
      {provider}
    </Badge>
  );
}

export default function ModelSettings() {
  const [rows, setRows] = useState<LlmConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("llm_configs").select("*").order("config_key");
      setRows((data ?? []) as LlmConfig[]);
      setLoading(false);
    })();
  }, []);

  const update = (key: string, patch: Partial<LlmConfig>) =>
    setRows((prev) => prev.map((r) => (r.config_key === key ? { ...r, ...patch } : r)));

  const onProviderChange = (key: string, provider: string) => {
    const firstModel = LLM_CATALOG[provider]?.[0] ?? "";
    update(key, { provider, model: firstModel });
  };

  const onFallbackProviderChange = (key: string, provider: string) => {
    if (provider === NONE) {
      update(key, { fallback_provider: null, fallback_model: null });
    } else {
      const firstModel = LLM_CATALOG[provider]?.[0] ?? "";
      update(key, { fallback_provider: provider, fallback_model: firstModel });
    }
  };

  const save = async (row: LlmConfig) => {
    setSaving(row.config_key);
    const provider = row.provider || providerFromModel(row.model);
    const { error } = await supabase
      .from("llm_configs")
      .update({
        provider,
        model: row.model,
        fallback_provider: row.fallback_provider,
        fallback_model: row.fallback_model,
        temperature: row.temperature,
        max_tokens: row.max_tokens,
      })
      .eq("config_key", row.config_key);
    setSaving(null);
    if (error) toast.error("Erro ao salvar", { description: error.message });
    else toast.success(`${row.config_key} salvo`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando configurações…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-4 text-xs text-muted-foreground">
        Configure o provider e modelo para cada função do sistema. Clique em uma linha para ajustes avançados (fallback, temperature).
      </p>

      {/* Table header */}
      <div
        className="hidden grid-cols-[1fr_140px_180px_100px_80px] items-center gap-3 rounded-lg px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 md:grid"
        style={{ background: "hsl(240 16% 12%)" }}
      >
        <span>Função</span>
        <span>Provider</span>
        <span>Modelo</span>
        <span>Avançado</span>
        <span>Ação</span>
      </div>

      {rows.map((row) => {
        const provider = row.provider || providerFromModel(row.model);
        const models = LLM_CATALOG[provider] ?? [];
        const fallbackProvider = row.fallback_provider ?? providerFromModel(row.fallback_model ?? "");
        const fallbackModels = fallbackProvider ? LLM_CATALOG[fallbackProvider] ?? [] : [];
        const isExpanded = expanded === row.config_key;
        const { label, desc } = getLabel(row.config_key);
        const isSaving = saving === row.config_key;

        return (
          <div
            key={row.config_key}
            className="overflow-hidden rounded-xl transition-all"
            style={{
              background: "hsl(240 17% 9%)",
              border: `1px solid ${isExpanded ? "hsl(262 83% 58% / 0.3)" : "hsl(240 16% 18%)"}`,
            }}
          >
            {/* Main row */}
            <div className="grid grid-cols-1 items-center gap-3 p-4 md:grid-cols-[1fr_140px_180px_100px_80px]">
              {/* Function label */}
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/50">{row.config_key}</p>
              </div>

              {/* Provider select */}
              <Select value={provider} onValueChange={(v) => onProviderChange(row.config_key, v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>
                    <ProviderBadge provider={provider} />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Model select */}
              <Select
                value={row.model}
                onValueChange={(v) => update(row.config_key, { model: v })}
                disabled={models.length === 0}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs font-mono">
                      {m.split("/")[1] ?? m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Toggle advanced */}
              <button
                onClick={() => setExpanded(isExpanded ? null : row.config_key)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Avançado
              </button>

              {/* Save */}
              <button
                onClick={() => save(row)}
                disabled={isSaving}
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--gradient-brand)" }}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                {isSaving ? "…" : "Salvar"}
              </button>
            </div>

            {/* Advanced panel */}
            {isExpanded && (
              <div
                className="grid grid-cols-2 gap-4 px-4 pb-4 pt-0 md:grid-cols-4"
                style={{ borderTop: "1px solid hsl(240 16% 18%)" }}
              >
                <div className="col-span-2 pt-4 md:col-span-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Configurações avançadas
                  </p>
                </div>

                {/* Fallback provider */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Fallback provider</p>
                  <Select
                    value={fallbackProvider || NONE}
                    onValueChange={(v) => onFallbackProviderChange(row.config_key, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE} className="text-xs">Nenhum</SelectItem>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fallback model */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Fallback modelo</p>
                  <Select
                    value={row.fallback_model ?? ""}
                    onValueChange={(v) => update(row.config_key, { fallback_model: v })}
                    disabled={!fallbackProvider || fallbackProvider === NONE}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {fallbackModels.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs font-mono">
                          {m.split("/")[1] ?? m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Temperature <span className="text-primary">{row.temperature}</span></p>
                  <Input
                    type="number" step="0.1" min="0" max="2"
                    value={row.temperature}
                    className="h-8 text-xs"
                    onChange={(e) => update(row.config_key, { temperature: Number(e.target.value) })}
                  />
                </div>

                {/* Max tokens */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Max tokens</p>
                  <Input
                    type="number"
                    value={row.max_tokens}
                    className="h-8 text-xs"
                    onChange={(e) => update(row.config_key, { max_tokens: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma configuração encontrada na tabela <code className="font-mono text-xs">llm_configs</code>.</p>
        </div>
      )}
    </div>
  );
}

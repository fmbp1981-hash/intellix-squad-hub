import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { LLM_CATALOG, PROVIDERS, providerFromModel } from '@/lib/llm-catalog';

interface LlmConfig {
  config_key: string;
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  temperature: number;
  max_tokens: number;
}

const NONE = '__none__';

export default function ModelSettings() {
  const [rows, setRows] = useState<LlmConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('llm_configs').select('*').order('config_key');
      setRows((data ?? []) as LlmConfig[]);
      setLoading(false);
    })();
  }, []);

  const update = (key: string, patch: Partial<LlmConfig>) => {
    setRows((prev) => prev.map((r) => (r.config_key === key ? { ...r, ...patch } : r)));
  };

  const onProviderChange = (key: string, provider: string) => {
    const firstModel = LLM_CATALOG[provider]?.[0] ?? '';
    update(key, { provider, model: firstModel });
  };

  const onFallbackProviderChange = (key: string, provider: string) => {
    if (provider === NONE) {
      update(key, { fallback_provider: null, fallback_model: null });
      return;
    }
    const firstModel = LLM_CATALOG[provider]?.[0] ?? '';
    update(key, { fallback_provider: provider, fallback_model: firstModel });
  };

  const save = async (row: LlmConfig) => {
    const provider = row.provider || providerFromModel(row.model);
    const { error } = await supabase.from('llm_configs').update({
      provider,
      model: row.model,
      fallback_provider: row.fallback_provider,
      fallback_model: row.fallback_model,
      temperature: row.temperature,
      max_tokens: row.max_tokens,
    }).eq('config_key', row.config_key);
    if (error) toast.error('Erro', { description: error.message });
    else toast.success(`${row.config_key} salvo`);
  };

  if (loading) return <div className="p-2 text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Modelos roteados via Lovable AI Gateway. Escolha o provider e depois o modelo.
      </p>

      {rows.map((row) => {
        const provider = row.provider || providerFromModel(row.model);
        const fallbackProvider = row.fallback_provider ?? providerFromModel(row.fallback_model ?? '');
        const models = LLM_CATALOG[provider] ?? [];
        const fallbackModels = fallbackProvider ? LLM_CATALOG[fallbackProvider] ?? [] : [];

        return (
          <Card key={row.config_key}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{row.config_key}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={(v) => onProviderChange(row.config_key, v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Select value={row.model} onValueChange={(v) => update(row.config_key, { model: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Fallback Provider</Label>
                <Select
                  value={fallbackProvider || NONE}
                  onValueChange={(v) => onFallbackProviderChange(row.config_key, v)}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modelo de Fallback</Label>
                <Select
                  value={row.fallback_model ?? ''}
                  onValueChange={(v) => update(row.config_key, { fallback_model: v })}
                  disabled={!fallbackProvider}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {fallbackModels.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Temperature</Label>
                <Input type="number" step="0.1" min="0" max="2"
                  value={row.temperature}
                  onChange={(e) => update(row.config_key, { temperature: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max tokens</Label>
                <Input type="number" value={row.max_tokens}
                  onChange={(e) => update(row.config_key, { max_tokens: Number(e.target.value) })} />
              </div>

              <div className="md:col-span-2">
                <Button size="sm" onClick={() => save(row)}>Salvar</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface LlmConfig {
  config_key: string;
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  temperature: number;
  max_tokens: number;
}

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

  const save = async (row: LlmConfig) => {
    const { error } = await supabase.from('llm_configs').update({
      provider: row.provider,
      model: row.model,
      fallback_provider: row.fallback_provider,
      fallback_model: row.fallback_model,
      temperature: row.temperature,
      max_tokens: row.max_tokens,
    }).eq('config_key', row.config_key);
    if (error) toast.error('Erro', { description: error.message });
    else toast.success(`${row.config_key} salvo`);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Configurações de modelos</h1>
        <p className="text-sm text-muted-foreground">
          Modelos roteados via Lovable AI Gateway. Use IDs como <code>google/gemini-3-flash-preview</code> ou <code>openai/gpt-5-mini</code>.
        </p>
      </div>

      {rows.map((row) => (
        <Card key={row.config_key}>
          <CardHeader>
            <CardTitle className="font-mono text-sm">{row.config_key}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="model" value={row.model}
              onChange={(e) => update(row.config_key, { model: e.target.value })} />
            <Input placeholder="fallback_model" value={row.fallback_model ?? ''}
              onChange={(e) => update(row.config_key, { fallback_model: e.target.value })} />
            <Input type="number" step="0.1" min="0" max="2" placeholder="temperature"
              value={row.temperature}
              onChange={(e) => update(row.config_key, { temperature: Number(e.target.value) })} />
            <Input type="number" placeholder="max_tokens" value={row.max_tokens}
              onChange={(e) => update(row.config_key, { max_tokens: Number(e.target.value) })} />
            <div className="md:col-span-2">
              <Button size="sm" onClick={() => save(row)}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Provider = 'evolution' | 'whatsapp_business';

interface WhatsAppConfig {
  id?: string;
  provider: Provider;
  display_name: string;
  // Evolution API
  instance_url: string;
  api_key: string;
  instance_name: string;
  // WhatsApp Business (Meta)
  phone_number_id: string;
  access_token: string;
  verify_token: string;
  // Common
  admin_number: string;
  active: boolean;
}

const empty: WhatsAppConfig = {
  provider: 'evolution',
  display_name: '',
  instance_url: '',
  api_key: '',
  instance_name: 'default',
  phone_number_id: '',
  access_token: '',
  verify_token: '',
  admin_number: '',
  active: true,
};

const projectRef = (() => {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? '';
})();

const webhookUrl = projectRef
  ? `https://${projectRef}.supabase.co/functions/v1/whatsapp-inbound`
  : '';

export default function WhatsAppSettings() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<WhatsAppConfig>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setCfg({ ...empty, ...data } as WhatsAppConfig);
      setLoading(false);
    })();
  }, []);

  const handleProviderChange = (value: Provider) => {
    setCfg({ ...empty, provider: value, id: cfg.id });
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...cfg, updated_by: user?.id };
    const op = cfg.id
      ? supabase.from('whatsapp_configs').update(payload).eq('id', cfg.id)
      : supabase.from('whatsapp_configs').insert(payload).select('id').single();

    const { data, error } = await op;
    if (!cfg.id && data && 'id' in data) setCfg((c) => ({ ...c, id: (data as { id: string }).id }));
    setSaving(false);
    if (error) toast.error('Erro ao salvar', { description: error.message });
    else toast.success('Configuração salva');
  };

  const copyWebhook = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendTest = async () => {
    if (!cfg.admin_number) return toast.error('Defina o número admin');
    setTesting(true);
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { to: cfg.admin_number, message: '✅ Teste IntelliX Squad Hub — WhatsApp conectado.' },
    });
    setTesting(false);
    if (error) return toast.error('Falha', { description: error.message });
    if (data?.status === 'sent') toast.success('Mensagem enviada');
    else if (data?.status === 'skipped') toast.info(`Pulada: ${data.reason}`);
    else toast.error(`Falha: ${data?.reason ?? 'unknown'}`);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure o canal WhatsApp para envio, recepção e roteamento automático de leads.
      </p>

      {/* Provider selector */}
      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
          <CardDescription>Selecione qual API WhatsApp usar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="provider">Tipo de integração</Label>
            <Select value={cfg.provider} onValueChange={(v) => handleProviderChange(v as Provider)}>
              <SelectTrigger id="provider" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evolution">Evolution API</SelectItem>
                <SelectItem value="whatsapp_business">WhatsApp Business (Meta)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="display_name">Nome de exibição</Label>
            <Input id="display_name" placeholder="Ex: Instância Principal" value={cfg.display_name}
              onChange={(e) => setCfg({ ...cfg, display_name: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Evolution API fields */}
      {cfg.provider === 'evolution' && (
        <Card>
          <CardHeader>
            <CardTitle>Evolution API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="instance_url">URL da instância</Label>
              <Input id="instance_url" placeholder="https://evolution.example.com" value={cfg.instance_url}
                onChange={(e) => setCfg({ ...cfg, instance_url: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="instance_name">Nome da instância</Label>
              <Input id="instance_name" placeholder="default" value={cfg.instance_name}
                onChange={(e) => setCfg({ ...cfg, instance_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="api_key">API Key</Label>
              <Input id="api_key" type="password" value={cfg.api_key}
                onChange={(e) => setCfg({ ...cfg, api_key: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Business (Meta) fields */}
      {cfg.provider === 'whatsapp_business' && (
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Business (Meta)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone_number_id">Phone Number ID</Label>
              <Input id="phone_number_id" placeholder="1234567890" value={cfg.phone_number_id}
                onChange={(e) => setCfg({ ...cfg, phone_number_id: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="access_token">Access Token</Label>
              <Input id="access_token" type="password" value={cfg.access_token}
                onChange={(e) => setCfg({ ...cfg, access_token: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="verify_token">Verify Token</Label>
              <Input id="verify_token" placeholder="Token customizado para validar webhook" value={cfg.verify_token}
                onChange={(e) => setCfg({ ...cfg, verify_token: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook URL */}
      {webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook URL</CardTitle>
            <CardDescription>
              {cfg.provider === 'evolution'
                ? 'Configure esta URL no painel da Evolution API como destino do webhook.'
                : 'Configure esta URL no Meta Business Manager → WhatsApp → Configuração do webhook.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center">
              <Input readOnly value={webhookUrl} className="font-mono text-xs bg-muted" />
              <Button variant="outline" size="icon" onClick={copyWebhook}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common settings */}
      <Card>
        <CardHeader>
          <CardTitle>Geral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="admin_number">Número admin (com DDI, sem +)</Label>
            <Input id="admin_number" placeholder="5581988514775" value={cfg.admin_number}
              onChange={(e) => setCfg({ ...cfg, admin_number: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={cfg.active} onCheckedChange={(v) => setCfg({ ...cfg, active: v })} />
            <Label>Ativa</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            <Button variant="outline" onClick={sendTest} disabled={testing || !cfg.id}>
              {testing ? 'Enviando…' : 'Enviar teste'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

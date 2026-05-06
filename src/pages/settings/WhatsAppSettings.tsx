import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface WhatsAppConfig {
  id?: string;
  instance_url: string;
  instance_token: string;
  instance_name: string;
  admin_number: string;
  active: boolean;
}

const empty: WhatsAppConfig = {
  instance_url: '',
  instance_token: '',
  instance_name: 'default',
  admin_number: '',
  active: true,
};

export default function WhatsAppSettings() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<WhatsAppConfig>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setCfg(data as WhatsAppConfig);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = { ...cfg, updated_by: user?.id };
    const { error } = cfg.id
      ? await supabase.from('whatsapp_configs').update(payload).eq('id', cfg.id)
      : await supabase.from('whatsapp_configs').insert(payload).select('id').single().then((r) => {
          if (r.data) setCfg((c) => ({ ...c, id: r.data.id }));
          return r;
        });
    setSaving(false);
    if (error) toast.error('Erro ao salvar', { description: error.message });
    else toast.success('Configuração salva');
  };

  const sendTest = async () => {
    if (!cfg.admin_number) return toast.error('Defina o número admin');
    setTesting(true);
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { to: cfg.admin_number, message: '✅ Teste OpenSquad — Evolution conectada.' },
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
        Configure aqui sua instância Evolution. Sem isso, notificações via WhatsApp são puladas.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Instância</CardTitle>
          <CardDescription>Dados da Evolution API que você já tem rodando.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="url">URL da instância</Label>
            <Input id="url" placeholder="https://evolution.example.com" value={cfg.instance_url}
              onChange={(e) => setCfg({ ...cfg, instance_url: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="name">Nome da instância</Label>
            <Input id="name" placeholder="default" value={cfg.instance_name ?? ''}
              onChange={(e) => setCfg({ ...cfg, instance_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="token">API Key (apikey)</Label>
            <Input id="token" type="password" value={cfg.instance_token}
              onChange={(e) => setCfg({ ...cfg, instance_token: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="admin">Número admin (com DDI, sem +)</Label>
            <Input id="admin" placeholder="5511999999999" value={cfg.admin_number}
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

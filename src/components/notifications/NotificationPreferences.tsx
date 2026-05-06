import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = [
  { key: "engagement", label: "Engagements & Squads" },
  { key: "checkpoint", label: "Aprovações de checkpoint" },
  { key: "crm", label: "CRM (leads, deals, contratos)" },
  { key: "jobs", label: "Jobs internos" },
  { key: "system", label: "Sistema" },
];

export function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPrefs(
          data ?? {
            user_id: user.id,
            channels: { app: true, whatsapp: true },
            categories: {},
            digest_mode: false,
            digest_interval_minutes: 60,
            quiet_hours_start: null,
            quiet_hours_end: null,
          },
        );
        setLoading(false);
      });
  }, [user]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ ...prefs, user_id: user!.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Preferências salvas");
    } catch (e) {
      toast.error("Erro", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !prefs) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const channels = prefs.channels ?? {};
  const cats = prefs.categories ?? {};

  function setChannel(k: string, v: boolean) {
    setPrefs({ ...prefs, channels: { ...channels, [k]: v } });
  }
  function setCat(k: string, v: boolean) {
    setPrefs({ ...prefs, categories: { ...cats, [k]: v } });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-3">
        <h3 className="font-display text-base font-semibold">Canais</h3>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Label>App (in-app)</Label>
          <Switch checked={channels.app !== false} onCheckedChange={(v) => setChannel("app", v)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Label>WhatsApp</Label>
          <Switch checked={channels.whatsapp !== false} onCheckedChange={(v) => setChannel("whatsapp", v)} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-base font-semibold">Categorias</h3>
        {CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>{c.label}</Label>
            <Switch checked={cats[c.key] !== false} onCheckedChange={(v) => setCat(c.key, v)} />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-base font-semibold">Modo digest</h3>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label>Agrupar notificações</Label>
            <p className="text-xs text-muted-foreground">Recebe resumo em vez de cada evento.</p>
          </div>
          <Switch
            checked={prefs.digest_mode}
            onCheckedChange={(v) => setPrefs({ ...prefs, digest_mode: v })}
          />
        </div>
        {prefs.digest_mode && (
          <div className="rounded-lg border border-border p-3">
            <Label className="text-xs">Intervalo (minutos)</Label>
            <Input
              type="number"
              min={15}
              value={prefs.digest_interval_minutes}
              onChange={(e) =>
                setPrefs({ ...prefs, digest_interval_minutes: parseInt(e.target.value) || 60 })
              }
              className="mt-1"
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-base font-semibold">Horário silencioso</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Início</Label>
            <Input
              type="time"
              value={prefs.quiet_hours_start ?? ""}
              onChange={(e) => setPrefs({ ...prefs, quiet_hours_start: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input
              type="time"
              value={prefs.quiet_hours_end ?? ""}
              onChange={(e) => setPrefs({ ...prefs, quiet_hours_end: e.target.value || null })}
            />
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar preferências
      </Button>
    </div>
  );
}

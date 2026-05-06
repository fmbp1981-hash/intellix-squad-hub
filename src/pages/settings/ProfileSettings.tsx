import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const TIMEZONES = [
  "America/Recife",
  "America/Sao_Paulo",
  "America/New_York",
  "Europe/Lisbon",
  "Europe/London",
  "UTC",
];

const LOCALES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
];

export default function ProfileSettings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("America/Recife");
  const [locale, setLocale] = useState("pt-BR");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const meta = (user?.user_metadata as any) ?? {};
    setFullName(meta.full_name ?? "");
    setTimezone(meta.timezone ?? "America/Recife");
    setLocale(meta.locale ?? "pt-BR");
  }, [user]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, timezone, locale },
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-muted-foreground">Suas informações pessoais.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div>
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fuso horário</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Idioma</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

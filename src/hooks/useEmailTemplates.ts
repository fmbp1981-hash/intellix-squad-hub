import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  subject: string;
  html: string;
  text: string | null;
  variables: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function renderTemplate(tpl: string, vars: Record<string, string | number> = {}): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? `{{${k}}}` : String(v);
  });
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("email_templates").select("*").order("name");
    if (error) toast.error(error.message);
    else setTemplates((data ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (t: Partial<EmailTemplate> & { id?: string; key: string; name: string; subject: string; html: string }) => {
    const payload = { ...t, variables: t.variables ?? [] };
    const { error } = t.id
      ? await supabase.from("email_templates").update(payload).eq("id", t.id)
      : await supabase.from("email_templates").insert(payload);
    if (error) { toast.error(error.message); return false; }
    toast.success("Template salvo");
    await load();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Template removido");
    await load();
  };

  return { templates, loading, save, remove, reload: load };
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const TYPES = [
  { key: "company", label: "Empresa" },
  { key: "shared_insights", label: "Insights" },
  { key: "constraints", label: "Restrições" },
];

export function WorkspaceContextEditor({ workspaceId }: { workspaceId: string }) {
  const [contents, setContents] = useState<Record<string, string>>({});
  const [ids, setIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("workspace_contexts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        const c: Record<string, string> = {};
        const i: Record<string, string> = {};
        (data ?? []).forEach((row: any) => {
          c[row.context_type] = row.content;
          i[row.context_type] = row.id;
        });
        setContents(c);
        setIds(i);
        setLoading(false);
      });
  }, [workspaceId]);

  async function save(type: string) {
    setSaving(type);
    try {
      const content = contents[type] ?? "";
      if (ids[type]) {
        const { error } = await supabase
          .from("workspace_contexts")
          .update({ content, updated_at: new Date().toISOString() })
          .eq("id", ids[type]);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("workspace_contexts")
          .insert({ workspace_id: workspaceId, context_type: type, content })
          .select()
          .single();
        if (error) throw error;
        setIds((prev) => ({ ...prev, [type]: data.id }));
      }
      toast.success("Salvo");
    } catch (e) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="company">
      <TabsList>
        {TYPES.map((t) => (
          <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      {TYPES.map((t) => (
        <TabsContent key={t.key} value={t.key} className="space-y-3">
          <Textarea
            className="min-h-[300px] font-mono text-xs"
            placeholder={`# ${t.label}\n\nMarkdown…`}
            value={contents[t.key] ?? ""}
            onChange={(e) => setContents((p) => ({ ...p, [t.key]: e.target.value }))}
          />
          <Button size="sm" onClick={() => save(t.key)} disabled={saving === t.key}>
            {saving === t.key ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Save className="mr-1 h-3 w-3" />
            )}
            Salvar
          </Button>
        </TabsContent>
      ))}
    </Tabs>
  );
}

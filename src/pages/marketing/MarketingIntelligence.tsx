import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompetitorProfileCard } from "@/components/marketing/CompetitorProfileCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

export default function MarketingIntelligence() {
  const [target, setTarget] = useState("");
  const [type, setType] = useState<string>("instagram");
  const [analyzing, setAnalyzing] = useState(false);

  const profiles = useQuery({
    queryKey: ["competitor-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_profiles")
        .select("*, design_dna_extracted(*)")
        .order("analyzed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const analyze = async () => {
    if (!target.trim()) return;
    setAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke("marketing-intelligence", {
        body: { target: target.trim(), type },
      });
      if (error) throw error;
      toast.success("Análise concluída!", { description: "Otto extraiu o DNA do perfil." });
      profiles.refetch();
      setTarget("");
    } catch {
      toast.error("Erro na análise");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Inteligência Competitiva</h2>
      <p className="text-sm text-muted-foreground">
        Otto analisa perfis externos e extrai padrões de design, copy e engajamento para inspirar a produção da IntelliX.
      </p>

      {/* Form de análise */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="font-semibold text-sm">Analisar novo perfil</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label>URL ou @handle</Label>
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="@perfil ou https://site.com.br"
              onKeyDown={(e) => e.key === "Enter" && analyze()}
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={analyze} disabled={analyzing || !target.trim()}>
          {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {analyzing ? "Analisando…" : "Analisar com Otto"}
        </Button>
        <p className="text-[11px] text-muted-foreground">Custo estimado: ~$0.30–0.50 por análise</p>
      </div>

      {/* Perfis analisados */}
      <div className="space-y-3">
        <p className="font-semibold">{profiles.data?.length ?? 0} perfis analisados</p>
        {profiles.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {(profiles.data ?? []).map((p) => (
          <CompetitorProfileCard
            key={p.id}
            handleOrUrl={p.handle_or_url}
            platform={p.platform ?? ""}
            analyzedAt={p.analyzed_at ?? ""}
            editorialInsights={p.editorial_insights ?? undefined}
            dominantFormat={p.dominant_format ?? undefined}
            postingFrequency={p.posting_frequency ?? undefined}
            avgEngagementRate={p.avg_engagement_rate ?? undefined}
            recommendedAdaptations={(p.recommended_adaptations as any[]) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

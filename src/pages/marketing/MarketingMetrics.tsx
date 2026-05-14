import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MetricsPillarChart } from "@/components/marketing/MetricsPillarChart";
import { FollowerGrowthChart } from "@/components/marketing/FollowerGrowthChart";

export default function MarketingMetrics() {
  const posts = useQuery({
    queryKey: ["published-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("published_posts")
        .select("*, content_drafts(*, content_calendar(pillar,format))")
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Agrega métricas por pilar
  const pillarData = ["P1","P2","P3","P4","P5"].map((pillar) => {
    const ps = (posts.data ?? []).filter((p) => (p as any).content_drafts?.content_calendar?.pillar === pillar);
    const avgEng = ps.length
      ? ps.reduce((sum, p) => {
          const reach = p.reach || 1;
          const eng = ((p.likes ?? 0) + (p.comments ?? 0) + (p.saves ?? 0)) / reach * 100;
          return sum + eng;
        }, 0) / ps.length
      : 0;
    return { pillar, avg_engagement: parseFloat(avgEng.toFixed(2)), posts: ps.length };
  });

  // Mock de crescimento para demonstração (em produção viria de tabela separada)
  const followerData = Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (7 - i) * 7);
    return { date: d.toISOString().slice(0, 10), followers: 1200 + i * 47 + Math.floor(Math.random() * 20) };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Métricas</h2>

      {posts.data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">Sem posts publicados ainda.</p>
          <p className="mt-1 text-xs text-muted-foreground">Registre posts publicados para ver métricas.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <MetricsPillarChart data={pillarData} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <FollowerGrowthChart data={followerData} />
        </div>
      </div>

      {/* Tabela de posts */}
      {(posts.data?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                {["Data","Pilar","Formato","Alcance","Likes","Saves","Comentários"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(posts.data ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-xs">{new Date(p.published_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">{(p as any).content_drafts?.content_calendar?.pillar ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{(p as any).content_drafts?.content_calendar?.format ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{(p.reach ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-xs">{p.likes ?? 0}</td>
                  <td className="px-4 py-2.5 text-xs">{p.saves ?? 0}</td>
                  <td className="px-4 py-2.5 text-xs">{p.comments ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

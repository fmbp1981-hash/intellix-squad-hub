import { useTrendsCuration } from "@/hooks/useTrendsCuration";
import { TrendsCurationPanel } from "@/components/marketing/TrendsCurationPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { triggerWeeklyResearch } from "@/hooks/useMarketingSquad";
import { useState } from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MarketingResearch() {
  const { raw, curated, latestBatch } = useTrendsCuration();
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerWeeklyResearch();
      toast.success("Pesquisa iniciada!", { description: "Aguarde alguns minutos e atualize." });
    } catch {
      toast.error("Erro ao iniciar pesquisa");
    } finally {
      setTriggering(false);
    }
  };

  const batchDate = latestBatch.data?.collected_at
    ? new Date(latestBatch.data.collected_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Pesquisa & Curadoria</h2>
          {batchDate && <p className="text-xs text-muted-foreground">Último batch: {batchDate}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { raw.refetch(); curated.refetch(); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleTrigger} disabled={triggering}>
            {triggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Nova pesquisa
          </Button>
        </div>
      </div>

      <Tabs defaultValue="curated">
        <TabsList>
          <TabsTrigger value="curated">
            Curados <Badge variant="secondary" className="ml-1.5 text-[10px]">{curated.data?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="raw">
            Brutos <Badge variant="secondary" className="ml-1.5 text-[10px]">{raw.data?.length ?? 0}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curated" className="pt-4">
          <TrendsCurationPanel items={curated.data ?? []} loading={curated.isLoading} />
        </TabsContent>

        <TabsContent value="raw" className="pt-4">
          <div className="space-y-2">
            {raw.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {(raw.data ?? []).map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm font-medium">{item.title}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.source}</Badge>
                </div>
                {item.content_snippet && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.content_snippet}</p>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[10px] text-primary hover:underline truncate">
                    {item.url}
                  </a>
                )}
              </div>
            ))}
            {!raw.isLoading && !raw.data?.length && (
              <p className="text-sm text-muted-foreground">Nenhum item coletado ainda.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

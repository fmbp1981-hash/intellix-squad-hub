import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import {
  useMarketingDrafts,
  useMarketingDraftCounts,
  useProposeTheme,
  type MarketingPlatform,
  type MarketingStatus,
} from "@/hooks/useMarketingDrafts";
import { MarketingDraftCard } from "./MarketingDraftCard";

const TABS: { value: MarketingStatus; label: string }[] = [
  { value: "generated", label: "Gerados" },
  { value: "approved", label: "Aprovados" },
  { value: "published", label: "Publicados" },
  { value: "rejected", label: "Rejeitados" },
];

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<MarketingStatus>("generated");
  const [theme, setTheme] = useState("");
  const [platform, setPlatform] = useState<MarketingPlatform>("linkedin");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: drafts = [], isLoading } = useMarketingDrafts(activeTab);
  const { data: counts } = useMarketingDraftCounts();
  const proposeTheme = useProposeTheme();

  const handlePropose = async () => {
    if (!theme.trim()) return;
    await proposeTheme.mutateAsync({ theme_prompt: theme.trim(), platform });
    setTheme("");
    setDialogOpen(false);
    setActiveTab("generated");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Squad de Marketing</h1>
          {(counts?.generated ?? 0) > 0 && (
            <Badge
              className="text-[11px]"
              style={{
                background: "hsl(262 83% 58% / 0.15)",
                color: "hsl(262 83% 75%)",
                border: "1px solid hsl(262 83% 58% / 0.25)",
              }}
            >
              {counts?.generated} aguardando
            </Badge>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Propor tema
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Propor tema</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Textarea
                placeholder="Ex: Shadow AI em empresas de médio porte"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center gap-3">
                <Select value={platform} onValueChange={(v) => setPlatform(v as MarketingPlatform)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="ml-auto"
                  disabled={!theme.trim() || proposeTheme.isPending}
                  onClick={handlePropose}
                >
                  {proposeTheme.isPending ? "Gerando..." : "Gerar"}
                </Button>
              </div>
              {proposeTheme.isPending && (
                <p className="text-center text-xs text-muted-foreground">
                  Pesquisando e gerando drafts (~20s)...
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MarketingStatus)}>
        <TabsList className="w-full">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1 text-xs">
              {tab.label}
              {counts?.[tab.value] != null && counts[tab.value] > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                  {counts[tab.value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-3">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : drafts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum draft {tab.label.toLowerCase()}.
              </p>
            ) : (
              drafts.map((draft) => <MarketingDraftCard key={draft.id} draft={draft} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

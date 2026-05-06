import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useGestao } from "@/hooks/useGestao";
import { useOKRs } from "@/hooks/useOKRs";
import { BriefingViewer } from "@/components/gestao/BriefingViewer";
import { DirectiveKanban } from "@/components/gestao/DirectiveKanban";
import { OKRPanel } from "@/components/gestao/OKRPanel";
import { AskAgataChat } from "@/components/gestao/AskAgataChat";
import { Sparkles } from "lucide-react";

export default function OfficeGestao() {
  const { briefings, directives } = useGestao();
  const { okrs } = useOKRs();
  const last = briefings[0];

  return (
    <div className="space-y-6">
      <Card className="p-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Ágata</h1>
          <p className="text-sm text-muted-foreground">COO Digital da IntelliX.AI</p>
        </div>
        <Badge variant="outline">
          {last ? `Último briefing: ${new Date(last.created_at).toLocaleString("pt-BR")}` : "Sem briefings ainda"}
        </Badge>
      </Card>

      <Tabs defaultValue="briefings">
        <TabsList>
          <TabsTrigger value="briefings">Briefings ({briefings.length})</TabsTrigger>
          <TabsTrigger value="diretivas">Diretivas ({directives.length})</TabsTrigger>
          <TabsTrigger value="okrs">OKRs ({okrs.length})</TabsTrigger>
          <TabsTrigger value="chat">Perguntar</TabsTrigger>
        </TabsList>

        <TabsContent value="briefings" className="space-y-4 mt-4">
          {briefings.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum briefing ainda. Use a aba "Perguntar" ou aguarde o daily standup.
            </Card>
          ) : (
            briefings.map((b) => <BriefingViewer key={b.id} briefing={b} />)
          )}
        </TabsContent>

        <TabsContent value="diretivas" className="mt-4">
          <DirectiveKanban directives={directives} />
        </TabsContent>

        <TabsContent value="okrs" className="mt-4">
          <OKRPanel okrs={okrs} />
        </TabsContent>

        <TabsContent value="chat" className="mt-4 space-y-3">
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Pergunte algo à Ágata</h3>
            <AskAgataChat />
            <p className="text-xs text-muted-foreground mt-2">
              Ela responde com base em OKRs, pipeline, engagements e operação. Briefing chega em ~60s.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Mode = "ask" | "summarize" | "next_actions" | "risk_analysis";
type Msg = { role: "user" | "assistant"; content: string };

interface AIAssistantPanelProps {
  context: "project" | "deal" | "sprint" | "global";
  entityId?: string;
  entityLabel?: string;
  triggerLabel?: string;
}

export function AIAssistantPanel({ context, entityId, entityLabel, triggerLabel = "Assistente IA" }: AIAssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("ask");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (promptText: string, useMode: Mode = mode) => {
    if (!promptText.trim()) return;
    const userMsg: Msg = { role: "user", content: promptText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let buf = "";
    const upsert = (chunk: string) => {
      buf += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: buf } : m);
        return [...prev, { role: "assistant", content: buf }];
      });
    };

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ context, entityId, prompt: promptText, mode: useMode, history: messages.slice(-8) }),
      });
      if (resp.status === 429) { toast.error("Limite de requisições atingido. Aguarde."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("Créditos da IA esgotados."); setLoading(false); return; }
      if (!resp.ok || !resp.body) { toast.error("Falha ao chamar IA"); setLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  const quickAction = (m: Mode, label: string) => {
    setMode(m);
    send(label, m);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente IA
          </SheetTitle>
          {entityLabel && <Badge variant="secondary" className="w-fit">{entityLabel}</Badge>}
        </SheetHeader>

        <div className="flex gap-1 p-2 border-b flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => quickAction("summarize", "Faça um resumo executivo")}>Resumo</Button>
          <Button size="sm" variant="ghost" onClick={() => quickAction("next_actions", "Quais são as próximas ações priorizadas?")}>Próximas ações</Button>
          <Button size="sm" variant="ghost" onClick={() => quickAction("risk_analysis", "Analise os riscos atuais")}>Riscos</Button>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Faça uma pergunta sobre {context === "project" ? "este projeto" : context === "deal" ? "este deal" : context === "sprint" ? "esta sprint" : "o sistema"}.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`rounded-lg p-3 text-sm ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                  <div className="text-xs font-medium mb-1 opacity-70">{m.role === "user" ? "Você" : "IA"}</div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Pensando…</div>}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-3 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta…"
            rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()} className="w-full gap-2">
            <Send className="h-4 w-4" /> Enviar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

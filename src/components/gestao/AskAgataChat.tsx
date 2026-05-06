import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

export function AskAgataChat() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!question.trim()) return;
    setLoading(true);
    const { error } = await supabase.functions.invoke("gestao-trigger", {
      body: { type: "on_demand", question: question.trim() },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Ágata recebeu sua pergunta. Briefing chega em até 60s.");
      setQuestion("");
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Pergunte algo à Ágata…"
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
      />
      <Button onClick={send} disabled={loading || !question.trim()}>
        <Send className="h-4 w-4 mr-2" /> Enviar
      </Button>
    </div>
  );
}

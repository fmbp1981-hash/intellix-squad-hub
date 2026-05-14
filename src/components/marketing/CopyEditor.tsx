import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const FORBIDDEN_TERMS = [
  "API", "workflow", "chatbot", "automação", "automacao", "GPT", "LLM",
  "n8n", "Make", "Supabase", "pipeline", "stack", "deploy",
];

const SUGGESTIONS: Record<string, string> = {
  "API":        "integração de sistemas",
  "workflow":   "processo automatizado",
  "chatbot":    "assistente inteligente",
  "automação":  "eficiência operacional",
  "automacao":  "eficiência operacional",
  "GPT":        "inteligência artificial",
  "LLM":        "modelo de linguagem",
  "pipeline":   "fluxo de trabalho",
  "stack":      "tecnologia",
  "deploy":     "publicação",
  "n8n":        "ferramenta de integração",
  "Make":       "ferramenta de automação",
  "Supabase":   "banco de dados",
};

interface CopyEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}

export function CopyEditor({ value, onChange, placeholder, rows = 6, label }: CopyEditorProps) {
  const [found, setFound] = useState<string[]>([]);

  useEffect(() => {
    const lower = value.toLowerCase();
    const detected = FORBIDDEN_TERMS.filter((t) => lower.includes(t.toLowerCase()));
    setFound([...new Set(detected)]);
  }, [value]);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <div className="relative">
        <Textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("resize-none", found.length > 0 && "border-destructive/60 focus-visible:ring-destructive/30")}
        />
        <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
          {wordCount} palavras
        </span>
      </div>

      {found.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Termos proibidos detectados:
          </div>
          {found.map((term) => (
            <div key={term} className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive text-[10px]">
                {term}
              </Badge>
              <span className="text-muted-foreground">
                → Sugestão: <span className="font-medium text-foreground">{SUGGESTIONS[term] ?? "substituir por resultado de negócio"}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {wordCount > 150 && (
        <p className="text-xs text-warning">
          ⚠ Capa do carrossel não deve ultrapassar 150 palavras ({wordCount} palavras)
        </p>
      )}
    </div>
  );
}

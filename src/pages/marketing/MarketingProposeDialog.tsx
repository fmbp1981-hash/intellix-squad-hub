// src/pages/marketing/MarketingProposeDialog.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { useProposeTheme, type MarketingPlatform } from "@/hooks/useMarketingDrafts";

interface MarketingProposeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MarketingProposeDialog({ open, onClose }: MarketingProposeDialogProps) {
  const [theme, setTheme] = useState("");
  const [platform, setPlatform] = useState<MarketingPlatform>("linkedin");
  const propose = useProposeTheme();

  const handleSubmit = async () => {
    if (!theme.trim()) return;
    await propose.mutateAsync({ theme_prompt: theme.trim(), platform });
    setTheme("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        style={{ background: "oklch(0.16 0.01 250)", border: "1px solid oklch(0.26 0.02 262)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold text-foreground">
            Propor tema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            placeholder="Ex: Shadow AI em empresas de médio porte"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            rows={3}
            className="resize-none text-[13px]"
            style={{ background: "oklch(0.13 0.01 250)", border: "1px solid oklch(0.24 0.01 250)" }}
            autoFocus
          />

          <div className="flex items-center gap-2">
            <Select value={platform} onValueChange={(v) => setPlatform(v as MarketingPlatform)}>
              <SelectTrigger className="w-36 h-8 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              disabled={!theme.trim() || propose.isPending}
              onClick={handleSubmit}
              className="ml-auto h-8 gap-1.5 text-[12px]"
              style={{
                background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
                color: "white",
                border: "none",
              }}
            >
              {propose.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> Gerar ideias</>
              )}
            </Button>
          </div>

          {propose.isPending && (
            <p className="text-center text-[11px]" style={{ color: "oklch(0.55 0.02 250)" }}>
              Pesquisando e gerando ideias (~15s)...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

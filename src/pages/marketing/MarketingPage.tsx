import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import {
  useMarketingDrafts,
  useMarketingDraftCounts,
  useProposeTheme,
  type MarketingPlatform,
  type MarketingStatus,
} from "@/hooks/useMarketingDrafts";
import { IdeaCard, MarketingDraftCard } from "./MarketingDraftCard";

type Tab = { value: MarketingStatus; label: string; empty: string }

const TABS: Tab[] = [
  { value: "idea_pending",  label: "Ideias",     empty: "Nenhuma ideia aguardando aprovação." },
  { value: "generated",     label: "Gerados",    empty: "Nenhum draft gerado." },
  { value: "approved",      label: "Aprovados",  empty: "Nenhum draft aprovado." },
  { value: "published",     label: "Publicados", empty: "Nenhum publicado ainda." },
  { value: "rejected",      label: "Rejeitados", empty: "Nenhum rejeitado." },
];

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold"
      style={{ background: "oklch(0.52 0.18 262 / 0.25)", color: "oklch(0.72 0.16 262)" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ProposePanel({ onClose }: { onClose: () => void }) {
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
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "oklch(0.16 0.01 250)",
        border: "1px solid oklch(0.26 0.02 262)",
        boxShadow: "0 0 0 1px oklch(0.52 0.18 262 / 0.08), 0 4px 24px oklch(0.52 0.18 262 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">Propor tema</p>
        <button
          onClick={onClose}
          className="text-[11px] transition-colors"
          style={{ color: "oklch(0.48 0.02 250)" }}
        >
          cancelar
        </button>
      </div>

      <Textarea
        placeholder="Ex: Shadow AI em empresas de médio porte"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        rows={2}
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
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
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
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando ideias...</>
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
  );
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<MarketingStatus>("idea_pending");
  const [showPropose, setShowPropose] = useState(false);

  const { data: drafts = [], isLoading } = useMarketingDrafts(activeTab);
  const { data: counts } = useMarketingDraftCounts();

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Squad de Marketing</h1>
          <p className="mt-0.5 text-[12px]" style={{ color: "oklch(0.52 0.02 250)" }}>
            Aprove o tema antes de gerar o conteúdo
          </p>
        </div>

        {!showPropose && (
          <Button
            size="sm"
            onClick={() => setShowPropose(true)}
            className="h-8 gap-1.5 text-[12px]"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.18 262), oklch(0.45 0.20 290))",
              color: "white",
              border: "none",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Propor tema
          </Button>
        )}
      </div>

      {/* Propose panel (inline, no modal) */}
      {showPropose && <ProposePanel onClose={() => setShowPropose(false)} />}

      {/* Flow indicator */}
      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "oklch(0.48 0.02 250)" }}>
        {[
          { label: "1. Propor tema", active: showPropose },
          { label: "2. Aprovar ideia",   active: activeTab === "idea_pending" },
          { label: "3. Gerar conteúdo",  active: activeTab === "generated" },
          { label: "4. Aprovar post",    active: activeTab === "approved" },
          { label: "5. Publicar",        active: activeTab === "published" },
        ].map((step, i, arr) => (
          <span key={step.label} className="flex items-center gap-1.5">
            <span
              className="font-medium transition-colors"
              style={{ color: step.active ? "oklch(0.72 0.16 262)" : undefined }}
            >
              {step.label}
            </span>
            {i < arr.length - 1 && <span>→</span>}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MarketingStatus)}>
        <TabsList
          className="w-full"
          style={{ background: "oklch(0.15 0.01 250)", border: "1px solid oklch(0.22 0.01 250)" }}
        >
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 text-[11px] gap-0"
            >
              {tab.label}
              <TabBadge count={counts?.[tab.value] ?? 0} />
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "oklch(0.55 0.02 250)" }} />
              </div>
            ) : drafts.length === 0 ? (
              <p className="py-10 text-center text-[13px]" style={{ color: "oklch(0.48 0.02 250)" }}>
                {tab.empty}
              </p>
            ) : tab.value === "idea_pending" ? (
              drafts.map((draft) => <IdeaCard key={draft.id} draft={draft} />)
            ) : (
              drafts.map((draft) => <MarketingDraftCard key={draft.id} draft={draft} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

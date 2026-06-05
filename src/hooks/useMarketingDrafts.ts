import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type MarketingStatus = "generated" | "approved" | "rejected" | "published";
export type MarketingPilar = "resultado_ia" | "educacao_pratica" | "bastidores" | "posicionamento" | "comercial";
export type MarketingPlatform = "linkedin" | "instagram" | "whatsapp";

export interface MarketingDraft {
  id: string;
  title: string;
  content: string;
  pilar: MarketingPilar;
  platform: MarketingPlatform;
  status: MarketingStatus;
  theme_prompt: string | null;
  research_snippets: Array<{ source: string; url: string; title: string }> | null;
  trigger_mode: string;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
}

const QK = "marketing_drafts";

export function useMarketingDrafts(status?: MarketingStatus) {
  return useQuery({
    queryKey: [QK, status],
    queryFn: async () => {
      let q = supabase
        .from("marketing_drafts")
        .select("*")
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MarketingDraft[];
    },
  });
}

export function useMarketingDraftCounts() {
  return useQuery({
    queryKey: [QK, "counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_drafts")
        .select("status");
      if (error) throw error;
      const counts: Record<MarketingStatus, number> = {
        generated: 0, approved: 0, rejected: 0, published: 0,
      };
      for (const row of data ?? []) {
        counts[row.status as MarketingStatus]++;
      }
      return counts;
    },
  });
}

export function useApproveDraft() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Draft aprovado" });
    },
    onError: (err) => toast({ title: "Erro ao aprovar", description: String(err), variant: "destructive" }),
  });
}

export function useRejectDraft() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Draft rejeitado" });
    },
    onError: (err) => toast({ title: "Erro ao rejeitar", description: String(err), variant: "destructive" }),
  });
}

export function useMarkPublished() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Marcado como publicado" });
    },
    onError: (err) => toast({ title: "Erro", description: String(err), variant: "destructive" }),
  });
}

export function useProposeTheme() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ theme_prompt, platform }: { theme_prompt: string; platform: MarketingPlatform }) => {
      const res = await supabase.functions.invoke("marketing-orchestrator", {
        body: { theme_prompt, platform },
      });
      if (res.error) throw res.error;
      return res.data as { drafts_created: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: `${data.drafts_created} draft(s) gerado(s)` });
    },
    onError: (err) => toast({ title: "Erro ao gerar", description: String(err), variant: "destructive" }),
  });
}

export function useRegenerateDraft() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ draft }: { draft: MarketingDraft }) => {
      const res = await supabase.functions.invoke("marketing-orchestrator", {
        body: {
          theme_prompt: draft.theme_prompt ?? draft.title,
          platform: draft.platform,
        },
      });
      if (res.error) throw res.error;
      await supabase
        .from("marketing_drafts")
        .update({ status: "rejected" })
        .eq("id", draft.id);
      return res.data as { drafts_created: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Novo draft gerado" });
    },
    onError: (err) => toast({ title: "Erro ao regerar", description: String(err), variant: "destructive" }),
  });
}

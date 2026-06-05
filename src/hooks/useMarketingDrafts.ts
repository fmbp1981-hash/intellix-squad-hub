import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type MarketingStatus = "idea_pending" | "generated" | "approved" | "rejected" | "published";
export type MarketingPilar = "resultado_ia" | "educacao_pratica" | "bastidores" | "posicionamento" | "comercial";
export type MarketingPlatform = "linkedin" | "instagram" | "whatsapp";

export interface MarketingDraft {
  id: string;
  title: string;
  angle: string | null;
  content: string;
  pilar: MarketingPilar;
  platform: MarketingPlatform;
  status: MarketingStatus;
  theme_prompt: string | null;
  research_snippets: Array<{ source: string; url: string; title: string }> | null;
  image_url: string | null;
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
      const { data, error } = await supabase.from("marketing_drafts").select("status");
      if (error) throw error;
      const counts: Record<MarketingStatus, number> = {
        idea_pending: 0, generated: 0, approved: 0, rejected: 0, published: 0,
      };
      for (const row of data ?? []) counts[row.status as MarketingStatus]++;
      return counts;
    },
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
      return res.data as { ideas_created: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: `${data.ideas_created} ideia(s) gerada(s) — aguardando aprovação` });
    },
    onError: (err) => toast({ title: "Erro ao gerar ideias", description: String(err), variant: "destructive" }),
  });
}

export function useGenerateFromIdea() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (draft_id: string) => {
      const res = await supabase.functions.invoke("marketing-generate", {
        body: { draft_id },
      });
      if (res.error) throw res.error;
      return res.data as { draft_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Conteúdo gerado — pronto para revisão" });
    },
    onError: (err) => toast({ title: "Erro ao gerar conteúdo", description: String(err), variant: "destructive" }),
  });
}

export function useRejectIdea() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_drafts").update({ status: "rejected" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Ideia rejeitada" });
    },
    onError: (err) => toast({ title: "Erro", description: String(err), variant: "destructive" }),
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
      const { error } = await supabase.from("marketing_drafts").update({ status: "rejected" }).eq("id", id);
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

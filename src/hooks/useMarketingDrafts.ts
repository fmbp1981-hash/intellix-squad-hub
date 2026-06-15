import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type MarketingStatus = "idea_pending" | "generated" | "approved" | "rejected" | "published";
export type MarketingPilar = "resultado_ia" | "educacao_pratica" | "bastidores" | "posicionamento" | "comercial";
export type MarketingPlatform = "linkedin" | "instagram" | "whatsapp";

export type MarketingContentType = "informational" | "product_promotion" | "virada_inteligente" | "news_data";

export interface SlideImage {
  slide: number;
  title: string;
  image_url: string | null;
  copy: string;
  practical_tip: string;
}

export interface MarketingDraft {
  id: string;
  title: string;
  angle: string | null;
  content: string;
  pilar: MarketingPilar;
  platform: MarketingPlatform;
  content_type: MarketingContentType | null;
  status: MarketingStatus;
  theme_prompt: string | null;
  research_snippets: Array<{ source: string; url: string; title: string }> | null;
  image_url: string | null;
  slide_images: SlideImage[] | null;
  generated_images: string[] | null;
  trigger_mode: string;
  approved_at: string | null;
  published_at: string | null;
  scheduled_for: string | null;
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

export function useGenerateDraftImages() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ draftId, count }: { draftId: string; count: number }) => {
      const res = await supabase.functions.invoke("marketing-image-gen", {
        body: { draft_id: draftId, count },
      });
      if (res.error) throw res.error;
      return res.data as { urls: string[]; total: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: `${data.urls.length} imagem(ns) gerada(s) com sucesso` });
    },
    onError: (err) => toast({ title: "Erro ao gerar imagens", description: String(err), variant: "destructive" }),
  });
}

export function useSelectDraftImage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ draftId, imageUrl }: { draftId: string; imageUrl: string }) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ image_url: imageUrl })
        .eq("id", draftId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Imagem selecionada" });
    },
    onError: (err) => toast({ title: "Erro ao selecionar imagem", description: String(err), variant: "destructive" }),
  });
}

export function usePublishToInstagram() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (draftId: string) => {
      const res = await supabase.functions.invoke("marketing-publisher", {
        body: { draft_id: draftId },
      });
      if (res.error) throw res.error;
      const data = res.data as { published: number; results: Array<{ id: string; status: string; ig_post_id?: string; reason?: string }> };
      const result = data.results?.find((r) => r.id === draftId);
      if (result?.status === "error") throw new Error(result.reason ?? "publish_failed");
      if (result?.status === "skipped") throw new Error(`Pulado: ${result.reason}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Publicado no Instagram!" });
    },
    onError: (err) => toast({ title: "Erro ao publicar", description: String(err), variant: "destructive" }),
  });
}

export function useUpdateScheduledFor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, scheduled_for }: { id: string; scheduled_for: string | null }) => {
      const { error } = await supabase
        .from("marketing_drafts")
        .update({ scheduled_for })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: "Agendamento atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar agendamento", variant: "destructive" });
    },
  });
}

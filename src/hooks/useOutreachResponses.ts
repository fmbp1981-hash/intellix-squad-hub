import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OutreachResponse {
  id: string;
  lead_id: string;
  inbound_message: string;
  intent: 'interest' | 'doubt' | 'objection' | 'disinterest' | 'unknown';
  intent_confidence: number;
  draft_reply: string | null;
  approved_reply: string | null;
  status: 'pending' | 'approved' | 'sent' | 'ignored';
  received_at: string;
  outreach_leads?: { company_name: string; contact_value: string; contact_channel: string };
}

export function usePendingResponses() {
  return useQuery({
    queryKey: ['outreach_responses', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_responses')
        .select('*, outreach_leads(company_name, contact_value, contact_channel)')
        .eq('status', 'pending')
        .order('received_at', { ascending: false });
      if (error) throw error;
      return data as OutreachResponse[];
    },
    refetchInterval: 30_000,
  });
}

export function useApproveResponse() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      response_id,
      approved_reply,
      lead_contact,
      channel,
    }: {
      response_id: string;
      approved_reply: string;
      lead_contact: string;
      channel: string;
    }) => {
      if (channel === 'whatsapp') {
        await supabase.functions.invoke('send-whatsapp', {
          body: { to: lead_contact, message: approved_reply },
        });
      } else if (channel === 'email') {
        await supabase.functions.invoke('send-email', {
          body: { to: lead_contact, subject: 'Resposta IntelliX.AI', body: approved_reply },
        });
      }
      await supabase.from('outreach_responses').update({
        approved_reply,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', response_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_responses'] });
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
      toast({ title: 'Resposta enviada!' });
    },
    onError: (err) => {
      toast({ title: 'Erro ao enviar', description: String(err), variant: 'destructive' });
    },
  });
}

export function useIgnoreResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (response_id: string) => {
      await supabase.from('outreach_responses').update({ status: 'ignored' }).eq('id', response_id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach_responses'] }),
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useGenerateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead_id: string) => {
      const copyRes = await supabase.functions.invoke('sdr-copywriter', { body: { lead_id } });
      if (copyRes.error) throw copyRes.error;

      const humanRes = await supabase.functions.invoke('sdr-humanizer', { body: { lead_id } });
      if (humanRes.error) throw humanRes.error;

      return humanRes.data as { score: number; issues: string[]; rewritten: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
    },
  });
}

export function useApproveAndSend() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      lead_id,
      channel,
      message,
    }: {
      lead_id: string;
      channel: string;
      message: string;
    }) => {
      const { data: lead } = await supabase
        .from('outreach_leads')
        .select('contact_value, company_name')
        .eq('id', lead_id)
        .single();
      if (!lead) throw new Error('Lead not found');

      if (channel === 'whatsapp') {
        const res = await supabase.functions.invoke('send-whatsapp', {
          body: { to: lead.contact_value, message },
        });
        if (res.error) throw res.error;
      } else if (channel === 'email') {
        const res = await supabase.functions.invoke('send-email', {
          body: {
            to: lead.contact_value,
            subject: `IntelliX.AI para ${lead.company_name}`,
            body: message,
          },
        });
        if (res.error) throw res.error;
      }

      await supabase
        .from('outreach_messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('lead_id', lead_id);

      await supabase
        .from('outreach_leads')
        .update({ status: 'sent' })
        .eq('id', lead_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
      toast({ title: 'Mensagem enviada!' });
    },
    onError: (err) => {
      toast({ title: 'Erro ao enviar', description: String(err), variant: 'destructive' });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OutreachCampaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  lead_ids: string[];
  sent_count: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useOutreachCampaigns() {
  return useQuery<OutreachCampaign[]>({
    queryKey: ['outreach_campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as OutreachCampaign[];
    },
  });
}

export function useDispatchCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, lead_ids }: { name: string; lead_ids: string[] }) => {
      const res = await supabase.functions.invoke('sdr-campaign-dispatcher', {
        body: { name, lead_ids },
      });
      if (res.error) throw res.error;
      return res.data as {
        campaign_id: string;
        status: string;
        sent_count: number;
        failed_count: number;
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
      qc.invalidateQueries({ queryKey: ['outreach_campaigns'] });
      toast({
        title: 'Campanha disparada',
        description: `${data.sent_count} enviados · ${data.failed_count} falhou`,
      });
    },
    onError: (err) => {
      toast({
        title: 'Erro ao disparar campanha',
        description: String(err),
        variant: 'destructive',
      });
    },
  });
}

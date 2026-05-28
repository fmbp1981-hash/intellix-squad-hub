import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OutreachLead, IcpSegment, LeadStatus } from '@/types/outreach';

export function useIcpSegments() {
  return useQuery({
    queryKey: ['icp_segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icp_segments')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data as IcpSegment[];
    },
  });
}

export function useOutreachLeads(filters?: { status?: LeadStatus; segment_id?: string }) {
  return useQuery({
    queryKey: ['outreach_leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('outreach_leads')
        .select(`
          *,
          icp_segments(*),
          lead_briefings(*)
        `)
        .order('heat_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.segment_id) query = query.eq('segment_id', filters.segment_id);

      const { data, error } = await query;
      if (error) throw error;
      return data as OutreachLead[];
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from('outreach_leads')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
    },
  });
}

export function useTriggerAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('sdr-analyst', {
        body: { lead_id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach_leads'] });
    },
  });
}

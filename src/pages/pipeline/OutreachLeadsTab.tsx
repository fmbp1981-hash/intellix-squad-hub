import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOutreachLeads, useIcpSegments, useTriggerAnalysis } from '@/hooks/useOutreachLeads';
import type { OutreachLead, LeadStatus } from '@/types/outreach';

const STATUS_LABELS: Record<LeadStatus, string> = {
  prospected: 'Prospectado',
  analyzing: 'Analisando...',
  briefed: 'Briefing OK',
  pending_approval: 'Aguarda aprovação',
  sent: 'Mensagem enviada',
  replied: 'Respondeu',
  meeting_scheduled: 'Reunião agendada',
  won: 'Fechado',
  lost: 'Perdido',
  archived: 'Arquivado',
};

const STATUS_VARIANTS: Record<LeadStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  prospected: 'secondary',
  analyzing: 'outline',
  briefed: 'default',
  pending_approval: 'destructive',
  sent: 'default',
  replied: 'default',
  meeting_scheduled: 'default',
  won: 'default',
  lost: 'secondary',
  archived: 'secondary',
};

export function OutreachLeadsTab() {
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<OutreachLead | null>(null);

  const { data: leads = [], isLoading } = useOutreachLeads(
    segmentFilter !== 'all' ? { segment_id: segmentFilter } : undefined
  );
  const { data: segments = [] } = useIcpSegments();
  const triggerAnalysis = useTriggerAnalysis();

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Leads SDR Outbound</h2>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos os segmentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os segmentos</SelectItem>
            {segments.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          Nenhum lead encontrado. Inicie uma prospecção para preencher esta lista.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedLead(lead)}
              >
                <TableCell className="font-medium">
                  {lead.company_name}
                  {lead.responsible_name && (
                    <div className="text-xs text-muted-foreground">{lead.responsible_name}</div>
                  )}
                </TableCell>
                <TableCell>{lead.icp_segments?.display_name ?? '—'}</TableCell>
                <TableCell className="capitalize">{lead.contact_channel}</TableCell>
                <TableCell>
                  <span className="text-sm font-mono">{lead.qualification_score}</span>
                  <span className="text-xs text-muted-foreground ml-1">/ {lead.heat_score}</span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Badge variant={STATUS_VARIANTS[lead.status]}>
                    {STATUS_LABELS[lead.status]}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {lead.status === 'prospected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={triggerAnalysis.isPending}
                      onClick={() => triggerAnalysis.mutate(lead.id)}
                    >
                      Analisar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedLead?.company_name}</DialogTitle>
          </DialogHeader>
          {selectedLead?.lead_briefings ? (
            <div className="space-y-3 text-sm">
              <div><span className="font-semibold">Dor principal:</span> {selectedLead.lead_briefings.main_pain}</div>
              <div><span className="font-semibold">Solução IntelliX:</span> {selectedLead.lead_briefings.intellix_solution}</div>
              <div><span className="font-semibold">Ângulo de venda:</span> {selectedLead.lead_briefings.sales_angle}</div>
              <div><span className="font-semibold">Tom recomendado:</span> {selectedLead.lead_briefings.recommended_tone}</div>
              {selectedLead.lead_briefings.probable_objection && (
                <div><span className="font-semibold">Objeção provável:</span> {selectedLead.lead_briefings.probable_objection}</div>
              )}
              {selectedLead.lead_briefings.objection_counter && (
                <div><span className="font-semibold">Contra-argumento:</span> {selectedLead.lead_briefings.objection_counter}</div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Briefing ainda não gerado. Clique em "Analisar" na tabela para gerar.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Check, X, Clock } from 'lucide-react';
import { usePendingResponses, useApproveResponse, useIgnoreResponse } from '@/hooks/useOutreachResponses';

const INTENT_LABELS = {
  interest: { label: 'Interesse', color: 'default' },
  doubt: { label: 'Dúvida', color: 'outline' },
  objection: { label: 'Objeção', color: 'destructive' },
  disinterest: { label: 'Desinteresse', color: 'secondary' },
  unknown: { label: 'Indefinido', color: 'outline' },
} as const;

export function OutreachResponsesPanel() {
  const { data: responses = [], isLoading } = usePendingResponses();
  const approveResponse = useApproveResponse();
  const ignoreResponse = useIgnoreResponse();
  const [editMap, setEditMap] = useState<Record<string, string>>({});

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando respostas...</div>;
  if (!responses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">Nenhuma resposta pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="w-4 h-4" />
        {responses.length} resposta(s) aguardando aprovação
      </div>

      {responses.map((r) => {
        const intentInfo = INTENT_LABELS[r.intent];
        const currentText = editMap[r.id] ?? r.draft_reply ?? '';
        const lead = r.outreach_leads;

        return (
          <Card key={r.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{lead?.company_name ?? 'Lead'}</CardTitle>
                <Badge variant={intentInfo.color as 'default' | 'secondary' | 'outline' | 'destructive'}>
                  {intentInfo.label} · {r.intent_confidence}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground italic">
                "{r.inbound_message}"
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={currentText}
                onChange={(e) => setEditMap((m) => ({ ...m, [r.id]: e.target.value }))}
                rows={3}
                className="text-sm"
                placeholder="Rascunho de resposta..."
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => ignoreResponse.mutate(r.id)}
                  disabled={ignoreResponse.isPending}
                >
                  <X className="w-3 h-3 mr-1" />
                  Ignorar
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    approveResponse.mutate({
                      response_id: r.id,
                      approved_reply: currentText,
                      lead_contact: lead?.contact_value ?? '',
                      channel: lead?.contact_channel ?? 'whatsapp',
                    })
                  }
                  disabled={approveResponse.isPending || !currentText.trim()}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aprovar e Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit, Send, RefreshCw } from 'lucide-react';
import { useApproveAndSend, useGenerateMessage } from '@/hooks/useOutreachMessages';
import type { OutreachLead } from '@/types/outreach';

interface Props {
  lead: OutreachLead;
}

export function OutreachApprovalCard({ lead }: Props) {
  const msgs = lead.outreach_messages ?? [];
  const msg = msgs[msgs.length - 1];
  const [editedText, setEditedText] = useState(msg?.message_text ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const generateMessage = useGenerateMessage();
  const approveAndSend = useApproveAndSend();

  if (!msg) {
    return (
      <Card>
        <CardContent className="pt-4">
          <Button
            onClick={() => generateMessage.mutate(lead.id)}
            disabled={generateMessage.isPending}
            size="sm"
          >
            {generateMessage.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-1" />}
            Gerar mensagem
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Mensagem para {lead.company_name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {msg.channel}
            </Badge>
            <Badge
              variant={msg.humanization_score >= 8 ? 'default' : 'destructive'}
              className="text-xs"
            >
              Score: {msg.humanization_score}/10
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={6}
            className="text-sm"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-3">{editedText}</p>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsEditing((v) => !v)}>
            <Edit className="w-3 h-3 mr-1" />
            {isEditing ? 'Visualizar' : 'Editar'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              generateMessage.mutate(lead.id, {
                onSuccess: () => setEditedText(''),
              });
            }}
            disabled={generateMessage.isPending}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${generateMessage.isPending ? 'animate-spin' : ''}`} />
            Regerar
          </Button>
          <Button
            size="sm"
            onClick={() =>
              approveAndSend.mutate({
                lead_id: lead.id,
                channel: msg.channel,
                message: editedText,
              })
            }
            disabled={approveAndSend.isPending || msg.status === 'sent'}
            className="ml-auto"
          >
            {msg.status === 'sent' ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Enviada
              </>
            ) : (
              <>
                <Send className="w-3 h-3 mr-1" />
                {approveAndSend.isPending ? 'Enviando...' : 'Aprovar e Enviar'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

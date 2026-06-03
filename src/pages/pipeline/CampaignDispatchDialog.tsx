import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useDispatchCampaign } from '@/hooks/useOutreachCampaigns';
import { Send, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  draftLeadIds: string[];
  draftLeadCount: number;
}

export function CampaignDispatchDialog({ open, onClose, draftLeadIds, draftLeadCount }: Props) {
  const [name, setName] = useState('');
  const dispatch = useDispatchCampaign();

  function handleDispatch() {
    if (!name.trim() || draftLeadIds.length === 0) return;
    dispatch.mutate(
      { name: name.trim(), lead_ids: draftLeadIds },
      {
        onSuccess: () => {
          setName('');
          onClose();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Disparar campanha WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/60 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Serão enviadas as mensagens em{' '}
              <Badge variant="secondary">{draftLeadCount} lead{draftLeadCount !== 1 ? 's' : ''}</Badge>
              {' '}com status <strong>draft</strong> via WhatsApp.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Nome da campanha</Label>
            <Input
              id="campaign-name"
              placeholder="Ex: Campanha Maio — Varejo SP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDispatch()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={dispatch.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleDispatch}
            disabled={!name.trim() || draftLeadIds.length === 0 || dispatch.isPending}
          >
            {dispatch.isPending ? 'Disparando...' : `Disparar ${draftLeadCount} mensagem${draftLeadCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

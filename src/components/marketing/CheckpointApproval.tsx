import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface CheckpointApprovalProps {
  open: boolean;
  title: string;
  description?: string;
  onApprove: () => void;
  onReject: (notes: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export function CheckpointApproval({
  open, title, description, onApprove, onReject, onClose, loading,
}: CheckpointApprovalProps) {
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState(false);

  const handleReject = () => {
    onReject(rejectNotes);
    setRejectNotes("");
    setShowReject(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>

        {showReject ? (
          <div className="space-y-3">
            <Textarea
              rows={4}
              placeholder="Motivo da rejeição ou ajustes necessários…"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={handleReject} disabled={loading}>
                <XCircle className="mr-2 h-4 w-4" />
                Confirmar rejeição
              </Button>
              <Button variant="outline" onClick={() => setShowReject(false)}>Voltar</Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowReject(true)} className="border-destructive/40 text-destructive hover:bg-destructive/10">
              <XCircle className="mr-2 h-4 w-4" />
              Rejeitar
            </Button>
            <Button onClick={onApprove} disabled={loading} className="flex-1">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aprovar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

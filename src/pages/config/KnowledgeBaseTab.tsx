import { useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useKnowledgeBase, type KnowledgeDocumentStatus } from "@/hooks/useKnowledgeBase";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: KnowledgeDocumentStatus["status"] }) {
  if (status === "ingestado")
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Ingestado</Badge>;
  if (status === "restrito")
    return <Badge variant="secondary">Restrito</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Pendente</Badge>;
}

function DocumentRow({
  doc,
  onReingest,
}: {
  doc: KnowledgeDocumentStatus;
  onReingest: (docNumber: number) => Promise<{ chunks_created: number }>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleConfirm() {
    setLoading(true);
    try {
      const result = await onReingest(doc.doc_number);
      toast({
        title: "Reingestão concluída",
        description: `Doc ${String(doc.doc_number).padStart(2, "0")} — ${result.chunks_created} chunks criados.`,
      });
      setDialogOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro na reingestão",
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-mono text-xs text-muted-foreground">
          Doc {String(doc.doc_number).padStart(2, "0")}
        </TableCell>
        <TableCell className="font-medium">{doc.title}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{doc.version}</TableCell>
        <TableCell className="text-sm">{doc.chunk_count}</TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {doc.last_ingested ? formatDate(doc.last_ingested) : "—"}
        </TableCell>
        <TableCell>
          <StatusBadge status={doc.status} />
        </TableCell>
        <TableCell className="text-right">
          <Button
            size="sm"
            variant="ghost"
            disabled={doc.is_restricted || loading}
            onClick={() => setDialogOpen(true)}
          >
            {loading ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              "Reingerir"
            )}
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reingerir documento</DialogTitle>
            <DialogDescription>
              <strong>Doc {String(doc.doc_number).padStart(2, "0")} — {doc.title}</strong>
              <br />
              Isso irá apagar os chunks atuais e criar novos a partir do conteúdo armazenado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReingestAllDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reingerir todos os documentos</DialogTitle>
          <DialogDescription>
            Todos os chunks existentes serão apagados e recriados em sequência.
            O Doc 09 (Precificação Interna) será ignorado por ser restrito.
            Esta operação pode levar alguns minutos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KnowledgeBaseTab() {
  const { documents, isLoading, error, totalChunks, reingest, reingestAll } = useKnowledgeBase();
  const [reingestAllDialog, setReingestAllDialog] = useState(false);
  const [reingestAllProgress, setReingestAllProgress] = useState<{
    current: number;
    total: number;
    chunks: number;
  } | null>(null);
  const { toast } = useToast();

  async function handleReingestAll() {
    const nonRestricted = documents.filter((d) => !d.is_restricted);
    setReingestAllProgress({ current: 0, total: nonRestricted.length, chunks: 0 });

    try {
      const total = await reingestAll((current, total, chunks) => {
        setReingestAllProgress({ current, total, chunks });
      });
      toast({
        title: "Reingestão completa",
        description: `${nonRestricted.length} documentos processados — ${total} chunks criados.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro na reingestão em lote",
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setReingestAllProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Base de Conhecimento</h3>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {documents.length} documentos · {totalChunks} trechos indexados
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setReingestAllDialog(true)}
          disabled={!!reingestAllProgress || isLoading}
        >
          Reingerir tudo
        </Button>
      </div>

      {reingestAllProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Processando doc {reingestAllProgress.current} de {reingestAllProgress.total}
            </span>
            <span>{reingestAllProgress.chunks} chunks criados</span>
          </div>
          <Progress
            value={(reingestAllProgress.current / reingestAllProgress.total) * 100}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Erro ao carregar: {error}</p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Doc</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-24">Versão</TableHead>
              <TableHead className="w-20">Chunks</TableHead>
              <TableHead className="w-44">Última ingestion</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <DocumentRow key={doc.doc_number} doc={doc} onReingest={reingest} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ReingestAllDialog
        open={reingestAllDialog}
        onOpenChange={setReingestAllDialog}
        onConfirm={handleReingestAll}
      />
    </div>
  );
}

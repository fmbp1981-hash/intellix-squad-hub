import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCrm } from "@/hooks/useCrm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InvoiceStatus } from "@/types";

const COLOR: Record<InvoiceStatus, string> = {
  pending: "bg-muted",
  sent: "bg-blue-500/20 text-blue-300",
  paid: "bg-emerald-500/20 text-emerald-300",
  overdue: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function InvoiceList() {
  const { invoices } = useCrm();

  if (invoices.length === 0) {
    return <Card className="p-8 text-center text-muted-foreground">Nenhuma fatura ainda.</Card>;
  }

  return (
    <Card className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((i) => (
            <TableRow key={i.id}>
              <TableCell className="font-mono">{i.number}</TableCell>
              <TableCell>R$ {Number(i.amount).toLocaleString("pt-BR")}</TableCell>
              <TableCell>{i.due_date}</TableCell>
              <TableCell><Badge className={COLOR[i.status]}>{i.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

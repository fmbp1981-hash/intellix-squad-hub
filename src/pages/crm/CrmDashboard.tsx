import { Card } from "@/components/ui/card";
import { useCrm } from "@/hooks/useCrm";
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip } from "recharts";

export default function CrmDashboard() {
  const { leads, deals, contracts, engagements, invoices } = useCrm();

  const mrr = contracts
    .filter((c) => c.status === "active" || c.status === "signed")
    .reduce((sum, c) => sum + Number(c.total_value), 0);

  const overdue = invoices.filter((i) => i.status === "overdue");

  const funnel = [
    { name: "Leads", value: leads.length, fill: "hsl(var(--primary))" },
    { name: "Deals", value: deals.length, fill: "hsl(var(--accent))" },
    { name: "Contratos", value: contracts.length, fill: "hsl(217, 91%, 60%)" },
    { name: "Engagements", value: engagements.length, fill: "hsl(160, 84%, 39%)" },
  ].filter((f) => f.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-bold mt-1">{leads.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Deals em negociação</p>
          <p className="text-2xl font-bold mt-1">{deals.filter((d) => !["won", "lost"].includes(d.status)).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Receita contratada</p>
          <p className="text-2xl font-bold mt-1">R$ {mrr.toLocaleString("pt-BR")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Faturas vencidas</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{overdue.length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Funil</h3>
        {funnel.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem dados ainda — comece criando leads.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnel} isAnimationActive>
                  <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

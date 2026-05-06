import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2 } from "lucide-react";

const STATUS_PROB: Record<string, number> = {
  discovery: 10, qualification: 25, proposal: 50, negotiation: 75, won: 100, lost: 0,
};
const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "#f59e0b", "#10b981", "#ef4444"];

export default function CrmForecast() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("deals").select("*");
    setDeals(data ?? []);
    setLoading(false);
  })(); }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const open = deals.filter(d => !["won", "lost"].includes(d.status));
  const won = deals.filter(d => d.status === "won");
  const totalPipeline = open.reduce((s, d) => s + Number(d.value), 0);
  const weighted = open.reduce((s, d) => s + Number(d.value) * (d.probability ?? STATUS_PROB[d.status] ?? 0) / 100, 0);
  const totalWon = won.reduce((s, d) => s + Number(d.value), 0);
  const winRate = deals.length ? (won.length / deals.filter(d => ["won", "lost"].includes(d.status)).length) * 100 : 0;

  const byStatus = Object.entries(open.reduce((acc: any, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + Number(d.value); return acc;
  }, {})).map(([name, value]) => ({ name, value }));

  const monthlyForecast: any = {};
  open.forEach(d => {
    if (!d.expected_close) return;
    const m = d.expected_close.slice(0, 7);
    monthlyForecast[m] = (monthlyForecast[m] ?? 0) + Number(d.value) * (d.probability ?? STATUS_PROB[d.status] ?? 0) / 100;
  });
  const monthData = Object.entries(monthlyForecast).sort().map(([month, value]) => ({ month, value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pipeline Aberto</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalPipeline.toLocaleString("pt-BR")}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Forecast Ponderado</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">R$ {Math.round(weighted).toLocaleString("pt-BR")}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Fechado (Won)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalWon.toLocaleString("pt-BR")}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{winRate.toFixed(1)}%</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Forecast por mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Distribuição por estágio</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={100} label>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

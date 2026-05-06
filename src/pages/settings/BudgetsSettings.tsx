import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Row = {
  id: string;
  scope: string;
  period_month: string;
  total_cost_usd: number;
  budget_usd: number | null;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(v || 0);

export default function BudgetsSettings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [history, setHistory] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const load = async () => {
    setLoading(true);
    const [{ data: now }, { data: hist }] = await Promise.all([
      supabase.from("token_usage").select("*").eq("period_month", currentMonth),
      supabase.from("token_usage").select("*").order("period_month", { ascending: true }).limit(180),
    ]);
    setRows((now ?? []) as Row[]);
    setHistory((hist ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, budget: number) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, budget_usd: budget } : r)));

  const save = async (r: Row) => {
    const { error } = await supabase.from("token_usage").update({ budget_usd: r.budget_usd }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`Budget de ${r.scope} salvo`);
  };

  // Agrupa histórico por mês
  const chartData = Array.from(
    history.reduce((acc, r) => {
      const k = r.period_month;
      acc.set(k, (acc.get(k) || 0) + Number(r.total_cost_usd || 0));
      return acc;
    }, new Map<string, number>())
  )
    .sort()
    .map(([month, cost]) => ({ month, cost: Number(cost.toFixed(2)) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <p className="text-sm text-muted-foreground">
          Defina limites mensais de gasto com IA por escopo.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((r) => {
          const pct = r.budget_usd ? Math.min(100, (Number(r.total_cost_usd) / Number(r.budget_usd)) * 100) : 0;
          return (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{r.scope}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold">{fmt(Number(r.total_cost_usd))}</span>
                  <span className="text-xs text-muted-foreground">
                    / {r.budget_usd ? fmt(Number(r.budget_usd)) : "sem limite"}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Budget mensal (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.budget_usd ?? ""}
                      onChange={(e) => update(r.id, Number(e.target.value))}
                    />
                  </div>
                  <Button size="sm" onClick={() => save(r)}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de gastos</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

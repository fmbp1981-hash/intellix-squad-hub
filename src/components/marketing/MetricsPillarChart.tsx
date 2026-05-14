import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PILLAR_COLORS: Record<string, string> = {
  P1: "#ef4444",
  P2: "#3b82f6",
  P3: "#06b6d4",
  P4: "#a855f7",
  P5: "#f97316",
};

interface PillarMetric {
  pillar: string;
  avg_engagement: number;
  posts: number;
}

interface MetricsPillarChartProps {
  data: PillarMetric[];
}

export function MetricsPillarChart({ data }: MetricsPillarChartProps) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Engajamento Médio por Pilar
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="pillar" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [`${v.toFixed(1)}%`, "Engajamento"]}
          />
          <Bar dataKey="avg_engagement" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.pillar} fill={PILLAR_COLORS[entry.pillar] ?? "#7c3aed"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface FollowerPoint {
  date: string;
  followers: number;
}

export function FollowerGrowthChart({ data }: { data: FollowerPoint[] }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Evolução de Seguidores
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#269BEA" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#269BEA" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [v.toLocaleString("pt-BR"), "Seguidores"]}
          />
          <Area type="monotone" dataKey="followers" stroke="#269BEA" strokeWidth={2} fill="url(#followerGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

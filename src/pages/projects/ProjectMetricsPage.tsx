import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";

export default function ProjectMetricsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: velocity } = useQuery({
    enabled: !!projectId,
    queryKey: ["velocity-history", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("velocity_history")
        .select("*")
        .eq("project_id", projectId!)
        .order("sprint_number", { ascending: true });
      return data ?? [];
    },
  });

  const { data: activeSprint } = useQuery({
    enabled: !!projectId,
    queryKey: ["active-sprint", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sprints")
        .select("*")
        .eq("project_id", projectId!)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
  });

  const { data: metrics } = useQuery({
    enabled: !!activeSprint?.id,
    queryKey: ["sprint-metrics", activeSprint?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sprint_metrics")
        .select("*")
        .eq("sprint_id", activeSprint!.id)
        .order("recorded_date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: stories } = useQuery({
    enabled: !!projectId,
    queryKey: ["stories-for-cfd", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_stories")
        .select("status, started_at, completed_at, accepted_at, created_at")
        .eq("project_id", projectId!);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!projectId) return;
    const ch = supabase.channel(`metrics-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_stories", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["stories-for-cfd", projectId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, qc]);

  const cycleTime = useMemo(() => {
    const done = (stories ?? []).filter((s: any) => s.started_at && s.completed_at);
    if (!done.length) return { avg: 0, count: 0 };
    const totalMs = done.reduce((sum, s: any) => sum + (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()), 0);
    return { avg: totalMs / done.length / 86400000, count: done.length };
  }, [stories]);

  const burndown = useMemo(() => {
    return (metrics ?? []).map((m: any) => ({
      date: m.recorded_date,
      remaining: m.remaining_points,
      ideal: m.ideal_remaining,
    }));
  }, [metrics]);

  const velocityChart = (velocity ?? []).map((v: any) => ({
    sprint: `S${v.sprint_number}`,
    Comprometido: v.committed,
    Entregue: v.completed,
  }));

  const cfd = useMemo(() => {
    // CFD agrega contagens por status ao longo do tempo (snapshot único hoje, simplificado)
    const buckets: Record<string, number> = { backlog: 0, ready: 0, in_progress: 0, in_review: 0, done: 0 };
    (stories ?? []).forEach((s: any) => { if (buckets[s.status] !== undefined) buckets[s.status]++; });
    return [{ date: "agora", ...buckets }];
  }, [stories]);

  const avgVelocity = velocity?.length ? velocity.reduce((s, v: any) => s + Number(v.velocity), 0) / velocity.length : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Métricas do Projeto</h1>
        <p className="text-sm text-muted-foreground">Velocity, Burndown, CFD e Cycle Time</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <KPI label="Velocity média" value={`${avgVelocity.toFixed(1)} pts`} sub={`${velocity?.length ?? 0} sprints`} />
        <KPI label="Cycle Time" value={`${cycleTime.avg.toFixed(1)} d`} sub={`${cycleTime.count} stories`} />
        <KPI label="Sprint ativa" value={activeSprint?.name ?? "—"} sub={activeSprint ? `${activeSprint.completed_points}/${activeSprint.committed_points} pts` : ""} />
        <KPI label="Throughput" value={`${cycleTime.count}`} sub="stories entregues" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Velocity por Sprint</CardTitle></CardHeader>
        <CardContent className="h-72">
          {velocityChart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Conclua sprints para ver a velocity histórica.</p>
          ) : (
            <ResponsiveContainer>
              <BarChart data={velocityChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="sprint" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="Comprometido" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="Entregue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Burndown — Sprint Ativa</CardTitle></CardHeader>
        <CardContent className="h-72">
          {burndown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem snapshots ainda. Métricas são geradas diariamente via cron.</p>
          ) : (
            <ResponsiveContainer>
              <LineChart data={burndown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="remaining" name="Real" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="ideal" name="Ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cumulative Flow Diagram</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <AreaChart data={cfd}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Area dataKey="done" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.6)" />
              <Area dataKey="in_review" stackId="1" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.6)" />
              <Area dataKey="in_progress" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary) / 0.6)" />
              <Area dataKey="ready" stackId="1" stroke="hsl(var(--muted))" fill="hsl(var(--muted) / 0.6)" />
              <Area dataKey="backlog" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground) / 0.4)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetricPoint {
  label: string;
  value: number;
}

export interface MetricSeries {
  current: number | null;
  delta_pct: number | null;
  points: MetricPoint[];
}

export interface MetricsOverview {
  velocity: MetricSeries;
  cycle_time: MetricSeries;
  on_time: MetricSeries;
  llm_cost: MetricSeries;
  win_rate: MetricSeries;
  nps: MetricSeries;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date) {
  return MONTH_NAMES[d.getMonth()];
}

function buildMonthBuckets(months = 6): { key: string; label: string; start: Date; end: Date }[] {
  const out: { key: string; label: string; start: Date; end: Date }[] = [];
  const base = startOfMonth(new Date());
  for (let i = months - 1; i >= 0; i--) {
    const start = addMonths(base, -i);
    const end = addMonths(start, 1);
    out.push({ key: monthKey(start), label: monthLabel(start), start, end });
  }
  return out;
}

function deltaPct(points: MetricPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  if (first === 0) return last === 0 ? 0 : null;
  return Math.round(((last - first) / first) * 100);
}

function emptySeries(): MetricSeries {
  return { current: null, delta_pct: null, points: [] };
}

async function loadVelocity(): Promise<MetricSeries> {
  const { data, error } = await supabase
    .from("sprints")
    .select("number, completed_points, status, end_date")
    .eq("status", "completed")
    .order("end_date", { ascending: false })
    .limit(6);
  if (error || !data?.length) return emptySeries();

  const ordered = [...data].reverse();
  const points: MetricPoint[] = ordered.map((s, i) => ({
    label: `S${(s.number as number) ?? i + 1}`,
    value: Number(s.completed_points ?? 0),
  }));
  const current = points[points.length - 1]?.value ?? null;
  return { current, delta_pct: deltaPct(points), points };
}

async function loadCycleTime(): Promise<MetricSeries> {
  const since = new Date();
  since.setDate(since.getDate() - 7 * 6);
  const { data, error } = await supabase
    .from("user_stories")
    .select("started_at, completed_at")
    .not("started_at", "is", null)
    .not("completed_at", "is", null)
    .gte("completed_at", since.toISOString());
  if (error || !data?.length) return emptySeries();

  const buckets = new Map<string, { sum: number; n: number; weekStart: Date }>();
  for (const r of data) {
    const started = new Date(r.started_at as string);
    const completed = new Date(r.completed_at as string);
    const days = (completed.getTime() - started.getTime()) / 86_400_000;
    if (days < 0) continue;
    const ws = new Date(completed);
    ws.setDate(ws.getDate() - ws.getDay());
    ws.setHours(0, 0, 0, 0);
    const key = ws.toISOString().slice(0, 10);
    const cur = buckets.get(key) ?? { sum: 0, n: 0, weekStart: ws };
    cur.sum += days;
    cur.n += 1;
    buckets.set(key, cur);
  }

  const points = [...buckets.values()]
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .slice(-6)
    .map((b, i) => ({
      label: `W${i + 1}`,
      value: Math.round((b.sum / b.n) * 10) / 10,
    }));
  const current = points[points.length - 1]?.value ?? null;
  return { current, delta_pct: deltaPct(points), points };
}

async function loadOnTime(): Promise<MetricSeries> {
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const { data, error } = await supabase
    .from("sprints")
    .select("status, end_date, committed_points, completed_points")
    .eq("status", "completed")
    .gte("end_date", since.toISOString().slice(0, 10));
  if (error || !data?.length) return emptySeries();

  const buckets = buildMonthBuckets(6);
  const counts = new Map<string, { ontime: number; total: number }>();
  for (const b of buckets) counts.set(b.key, { ontime: 0, total: 0 });

  for (const r of data) {
    const ed = new Date(r.end_date as string);
    const k = monthKey(startOfMonth(ed));
    const c = counts.get(k);
    if (!c) continue;
    c.total += 1;
    const committed = Number(r.committed_points ?? 0);
    const completed = Number(r.completed_points ?? 0);
    if (committed > 0 && completed >= committed) c.ontime += 1;
  }

  const points = buckets.map((b) => {
    const c = counts.get(b.key)!;
    const pct = c.total > 0 ? Math.round((c.ontime / c.total) * 100) : 0;
    return { label: b.label, value: pct };
  });
  const current = points[points.length - 1]?.value ?? null;
  return { current, delta_pct: deltaPct(points), points };
}

async function loadLlmCost(): Promise<MetricSeries> {
  const since = startOfMonth(addMonths(new Date(), -5));
  const { data, error } = await supabase
    .from("agent_runs")
    .select("cost_usd, created_at")
    .gte("created_at", since.toISOString());
  if (error || !data?.length) return emptySeries();

  const buckets = buildMonthBuckets(6);
  const sums = new Map<string, number>();
  for (const b of buckets) sums.set(b.key, 0);
  for (const r of data) {
    const d = new Date(r.created_at as string);
    const k = monthKey(startOfMonth(d));
    if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + Number(r.cost_usd ?? 0));
  }

  const points = buckets.map((b) => ({
    label: b.label,
    value: Math.round((sums.get(b.key) ?? 0) * 100) / 100,
  }));
  const current = points[points.length - 1]?.value ?? null;
  return { current, delta_pct: deltaPct(points), points };
}

async function loadWinRate(): Promise<MetricSeries> {
  const since = startOfMonth(addMonths(new Date(), -5));
  const { data, error } = await supabase
    .from("deals")
    .select("status, updated_at")
    .in("status", ["won", "lost"])
    .gte("updated_at", since.toISOString());
  if (error || !data?.length) return emptySeries();

  const buckets = buildMonthBuckets(6);
  const counts = new Map<string, { won: number; total: number }>();
  for (const b of buckets) counts.set(b.key, { won: 0, total: 0 });

  for (const r of data) {
    const d = new Date(r.updated_at as string);
    const k = monthKey(startOfMonth(d));
    const c = counts.get(k);
    if (!c) continue;
    c.total += 1;
    if (r.status === "won") c.won += 1;
  }

  const points = buckets.map((b) => {
    const c = counts.get(b.key)!;
    const pct = c.total > 0 ? Math.round((c.won / c.total) * 100) : 0;
    return { label: b.label, value: pct };
  });
  const current = points[points.length - 1]?.value ?? null;
  return { current, delta_pct: deltaPct(points), points };
}

async function loadNps(): Promise<MetricSeries> {
  const since = startOfMonth(addMonths(new Date(), -5));
  const { data, error } = await supabase
    .from("nps_monthly")
    .select("month, nps_score, total")
    .gte("month", since.toISOString().slice(0, 10))
    .order("month", { ascending: true });
  if (error || !data?.length) return emptySeries();

  const buckets = buildMonthBuckets(6);
  const byKey = new Map<string, number>();
  for (const r of data as { month: string; nps_score: number; total: number }[]) {
    const d = new Date(r.month);
    byKey.set(monthKey(startOfMonth(d)), Number(r.nps_score ?? 0));
  }

  const points = buckets.map((b) => ({
    label: b.label,
    value: byKey.get(b.key) ?? 0,
  }));
  const current = points[points.length - 1]?.value ?? null;
  return { current, delta_pct: deltaPct(points), points };
}

export function useMetricsOverview() {
  return useQuery<MetricsOverview>({
    queryKey: ["metrics-overview"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [velocity, cycle_time, on_time, llm_cost, win_rate, nps] = await Promise.all([
        loadVelocity(),
        loadCycleTime(),
        loadOnTime(),
        loadLlmCost(),
        loadWinRate(),
        loadNps(),
      ]);
      return { velocity, cycle_time, on_time, llm_cost, win_rate, nps };
    },
  });
}

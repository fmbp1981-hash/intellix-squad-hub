import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Globe, Code2, Zap, BarChart3, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PortfolioCategory = "saas" | "site" | "crm" | "internal" | "automation";
type PortfolioStatus = "live" | "dev" | "archived";

interface PortfolioProject {
  id: string;
  vercel_project_id: string | null;
  name: string;
  client_name: string;
  description: string | null;
  category: PortfolioCategory;
  tech_stack: string[];
  url: string | null;
  status: PortfolioStatus;
  workspace_id: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  saas: "SaaS",
  site: "Site",
  crm: "CRM",
  internal: "Interno",
  automation: "Automação",
};

const CATEGORY_ICONS: Record<PortfolioCategory, typeof Globe> = {
  saas: BarChart3,
  site: Globe,
  crm: BarChart3,
  internal: Code2,
  automation: Zap,
};

const STATUS_STYLES: Record<PortfolioStatus, { label: string; dot: string; badge: string }> = {
  live:     { label: "Live",     dot: "bg-emerald-400", badge: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  dev:      { label: "Dev",      dot: "bg-amber-400",   badge: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  archived: { label: "Arquivado",dot: "bg-zinc-500",    badge: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10" },
};

const CATEGORY_FILTERS = [
  { value: "all",        label: "Todos" },
  { value: "saas",       label: "SaaS" },
  { value: "site",       label: "Site" },
  { value: "crm",        label: "CRM" },
  { value: "automation", label: "Automação" },
  { value: "internal",   label: "Interno" },
] as const;

export default function PortfolioPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["portfolio_projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PortfolioProject[];
    },
  });

  const filtered = projects.filter((p) => {
    const byCategory = categoryFilter === "all" || p.category === categoryFilter;
    const byStatus   = statusFilter   === "all" || p.status   === statusFilter;
    return byCategory && byStatus;
  });

  const stats = {
    total: projects.length,
    live:  projects.filter((p) => p.status === "live").length,
    dev:   projects.filter((p) => p.status === "dev").length,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Portfólio</h1>
        <p className="text-sm text-muted-foreground">
          Todos os projetos construídos e entregues pela IntelliX.AI
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total de projetos", value: stats.total, color: "text-foreground" },
          { label: "Em produção",       value: stats.live,  color: "text-emerald-400" },
          { label: "Em desenvolvimento",value: stats.dev,   color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border p-4"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("mt-1 text-3xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategoryFilter(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                categoryFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          {(["all", "live", "dev", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? "Todos status" : STATUS_STYLES[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl"
              style={{ background: "hsl(var(--accent))" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-sm text-muted-foreground">Nenhum projeto encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const CategoryIcon = CATEGORY_ICONS[project.category];
            const statusStyle  = STATUS_STYLES[project.status];
            return (
              <div
                key={project.id}
                className="group relative flex flex-col gap-3 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "hsl(var(--accent))" }}
                    >
                      <CategoryIcon className="h-4 w-4 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.client_name}</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      statusStyle.badge
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)} />
                    {statusStyle.label}
                  </span>
                </div>

                {/* Description */}
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {project.description ?? "—"}
                </p>

                {/* Category + Tech */}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_LABELS[project.category]}
                  </Badge>
                  {project.tech_stack.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                  {project.tech_stack.length > 3 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{project.tech_stack.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Link */}
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir projeto
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

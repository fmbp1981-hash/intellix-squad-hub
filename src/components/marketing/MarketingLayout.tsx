import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart2, Calendar, FileText, Megaphone, Search, Zap } from "lucide-react";

const NAV = [
  { to: "/marketing",            label: "Visão Geral",    icon: Megaphone, end: true },
  { to: "/marketing/calendario", label: "Calendário",     icon: Calendar },
  { to: "/marketing/producao",   label: "Produção",       icon: FileText },
  { to: "/marketing/pesquisa",   label: "Pesquisa",       icon: Search },
  { to: "/marketing/metricas",   label: "Métricas",       icon: BarChart2 },
  { to: "/marketing/inteligencia", label: "Inteligência", icon: Zap },
];

export default function MarketingLayout() {
  return (
    <div className="flex flex-col gap-0">
      {/* Sub-nav */}
      <div className="border-b border-border bg-card/50">
        <nav className="flex gap-1 overflow-x-auto px-6 py-0">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
}

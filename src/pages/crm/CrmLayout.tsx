import { Outlet, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/crm", label: "Dashboard", end: true },
  { to: "/crm/leads", label: "Leads" },
  { to: "/crm/deals", label: "Deals" },
  { to: "/crm/contracts", label: "Contratos" },
  { to: "/crm/invoices", label: "Faturas" },
  { to: "/crm/engagements", label: "Engagements" },
];

export default function CrmLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM IntelliX</h1>
        <p className="text-sm text-muted-foreground">Pipeline comercial e operação de contratos</p>
      </div>
      <nav className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
                isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

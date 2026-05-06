import { Building2, Settings as SettingsIcon, LogOut, LayoutGrid, Briefcase, Sparkles, Target, Rocket, Home, Download } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const groups: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    label: "Visão Geral",
    items: [{ to: "/dashboard", label: "Dashboard", icon: Home }],
  },
  {
    label: "IntelliX",
    items: [
      { to: "/office", label: "Escritório", icon: LayoutGrid },
      { to: "/office/gestao", label: "Ágata", icon: Sparkles },
      { to: "/crm", label: "CRM", icon: Target },
      { to: "/jobs", label: "Jobs", icon: Briefcase },
    ],
  },
  {
    label: "Consultoria",
    items: [{ to: "/workspaces", label: "Engagements", icon: Building2 }],
  },
  {
    label: "Projetos Ágeis",
    items: [{ to: "/projects", label: "Projetos", icon: Rocket }],
  },
  {
    label: "Configurações",
    items: [{ to: "/settings", label: "Configurações", icon: SettingsIcon }],
  },
];

function getInitials(email: string | undefined | null): string {
  if (!email) return "?";
  return email.slice(0, 2).toUpperCase();
}

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-5">
        <BrandLogo variant="full" />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isActive &&
                      "bg-muted text-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-gradient-brand"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground">
            {getInitials(user?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-foreground" title={user?.email ?? ""}>
              {user?.email ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">Admin</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="mt-2 w-full justify-start text-muted-foreground hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}

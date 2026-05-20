import {
  Home, Briefcase, Users, BarChart3, Settings as SettingsIcon,
  LogOut, ChevronRight, Sun, Moon, FolderKanban, Building2,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { useTheme } from "@/hooks/useTheme";

type BadgeKey = "jobs" | "engagements" | "leads";

// Sidebar OpenSquad v2.1
const navItems: { to: string; label: string; icon: any; badge?: BadgeKey; end?: boolean }[] = [
  { to: "/",            label: "Dashboard",         icon: Home,         end: true },
  { to: "/engagements", label: "Engagements",       icon: Briefcase,    badge: "engagements" },
  { to: "/projetos",    label: "Projetos",          icon: FolderKanban },
  { to: "/squad",       label: "Squad",             icon: Users },
  { to: "/escritorio",  label: "Escritório virtual", icon: Building2 },
  { to: "/metrics",     label: "Métricas",          icon: BarChart3 },
  { to: "/settings",    label: "Configurações",     icon: SettingsIcon },
];

function getInitials(email: string | undefined | null): string {
  if (!email) return "?";
  const [user] = email.split("@");
  return user.slice(0, 2).toUpperCase();
}

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: badges } = useSidebarBadges();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className="relative flex h-screen w-[230px] shrink-0 flex-col"
      style={{
        background: "hsl(var(--sidebar-background))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Ambient glow top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% -10%, hsl(262 83% 58% / 0.25), transparent)",
        }}
      />

      {/* Logo */}
      <div
        className="relative flex items-center px-5 py-5"
        style={{ borderBottom: "1px solid hsl(240 16% 14%)" }}
      >
        <BrandLogo variant="full" />
      </div>

      {/* Nav — 5 telas planas */}
      <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, icon: Icon, badge, end }) => {
          const count = badge ? (badges?.[badge] ?? 0) : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-brand-soft text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                      style={{ background: "var(--gradient-brand)" }}
                    />
                  )}
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-200",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 truncate">{label}</span>
                  {badge && count > 0 && (
                    <Badge
                      className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-semibold"
                      style={{
                        background: "hsl(262 83% 58% / 0.15)",
                        color: "hsl(262 83% 75%)",
                        border: "1px solid hsl(262 83% 58% / 0.25)",
                      }}
                    >
                      {count > 99 ? "99+" : count}
                    </Badge>
                  )}
                  {!isActive && (
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-40" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className="relative px-3 pb-3 pt-3"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          {/* Avatar */}
          <div
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-brand)" }}
          >
            {getInitials(user?.email)}
            {/* Online dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
              style={{
                background: "hsl(160 84% 39%)",
                borderColor: "hsl(var(--sidebar-background))",
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="truncate text-xs font-medium text-foreground"
              title={user?.email ?? ""}
            >
              {user?.email?.split("@")[0] ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">IntelliX.AI · Admin</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}

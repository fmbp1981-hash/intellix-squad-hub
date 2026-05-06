import { NavLink, Outlet } from "react-router-dom";
import { Bell, MessageSquare, Cpu, Users, Layers, DollarSign, Mail, Plug, User, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    label: "Comunicação",
    items: [
      { to: "/settings/notifications", label: "Notificações", icon: Bell },
      { to: "/settings/whatsapp", label: "WhatsApp", icon: MessageSquare },
      { to: "/settings/email-templates", label: "Templates de E-mail", icon: Mail },
    ],
  },
  {
    label: "IA & Agentes",
    items: [
      { to: "/settings/models", label: "Modelos LLM", icon: Cpu },
      { to: "/settings/agents", label: "Agentes", icon: Users },
      { to: "/settings/squads", label: "Squads", icon: Layers },
    ],
  },
  {
    label: "Financeiro",
    items: [{ to: "/settings/budgets", label: "Orçamentos", icon: DollarSign }],
  },
  {
    label: "Conta",
    items: [
      { to: "/settings/profile", label: "Perfil", icon: User },
      { to: "/settings/drive", label: "Drive Setup", icon: HardDrive },
      { to: "/settings/integrations", label: "Integrações", icon: Plug },
    ],
  },
];

export default function SettingsLayout() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)]">
      <aside className="w-56 shrink-0 border-r border-border bg-card/30 p-4">
        <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Configurações
        </h2>
        <nav className="space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6">
        <Outlet />
      </main>
    </div>
  );
}

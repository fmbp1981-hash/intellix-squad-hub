import {
  Bot, FileText, Users, Plug, UserCog,
  Bell, MessageSquare, Cpu, Wallet, HardDrive, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Card = {
  to: string;
  title: string;
  description: string;
  icon: any;
  group: "Operação" | "Comunicação" | "Plataforma";
};

const cards: Card[] = [
  { to: "/settings/agents",       title: "Agentes",       description: "Configure agentes IA, prompts e modelos por papel.", icon: Bot,         group: "Operação" },
  { to: "/settings/templates",    title: "Templates",     description: "Modelos transacionais — emails do squad e CRM.",     icon: FileText,    group: "Comunicação" },
  { to: "/settings/squads",       title: "Squads",        description: "Defina squads, módulos ESP e capacidade.",           icon: Users,       group: "Operação" },
  { to: "/settings/users",        title: "Usuários",      description: "Membros, papéis e permissões do workspace.",         icon: UserCog,     group: "Plataforma" },
  { to: "/settings/integrations", title: "Integrações",   description: "Drive, n8n, Evolution API, webhooks externos.",      icon: Plug,        group: "Plataforma" },
  { to: "/settings/notifications",title: "Notificações",  description: "Canais e cadência de avisos do sistema.",            icon: Bell,        group: "Comunicação" },
  { to: "/settings/whatsapp",     title: "WhatsApp",      description: "Conexão Evolution API e instâncias.",                icon: MessageSquare, group: "Comunicação" },
  { to: "/settings/models",       title: "Modelos LLM",   description: "Routing rules, fallback e budget por modelo.",       icon: Cpu,         group: "Plataforma" },
  { to: "/settings/budgets",      title: "Orçamentos",    description: "Limites de gasto por engagement e alertas.",         icon: Wallet,      group: "Plataforma" },
  { to: "/settings/drive",        title: "Drive",         description: "Pasta raiz, naming e auto-archive de outputs.",      icon: HardDrive,   group: "Plataforma" },
  { to: "/settings/profile",      title: "Perfil",        description: "Sua conta, idioma, preferências.",                   icon: UserCog,     group: "Plataforma" },
];

const groupOrder: Card["group"][] = ["Operação", "Comunicação", "Plataforma"];

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes do workspace, agentes, comunicação e integrações.
        </p>
      </div>

      {groupOrder.map((group) => {
        const list = cards.filter((c) => c.group === group);
        if (!list.length) return null;
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(({ to, title, description, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{title}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

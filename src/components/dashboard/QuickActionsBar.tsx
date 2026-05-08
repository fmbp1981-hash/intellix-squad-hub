import { Plus, Send, Briefcase, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Action {
  icon: React.ElementType;
  label: string;
  to: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  highlight?: boolean;
}

const actions: Action[] = [
  {
    icon: Plus,
    label: "Novo lead",
    to: "/crm/leads",
    iconColor: "hsl(160 84% 39%)",
    bgColor: "hsl(160 84% 39% / 0.08)",
    borderColor: "hsl(160 84% 39% / 0.25)",
    textColor: "hsl(160 84% 60%)",
  },
  {
    icon: Briefcase,
    label: "Novo engagement",
    to: "/workspaces/new",
    iconColor: "hsl(189 94% 43%)",
    bgColor: "hsl(189 94% 43% / 0.08)",
    borderColor: "hsl(189 94% 43% / 0.25)",
    textColor: "hsl(189 94% 65%)",
  },
  {
    icon: Send,
    label: "Disparar job",
    to: "/jobs",
    iconColor: "hsl(262 83% 72%)",
    bgColor: "hsl(262 83% 58% / 0.08)",
    borderColor: "hsl(262 83% 58% / 0.25)",
    textColor: "hsl(262 83% 80%)",
  },
  {
    icon: Sparkles,
    label: "Falar com Ágata",
    to: "/office/gestao",
    iconColor: "#fff",
    bgColor: "var(--gradient-brand)",
    borderColor: "transparent",
    textColor: "#fff",
    highlight: true,
  },
];

export function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <div className="fade-in-up fade-in-up-delay-1 flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => navigate(a.to)}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
          style={{
            background: a.highlight ? "var(--gradient-brand)" : a.bgColor,
            border: `1px solid ${a.borderColor}`,
            color: a.textColor,
          }}
        >
          <a.icon className="h-3.5 w-3.5" style={{ color: a.iconColor }} />
          {a.label}
        </button>
      ))}
    </div>
  );
}

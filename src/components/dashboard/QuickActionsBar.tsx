import { Button } from "@/components/ui/button";
import { Plus, Send, Briefcase, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActionsBar() {
  const navigate = useNavigate();
  const actions = [
    { icon: Plus, label: "Novo lead", to: "/crm/leads" },
    { icon: Briefcase, label: "Novo engagement", to: "/workspaces/new" },
    { icon: Send, label: "Disparar job", to: "/jobs" },
    { icon: Sparkles, label: "Falar com Ágata", to: "/office/gestao" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.label} variant="outline" size="sm" onClick={() => navigate(a.to)}>
          <a.icon className="mr-2 h-3.5 w-3.5" />
          {a.label}
        </Button>
      ))}
    </div>
  );
}

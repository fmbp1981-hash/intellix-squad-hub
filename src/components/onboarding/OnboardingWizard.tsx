import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Sparkles, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useOnboarding } from "@/hooks/useOnboarding";

const STEPS = [
  {
    icon: Sparkles,
    title: "Bem-vindo à Intellix",
    body: "Operação completa: CRM comercial → entrega de squads de IA → escritório (Ágata) que orquestra tudo.",
  },
  {
    icon: Target,
    title: "1. Capture leads no CRM",
    body: "Cadastre leads, qualifique deals e converta em contratos. Eventos disparam jobs automaticamente.",
    cta: { label: "Ir para CRM", to: "/crm/leads" },
  },
  {
    icon: Building2,
    title: "2. Crie um workspace",
    body: "Cada cliente vira um workspace com plano de engagement (sequência de squads).",
    cta: { label: "Novo workspace", to: "/workspaces/new" },
  },
  {
    icon: Sparkles,
    title: "3. Acompanhe pelo escritório",
    body: "A Ágata monitora KPIs, sugere diretivas e dispara jobs internos. Tudo em /office/gestao.",
    cta: { label: "Abrir Ágata", to: "/office/gestao" },
  },
];

export function OnboardingWizard() {
  const { isFirstTime, completeOnboarding } = useOnboarding();
  const [step, setStep] = useState(0);

  if (!isFirstTime) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = s.icon;

  return (
    <Dialog open onOpenChange={(o) => !o && completeOnboarding()}>
      <DialogContent className="max-w-lg">
        <button
          onClick={completeOnboarding}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Pular"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-5 pt-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>

          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i === step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={completeOnboarding}>
              Pular tour
            </Button>
            <div className="flex gap-2">
              {s.cta && (
                <Button asChild variant="outline" size="sm" onClick={completeOnboarding}>
                  <Link to={s.cta.to}>{s.cta.label}</Link>
                </Button>
              )}
              {!isLast ? (
                <Button size="sm" onClick={() => setStep(step + 1)}>
                  Próximo <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              ) : (
                <Button size="sm" onClick={completeOnboarding}>
                  Começar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

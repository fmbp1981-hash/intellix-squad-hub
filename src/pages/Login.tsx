import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Layers, Rocket, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

const FEATURES = [
  {
    icon: Sparkles,
    title: "Squads de IA",
    desc: "Orquestre agentes especializados em consultoria.",
    color: "hsl(262 83% 58%)",
  },
  {
    icon: Layers,
    title: "Workspaces & Engagements",
    desc: "Tudo num só cockpit, do lead à entrega.",
    color: "hsl(189 94% 43%)",
  },
  {
    icon: Rocket,
    title: "Projetos Ágeis",
    desc: "Backlog, sprints e métricas em um só lugar.",
    color: "hsl(38 92% 50%)",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const onSubmit = async (values: FormValues) => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase ainda não configurado");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setSubmitting(false);
    if (error) return toast.error("Falha no login", { description: error.message });
    toast.success("Bem-vindo de volta!");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ── Brand panel ── */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-12"
        style={{ background: "hsl(240 27% 5%)" }}
      >
        {/* Gradient mesh */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 20%, hsl(262 83% 58% / 0.25), transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 80%, hsl(189 94% 43% / 0.18), transparent 60%)
            `,
          }}
        />

        {/* Grid lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(hsl(240 16% 30% / 0.4) 1px, transparent 1px),
              linear-gradient(90deg, hsl(240 16% 30% / 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Content */}
        <div className="relative">
          <BrandLogo variant="full" />
        </div>

        <div className="relative space-y-10">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Acesso interno IntelliX.AI
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight text-white">
              OpenSquad{" "}
              <span className="text-gradient-brand">Platform</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Cockpit interno para orquestrar squads de agentes IA em engagements de consultoria empresarial.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <li key={title} className="flex gap-4">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `${color}20`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground/50">
          © 2025 IntelliX.AI · Consultoria Inteligente
        </p>
      </div>

      {/* ── Form panel ── */}
      <div
        className="relative flex items-center justify-center overflow-hidden p-6"
        style={{ background: "hsl(240 22% 6%)" }}
      >
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(hsl(240 16% 20% / 0.35) 1px, transparent 1px),
              linear-gradient(90deg, hsl(240 16% 20% / 0.35) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 100%, hsl(262 83% 58% / 0.08), transparent)",
          }}
        />

        <div className="relative w-full max-w-sm fade-in-up">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <BrandLogo variant="full" />
          </div>

          {/* Glass card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "hsl(240 17% 9% / 0.85)",
              backdropFilter: "blur(16px)",
              border: "1px solid hsl(240 16% 20%)",
              boxShadow:
                "0 24px 64px -12px hsl(240 27% 2% / 0.8), 0 0 0 1px hsl(240 16% 24% / 0.3)",
            }}
          >
            {/* Top accent */}
            <div
              className="absolute inset-x-8 top-0 h-[1px] rounded-full"
              style={{ background: "var(--gradient-brand)", opacity: 0.5 }}
            />

            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Entrar
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse sua conta IntelliX.AI
            </p>

            {!isSupabaseConfigured && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                Supabase não configurado. Defina as variáveis de ambiente.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@intellixai.com.br"
                  className="border-border/60 bg-muted/50 focus:border-primary/60"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="border-border/60 bg-muted/50 focus:border-primary/60"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:opacity-90 hover:shadow-brand active:scale-[0.98] disabled:opacity-60"
                style={{ background: "var(--gradient-brand)" }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Entrar na plataforma
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

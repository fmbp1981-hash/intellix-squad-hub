import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Layers, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  { icon: Sparkles, title: "Squads de IA", desc: "Orquestre agentes especializados em consultoria." },
  { icon: Layers, title: "Workspaces & Engagements", desc: "Tudo num só cockpit, do lead à entrega." },
  { icon: Rocket, title: "Projetos Ágeis", desc: "Backlog, sprints e métricas em um só lugar." },
];

export default function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

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
    toast.success("Bem-vindo!");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between bg-gradient-brand p-12 text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative">
          <BrandLogo variant="full" />
        </div>
        <div className="relative space-y-8">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight">
              OpenSquad Platform
            </h1>
            <p className="mt-3 max-w-md text-base opacity-90">
              Cockpit interno da IntelliX.AI para orquestrar squads de agentes IA em engagements de consultoria.
            </p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm opacity-80">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs opacity-70">© IntelliX.AI · Consultoria Inteligente</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm fade-in-up">
          <div className="mb-8 lg:hidden">
            <BrandLogo variant="compact" className="h-12 w-12" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground">Entrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse sua conta IntelliX.AI
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              Supabase não configurado.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@intellixai.com.br"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-brand font-medium text-primary-foreground hover:opacity-90"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando…</>
              ) : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

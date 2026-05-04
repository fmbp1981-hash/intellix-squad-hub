import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
    if (!loading && user) navigate("/workspaces", { replace: true });
  }, [user, loading, navigate]);

  const onSubmit = async (values: FormValues) => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase ainda não configurado", {
        description: "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nos Secrets.",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setSubmitting(false);

    if (error) {
      toast.error("Falha no login", { description: error.message });
      return;
    }
    toast.success("Bem-vindo!");
    navigate("/workspaces", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-brand-soft opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-brand">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo variant="compact" className="h-16 w-16" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
            OpenSquad Platform
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            IntelliX.AI · Consultoria Inteligente
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-6 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            Supabase não configurado. Adicione <code className="font-mono">VITE_SUPABASE_URL</code>{" "}
            e <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> nos Secrets do Lovable.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@intellixai.com.br"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
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
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-brand font-medium text-primary-foreground hover:opacity-90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

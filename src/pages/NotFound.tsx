import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A rota que você procura não existe no OpenSquad.
        </p>
        <Button asChild className="mt-6 bg-gradient-brand text-primary-foreground hover:opacity-90">
          <Link to="/workspaces">Voltar para Workspaces</Link>
        </Button>
      </div>
    </div>
  );
}

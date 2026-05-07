import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary captured", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ error: null });
    window.location.assign("/dashboard");
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Algo deu errado
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.error.message || "Erro inesperado na aplicação."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={this.handleHome}>
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button onClick={this.handleReload}>
              <RotateCw className="mr-2 h-4 w-4" /> Recarregar
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

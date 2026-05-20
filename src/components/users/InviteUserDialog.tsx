import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useInviteUser, type InviteInput } from "@/hooks/useInviteUser";

const ROLES: { value: InviteInput["role"]; label: string; hint: string }[] = [
  { value: "admin",     label: "Admin",        hint: "Acesso total, pode convidar outros." },
  { value: "agent",     label: "Agente IA",    hint: "Executa squads e runs." },
  { value: "validator", label: "Validador",    hint: "Aprova entregas e módulos." },
  { value: "client",    label: "Cliente",      hint: "Vê apenas seus engagements." },
  { value: "viewer",    label: "Visualizador", hint: "Read-only no workspace." },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const invite = useInviteUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<InviteInput["role"]>("viewer");

  const canSubmit =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !invite.isPending;

  const reset = () => {
    setEmail("");
    setFullName("");
    setRole("viewer");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const res = await invite.mutateAsync({
        email: email.trim().toLowerCase(),
        role,
        full_name: fullName.trim() || undefined,
      });
      toast({
        title: res.already_existed ? "Role atualizado" : "Convite enviado",
        description: res.already_existed
          ? `${res.email} já existia. Role ${res.role} atribuído.`
          : `Email enviado para ${res.email}.`,
      });
      onOpenChange(false);
      reset();
    } catch (err) {
      toast({
        title: "Falha ao convidar",
        description: err instanceof Error ? err.message : "Erro inesperado",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
          <DialogDescription>
            Envia convite por email e atribui o role inicial. Se o usuário já existir, apenas o role é adicionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@empresa.com"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Nome (opcional)</Label>
            <Input
              id="invite-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InviteInput["role"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <span className="flex flex-col">
                      <span>{r.label}</span>
                      <span className="text-[10px] text-muted-foreground">{r.hint}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={invite.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

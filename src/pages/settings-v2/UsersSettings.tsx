import { useState } from "react";
import { ArrowLeft, Plus, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";

interface Roster {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  roles: string[];
}

const roleLabel: Record<string, string> = {
  admin: "Admin",
  agent: "Agente IA",
  validator: "Validador",
  client: "Cliente",
  viewer: "Visualizador",
};

function useRoster() {
  return useQuery<Roster[]>({
    queryKey: ["users-roster"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, avatar_url"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesByUser = new Map<string, string[]>();
      for (const r of (rolesRes.data ?? []) as { user_id: string; role: string }[]) {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      }

      const profiles = (profilesRes.data ?? []) as {
        id: string; email: string; full_name: string | null; avatar_url: string | null;
      }[];

      const profileIds = new Set(profiles.map((p) => p.id));
      const orphanRoleUsers = [...rolesByUser.keys()].filter((u) => !profileIds.has(u));

      const rows: Roster[] = [
        ...profiles.map((p) => ({
          user_id: p.id,
          email: p.email,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          roles: (rolesByUser.get(p.id) ?? []).sort(),
        })),
        ...orphanRoleUsers.map((uid) => ({
          user_id: uid,
          email: null,
          full_name: null,
          avatar_url: null,
          roles: (rolesByUser.get(uid) ?? []).sort(),
        })),
      ];

      rows.sort((a, b) =>
        (a.full_name ?? a.email ?? a.user_id).localeCompare(b.full_name ?? b.email ?? b.user_id),
      );
      return rows;
    },
  });
}

function getInitials(name: string | null, email: string | null) {
  const src = (name ?? email ?? "?").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function UsersSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useRoster();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Configurações
          </Button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Membros do workspace, papéis e convites.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Convidar usuário
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Nenhum usuário cadastrado ainda.
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="grid grid-cols-12 gap-3 border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-6">Pessoa</div>
            <div className="col-span-4">Papéis</div>
            <div className="col-span-2 text-right">Você</div>
          </div>
          {rows.map((r) => {
            const isMe = r.user_id === user?.id;
            return (
              <div
                key={r.user_id}
                className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
              >
                <div className="col-span-6 flex min-w-0 items-center gap-3">
                  {r.avatar_url ? (
                    <img
                      src={r.avatar_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(r.full_name, r.email)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.full_name ?? r.email ?? `${r.user_id.slice(0, 8)}…`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.email ?? <span className="font-mono">{r.user_id}</span>}
                    </p>
                  </div>
                </div>
                <div className="col-span-4 flex flex-wrap gap-1.5">
                  {r.roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">sem role</span>
                  ) : (
                    r.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-[10px]">
                        {roleLabel[role] ?? role}
                      </Badge>
                    ))
                  )}
                </div>
                <div className="col-span-2 flex justify-end">
                  {isMe ? <Badge>Você</Badge> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

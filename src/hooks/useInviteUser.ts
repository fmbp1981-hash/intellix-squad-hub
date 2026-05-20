import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InviteInput {
  email: string;
  role: "admin" | "agent" | "validator" | "client" | "viewer";
  full_name?: string;
}

export interface InviteResult {
  ok: boolean;
  user_id: string;
  email: string;
  role: string;
  invited: boolean;
  already_existed: boolean;
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation<InviteResult, Error, InviteInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke<InviteResult>("admin-invite", {
        body: input,
      });
      if (error) throw new Error(error.message ?? "Erro ao convidar");
      if (!data || !data.ok) throw new Error("Resposta inválida do servidor");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-roster"] });
    },
  });
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  template?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  silent?: boolean;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  id?: string;
  error?: string;
}

export function useSendEmail() {
  const [loading, setLoading] = useState(false);

  const send = async (params: SendEmailParams): Promise<SendEmailResult> => {
    setLoading(true);
    try {
      const { silent, ...body } = params;
      const { data, error } = await supabase.functions.invoke("send-email", { body });

      if (error) {
        // status 503 (skipped) chega como erro no client, com data preservado
        const skipped = (data as any)?.skipped;
        if (skipped) {
          if (!silent) toast.warning((data as any).reason ?? "Provedor de e-mail não configurado");
          return { ok: false, skipped: true, reason: (data as any).reason };
        }
        if (!silent) toast.error(error.message ?? "Falha ao enviar e-mail");
        return { ok: false, error: error.message };
      }

      if (!silent) toast.success("E-mail enviado");
      return { ok: true, id: (data as any)?.id };
    } catch (e: any) {
      if (!params.silent) toast.error(e?.message ?? "Erro inesperado");
      return { ok: false, error: e?.message };
    } finally {
      setLoading(false);
    }
  };

  return { send, loading };
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { WorkspaceForm, type WorkspaceFormValues } from '@/components/workspace/WorkspaceForm';
import { createWorkspace, getTemplates } from '@/lib/supabase/workspaces';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function NewWorkspace() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const templatesQ = useQuery({ queryKey: ['templates'], queryFn: getTemplates });

  const handleSubmit = async (values: WorkspaceFormValues) => {
    if (!user) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }
    setSubmitting(true);
    try {
      const ws = await createWorkspace({
        client_name: values.client_name,
        engagement_name: values.engagement_name,
        description: values.description,
        template_id: values.template_id,
        owner_id: user.id,
      });

      // Fire-and-forget: a Edge Function `drive-setup` será criada no Prompt 7
      supabase.functions
        .invoke('drive-setup', { body: { workspaceId: ws.id } })
        // eslint-disable-next-line no-console
        .catch((err) => console.warn('[drive-setup] não disponível ainda:', err));

      qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace criado!', {
        description: 'Pasta no Google Drive sendo configurada…',
      });
      navigate(`/workspaces/${ws.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Falha ao criar workspace', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/workspaces">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground">Novo Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Configure o engagement de consultoria para um cliente.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-6">
        <WorkspaceForm
          templates={templatesQ.data ?? []}
          templatesLoading={templatesQ.isLoading}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

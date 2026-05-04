import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Template } from '@/types';

const NO_TEMPLATE = '__none__';

const schema = z.object({
  client_name: z.string().trim().min(1, 'Informe o nome do cliente').max(120),
  engagement_name: z.string().trim().min(1, 'Informe o nome do engagement').max(160),
  description: z.string().trim().max(2000).optional(),
  template_id: z.string().optional(),
});

export type WorkspaceFormValues = z.infer<typeof schema>;

interface Props {
  templates: Template[];
  templatesLoading?: boolean;
  submitting?: boolean;
  onSubmit: (values: WorkspaceFormValues) => void | Promise<void>;
}

export function WorkspaceForm({ templates, templatesLoading, submitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { template_id: NO_TEMPLATE },
  });

  const selectedTemplateId = watch('template_id');
  const selectedTemplate =
    selectedTemplateId && selectedTemplateId !== NO_TEMPLATE
      ? templates.find((t) => t.id === selectedTemplateId)
      : undefined;

  const submit = handleSubmit((values) => {
    onSubmit({
      ...values,
      template_id: values.template_id === NO_TEMPLATE ? undefined : values.template_id,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="client_name">Cliente *</Label>
        <Input
          id="client_name"
          placeholder="Nome da empresa cliente"
          {...register('client_name')}
        />
        {errors.client_name && (
          <p className="text-xs text-destructive">{errors.client_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="engagement_name">Engagement *</Label>
        <Input
          id="engagement_name"
          placeholder="Ex: Diagnóstico de RH Q2 2026"
          {...register('engagement_name')}
        />
        {errors.engagement_name && (
          <p className="text-xs text-destructive">{errors.engagement_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Contexto adicional do engagement (opcional)"
          {...register('description')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template_id">Template</Label>
        <Select
          value={selectedTemplateId ?? NO_TEMPLATE}
          onValueChange={(v) => setValue('template_id', v, { shouldDirty: true })}
          disabled={templatesLoading}
        >
          <SelectTrigger id="template_id">
            <SelectValue placeholder="Selecione um template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TEMPLATE}>Sem template</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplate?.description && (
          <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            {selectedTemplate.description}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando…
          </>
        ) : (
          'Criar workspace'
        )}
      </Button>
    </form>
  );
}

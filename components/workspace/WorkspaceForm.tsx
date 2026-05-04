'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const schema = z.object({
  clientName: z.string().min(2, 'Nome do cliente obrigatório'),
  engagementName: z.string().min(2, 'Nome do engagement obrigatório'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function slugify(text: string) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function WorkspaceForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const router = useRouter()

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const slug = `${slugify(data.clientName)}-${Date.now()}`

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        slug,
        client_name: data.clientName,
        engagement_name: data.engagementName,
        description: data.description ?? null,
        owner_id: user?.id,
      })
      .select()
      .single()

    if (error) { alert(error.message); return }

    fetch('/api/drive/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: workspace.id }),
    })

    router.push(`/workspaces/${workspace.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label className="text-gray-300">Nome do Cliente / Empresa</Label>
        <Input {...register('clientName')}
          className="bg-gray-800 border-gray-700 text-white"
          placeholder="Ex: Empresa XYZ" />
        {errors.clientName && <p className="text-red-400 text-sm">{errors.clientName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-gray-300">Nome do Engagement</Label>
        <Input {...register('engagementName')}
          className="bg-gray-800 border-gray-700 text-white"
          placeholder="Ex: Diagnóstico de Processos Q2 2026" />
        {errors.engagementName && <p className="text-red-400 text-sm">{errors.engagementName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-gray-300">Descrição (opcional)</Label>
        <Input {...register('description')}
          className="bg-gray-800 border-gray-700 text-white" />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Criando...' : 'Criar Workspace'}
      </Button>
    </form>
  )
}

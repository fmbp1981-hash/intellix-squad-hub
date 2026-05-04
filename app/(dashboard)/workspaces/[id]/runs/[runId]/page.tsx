import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { marked } from 'marked'

export default async function RunDetailPage({
  params,
}: { params: Promise<{ id: string; runId: string }> }) {
  const { runId } = await params
  const supabase = await createClient()

  const { data: run } = await supabase
    .from('squad_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (!run) notFound()

  const html = run.output_markdown
    ? await marked(run.output_markdown)
    : null

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white capitalize">{run.squad_name}</h2>
        {run.drive_file_url && (
          <a href={run.drive_file_url} target="_blank" rel="noopener noreferrer"
            className="text-green-400 text-sm border border-green-800 rounded px-2 py-1 hover:bg-green-900/30">
            Abrir no Drive
          </a>
        )}
      </div>
      {html ? (
        <div
          className="prose prose-invert max-w-none bg-gray-900 rounded-lg p-6 border border-gray-800"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-gray-500">Output ainda não disponível.</p>
      )}
    </div>
  )
}

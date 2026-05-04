import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { generatePdf } from '@/lib/export/pdf-generator'
import { generateDocx } from '@/lib/export/docx-generator'
import { uploadToDrive } from '@/lib/drive/uploader'

const WORKSPACES_DIR = process.env.OPENSQUAD_WORKSPACES_DIR ?? '/srv/opensquad-workspaces'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const { workspaceId, workspaceSlug, squadName } = await req.json()
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('drive_folder_id, client_name, engagement_name')
    .eq('id', workspaceId)
    .single()

  if (!workspace?.drive_folder_id) {
    return NextResponse.json({ error: 'No Drive folder configured' }, { status: 400 })
  }

  const outputDir = path.join(WORKSPACES_DIR, workspaceSlug, 'squads', squadName, 'output')
  let markdown = ''
  try {
    const { readdirSync } = await import('node:fs')
    const runs = readdirSync(outputDir).sort().reverse()
    if (runs.length > 0) {
      const runDir = path.join(outputDir, runs[0])
      const files = readdirSync(runDir, { recursive: true }) as string[]
      const mdFile = files.find(f => f.endsWith('.md'))
      if (mdFile) {
        markdown = await readFile(path.join(runDir, mdFile), 'utf-8')
      }
    }
  } catch (e) {
    console.error('export: error reading output dir', e)
  }

  if (!markdown) {
    return NextResponse.json({ error: 'No output found' }, { status: 404 })
  }

  const title = `${workspace.client_name} — ${squadName} — ${new Date().toLocaleDateString('pt-BR')}`

  const [pdfBuffer, docxBuffer] = await Promise.all([
    generatePdf(markdown, title),
    generateDocx(markdown, title),
  ])

  const safeName = `${squadName}-${new Date().toISOString().slice(0, 10)}`

  const [pdfResult] = await Promise.all([
    uploadToDrive(workspace.drive_folder_id, `${safeName}.pdf`, pdfBuffer, 'application/pdf'),
    uploadToDrive(workspace.drive_folder_id, `${safeName}.docx`, docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  ])

  await supabase.from('squad_runs').update({
    output_markdown: markdown,
    drive_file_id: pdfResult.fileId,
    drive_file_url: pdfResult.fileUrl,
  }).eq('id', runId)

  return NextResponse.json({ pdfUrl: pdfResult.fileUrl })
}

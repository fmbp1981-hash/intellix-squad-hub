import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClientFolder } from '@/lib/drive/folder-manager'

export async function POST(req: NextRequest) {
  const { workspaceId } = await req.json()
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('client_name, engagement_name')
    .eq('id', workspaceId)
    .single()

  if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { folderId, folderUrl } = await createClientFolder(
    workspace.client_name,
    workspace.engagement_name
  )

  await supabase.from('workspaces').update({
    drive_folder_id: folderId,
    drive_folder_url: folderUrl,
  }).eq('id', workspaceId)

  return NextResponse.json({ folderId, folderUrl })
}

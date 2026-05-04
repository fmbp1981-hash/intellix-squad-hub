import { getDriveClient } from './client'

export async function createClientFolder(clientName: string, engagementName: string): Promise<{
  folderId: string
  folderUrl: string
}> {
  const drive = getDriveClient()
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!

  const clientSearch = await drive.files.list({
    q: `name='${clientName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
  })

  let clientFolderId: string
  if (clientSearch.data.files?.length) {
    clientFolderId = clientSearch.data.files[0].id!
  } else {
    const clientFolder = await drive.files.create({
      requestBody: {
        name: clientName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    })
    clientFolderId = clientFolder.data.id!
  }

  const engFolder = await drive.files.create({
    requestBody: {
      name: engagementName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [clientFolderId],
    },
    fields: 'id',
  })

  const folderId = engFolder.data.id!
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`
  return { folderId, folderUrl }
}

import { getDriveClient } from './client'
import { Readable } from 'node:stream'

export async function uploadToDrive(
  folderId: string,
  fileName: string,
  content: Buffer,
  mimeType: string
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = getDriveClient()

  const stream = Readable.from(content)
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },
    media: { mimeType, body: stream },
    fields: 'id',
  })

  const fileId = res.data.id!
  const fileUrl = `https://drive.google.com/file/d/${fileId}/view`
  return { fileId, fileUrl }
}

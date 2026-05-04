import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

export async function generateDocx(markdown: string, title: string): Promise<Buffer> {
  const lines = markdown.split('\n')
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `IntelliX.AI — ${new Date().toLocaleDateString('pt-BR')}`, spacing: { after: 400 } }),
  ]

  for (const line of lines) {
    if (line.startsWith('# '))
      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }))
    else if (line.startsWith('## '))
      children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }))
    else if (line.startsWith('### '))
      children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }))
    else if (line.trim() === '')
      children.push(new Paragraph({ text: '' }))
    else
      children.push(new Paragraph({ children: [new TextRun({ text: line })] }))
  }

  const doc = new Document({ sections: [{ properties: {}, children }] })
  return Packer.toBuffer(doc)
}

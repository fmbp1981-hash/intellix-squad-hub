import puppeteer from 'puppeteer'
import { marked } from 'marked'

export async function generatePdf(markdown: string, title: string): Promise<Buffer> {
  const html = `
    <!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.6; }
      h1, h2, h3 { color: #1a1a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
      pre code { display: block; padding: 16px; overflow-x: auto; }
      header { border-bottom: 2px solid #1a1a2e; margin-bottom: 32px; padding-bottom: 16px; }
      header h1 { border: none; margin: 0; }
      header p { color: #6b7280; margin: 4px 0 0; }
    </style>
    </head><body>
    <header>
      <h1>${title}</h1>
      <p>IntelliX.AI — Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </header>
    ${await marked(markdown)}
    </body></html>
  `
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } })
  await browser.close()
  return Buffer.from(pdf)
}

# Sprint B — Playwright Carousel Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a geração de slides por GPT Image 2 (baixa qualidade, genérica) por um renderer Playwright que usa o design system real da IntelliX para produzir carrosséis de 1080×1350px com identidade visual correta.

**Architecture:** Um serviço Node.js+Playwright roda no VPS Hostinger (2.25.200.152:3001) e recebe slides via HTTP POST, renderiza HTML parametrizado com design system IntelliX e retorna PNGs em base64. Uma nova edge function `marketing-carousel-render` orquestra a chamada, faz upload para Supabase Storage e devolve URLs públicas. O `marketing-publisher` existente substitui `generateAndStoreSlideImage` (GPT Image 2) pela chamada à nova edge function.

**Tech Stack:** Node.js 20 LTS, Express 4, Playwright (chromium), PM2, SSH/SCP (deploy), Supabase Edge Functions (Deno), TypeScript strict.

**Credenciais VPS:**
- IP: `2.25.200.152` · usuário: `root` · senha: `m,7ukcfXXP+(2xB,`
- Serviço na porta `3001`, protegido por header `x-api-key`

---

## Mapa de Arquivos

### Criados — VPS (`/opt/playwright-service/`)
| Arquivo | Responsabilidade |
|---------|-----------------|
| `package.json` | Dependências (express, playwright) |
| `server.js` | HTTP server Express, endpoint POST /render, PM2 entrypoint |
| `template.js` | Gerador de HTML por slide — layouts por formato e posição |
| `.env` | `PORT=3001` + `PLAYWRIGHT_API_KEY=<secret>` |

### Criados — Repositório
| Arquivo | Responsabilidade |
|---------|-----------------|
| `playwright-service/package.json` | Cópia versionada dos deps |
| `playwright-service/server.js` | Cópia versionada |
| `playwright-service/template.js` | Cópia versionada |
| `supabase/functions/marketing-carousel-render/index.ts` | Edge function orquestradora |

### Modificados
| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/marketing-publisher/index.ts` | Substitui `generateAndStoreSlideImage` + `STYLE_BY_PILAR` por chamada a `marketing-carousel-render` |

---

## Task 1: Setup do VPS — Node.js, PM2 e dependências Playwright

Instalar o runtime e as dependências de sistema necessárias para o Chromium headless no Hostinger Ubuntu.

**Files:** nenhum arquivo local — apenas comandos SSH remotos.

- [ ] **Step 1: Verificar acesso SSH**

No PowerShell local:
```powershell
ssh -o StrictHostKeyChecking=no root@2.25.200.152 "echo 'SSH OK' && uname -a && lsb_release -a 2>/dev/null || cat /etc/os-release"
```

Senha: `m,7ukcfXXP+(2xB,`

Saída esperada: linha `SSH OK` + informação de OS (Ubuntu 20.04 ou 22.04 típico da Hostinger).

- [ ] **Step 2: Instalar Node.js 20 LTS**

```powershell
ssh root@2.25.200.152 "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
```

Verificar instalação:
```powershell
ssh root@2.25.200.152 "node --version && npm --version"
```

Saída esperada: `v20.x.x` e `10.x.x`.

- [ ] **Step 3: Instalar PM2**

```powershell
ssh root@2.25.200.152 "npm install -g pm2 && pm2 --version"
```

Saída esperada: versão do PM2 (ex: `5.x.x`).

- [ ] **Step 4: Instalar dependências de sistema do Chromium**

```powershell
ssh root@2.25.200.152 "apt-get install -y libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libx11-6 libxext6 2>&1 | tail -5"
```

Saída esperada: `Processing triggers...` ou `already the newest version`.

- [ ] **Step 5: Criar diretório do serviço**

```powershell
ssh root@2.25.200.152 "mkdir -p /opt/playwright-service && echo 'dir created'"
```

- [ ] **Step 6: Abrir porta 3001 no firewall**

```powershell
ssh root@2.25.200.152 "ufw allow 3001/tcp && ufw status | grep 3001"
```

Saída esperada: `3001/tcp ALLOW Anywhere`

Se `ufw` estiver inativo: `ufw enable && ufw allow 3001/tcp && ufw allow 22/tcp`

---

## Task 2: Criar arquivos do serviço Playwright localmente

Criar os 3 arquivos do serviço em `playwright-service/` no repositório (para versionamento) e também preparar os arquivos para envio ao VPS.

**Files:**
- Create: `playwright-service/package.json`
- Create: `playwright-service/server.js`
- Create: `playwright-service/template.js`

- [ ] **Step 1: Criar `playwright-service/package.json`**

```json
{
  "name": "playwright-carousel-service",
  "version": "1.0.0",
  "description": "IntelliX carousel slide renderer using Playwright",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "playwright": "^1.44.1",
    "dotenv": "^16.4.5"
  }
}
```

- [ ] **Step 2: Criar `playwright-service/template.js`**

Este é o núcleo do sistema — gera HTML completo por slide usando o design system IntelliX.

```javascript
// template.js — IntelliX carousel slide HTML generator
// Formats: A (Storytelling), B (FAQ), C (Philosophical), D (Product), E (Data Story)
// Dimensions: 1080x1350 (4:5 Instagram/LinkedIn carousel)

'use strict';

const PILAR_COLORS = {
  resultado_ia:     { accent: '#72E8B4', chipBg: 'rgba(114,232,180,0.12)', chipBorder: 'rgba(114,232,180,0.25)' },
  educacao_pratica: { accent: '#70C0F0', chipBg: 'rgba(112,192,240,0.12)', chipBorder: 'rgba(112,192,240,0.25)' },
  bastidores:       { accent: '#A0A0F8', chipBg: 'rgba(160,160,248,0.12)', chipBorder: 'rgba(160,160,248,0.25)' },
  posicionamento:   { accent: '#F2C55A', chipBg: 'rgba(242,197,90,0.12)',  chipBorder: 'rgba(242,197,90,0.25)'  },
  comercial:        { accent: '#F08080', chipBg: 'rgba(240,128,128,0.12)', chipBorder: 'rgba(240,128,128,0.25)' },
};

const PILAR_LABELS = {
  resultado_ia:     'Resultado IA',
  educacao_pratica: 'Educação',
  bastidores:       'Bastidores',
  posicionamento:   'Posicionamento',
  comercial:        'Comercial',
};

// Format E: label chips per slide number (1-based)
const FORMAT_E_CHIPS = {
  2: { text: 'CONTEXTO',     color: '#4FA6CC', bg: 'rgba(79,166,204,0.12)',  border: 'rgba(79,166,204,0.3)'   },
  3: { text: 'INSIGHT',      color: '#A0A0F8', bg: 'rgba(160,160,248,0.12)', border: 'rgba(160,160,248,0.3)'  },
  4: { text: 'IMPLICAÇÃO',   color: '#F08080', bg: 'rgba(240,128,128,0.12)', border: 'rgba(240,128,128,0.3)'  },
  5: { text: 'RECOMENDAÇÃO', color: '#F2A82A', bg: 'rgba(242,168,42,0.12)',  border: 'rgba(242,168,42,0.35)'  },
};

// Derive format from pilar (for carousel — all are Instagram in Sprint B)
function deriveFormat(pilar) {
  if (pilar === 'resultado_ia' || pilar === 'educacao_pratica') return 'E';
  if (pilar === 'posicionamento' || pilar === 'bastidores') return 'C';
  return 'A';
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLines(text, fontSize = '28px', color = '#BDBDC3', weight = 400, lineHeight = '1.65') {
  const lines = text.trim().split('\n').filter(Boolean);
  return lines.map(line =>
    `<p style="font-size:${fontSize};font-weight:${weight};color:${color};line-height:${lineHeight};margin-bottom:16px;">${esc(line)}</p>`
  ).join('');
}

function baseCSS(pc) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:1080px;height:1350px;overflow:hidden;}
    body{background:#171723;font-family:'Space Grotesk',sans-serif;color:#FAFAFA;position:relative;}
    .slide{width:1080px;height:1350px;padding:80px 90px;display:flex;flex-direction:column;position:relative;overflow:hidden;}
    .orb{position:absolute;border-radius:50%;filter:blur(130px);pointer-events:none;}
    .orb1{width:700px;height:700px;top:-200px;right:-200px;background:${pc.accent};opacity:0.07;}
    .orb2{width:500px;height:500px;bottom:-150px;left:-150px;background:#196FA8;opacity:0.09;}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:64px;flex-shrink:0;}
    .logo{font-size:20px;font-weight:700;letter-spacing:-0.3px;}
    .logo-i{color:#F2A82A;}.logo-a{color:#4FA6CC;}
    .cnt{font-family:'JetBrains Mono',monospace;font-size:13px;color:#8C8C99;letter-spacing:1px;}
    .ruler{width:80px;height:5px;background:linear-gradient(135deg,#F2A82A,#196FA8);border-radius:3px;margin-bottom:48px;flex-shrink:0;}
    .chip{display:inline-flex;align-items:center;padding:7px 14px;border-radius:20px;font-size:13px;font-weight:600;letter-spacing:0.5px;background:${pc.chipBg};color:${pc.accent};border:1px solid ${pc.chipBorder};margin-bottom:32px;flex-shrink:0;}
    .lbl{display:inline-flex;align-items:center;padding:8px 16px;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:36px;flex-shrink:0;}
    .rec{border-left:5px solid #F2A82A;padding:28px 32px;background:rgba(242,168,42,0.05);border-radius:0 12px 12px 0;}
    .mid{flex:1;display:flex;flex-direction:column;justify-content:center;}
    .foot{margin-top:auto;}
    .hint{font-family:'JetBrains Mono',monospace;font-size:13px;color:#8C8C99;letter-spacing:1.5px;}
    .cta-btn{display:inline-flex;align-items:center;padding:20px 40px;border-radius:12px;background:linear-gradient(135deg,#F2A82A,#E6971F);color:#1A140A;font-size:22px;font-weight:700;margin-top:44px;}
  `;
}

function logo() {
  return `<div class="logo"><span class="logo-i">IntelliX</span><span class="logo-a">.AI</span></div>`;
}

function counter(idx, total) {
  if (total <= 1) return '';
  return `<span class="cnt">${String(idx + 1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span>`;
}

function generateSlideHTML({ content, slideIndex, totalSlides, pilar, title }) {
  const slideNum = slideIndex + 1;
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === totalSlides - 1;
  const format = deriveFormat(pilar);
  const pc = PILAR_COLORS[pilar] || PILAR_COLORS.educacao_pratica;
  const pilarLabel = PILAR_LABELS[pilar] || pilar;
  const css = baseCSS(pc);

  let inner = '';

  if (isFirst) {
    // ── COVER SLIDE ──────────────────────────────────────────────────────────
    const lines = content.trim().split('\n').filter(Boolean);
    const headline = lines[0] || title || '';
    const sub = lines.slice(1).join(' ').trim();

    inner = `
      <div class="orb orb1"></div><div class="orb orb2"></div>
      <div class="hdr">${logo()}<span class="hint">ARRASTE →</span></div>
      <div class="chip">${esc(pilarLabel)}</div>
      <div class="ruler"></div>
      <div class="mid">
        <p style="font-size:58px;font-weight:800;line-height:1.1;letter-spacing:-1px;">${esc(headline)}</p>
        ${sub ? `<p style="font-size:26px;font-weight:400;color:#BDBDC3;line-height:1.6;margin-top:28px;">${esc(sub)}</p>` : ''}
      </div>
      <div class="foot">
        <p class="hint" style="font-size:12px;margin-bottom:8px;">DESLIZE PARA SABER MAIS →</p>
      </div>`;

  } else if (isLast) {
    // ── CTA SLIDE ────────────────────────────────────────────────────────────
    const lines = content.trim().split('\n').filter(Boolean);
    const ctaText = lines[0] || 'Quer resultado real com IA?';
    const sub = lines.slice(1).join(' ').trim();

    inner = `
      <div class="orb orb1"></div><div class="orb orb2"></div>
      <div class="hdr">${logo()}${counter(slideIndex, totalSlides)}</div>
      <div class="mid">
        <div class="ruler"></div>
        <p style="font-size:44px;font-weight:700;line-height:1.15;">${esc(ctaText)}</p>
        ${sub ? `<p style="font-size:26px;font-weight:400;color:#BDBDC3;line-height:1.6;margin-top:24px;">${esc(sub)}</p>` : ''}
        <div class="cta-btn">Link na bio →</div>
      </div>
      <div class="foot" style="margin-top:40px;">
        <p style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#8C8C99;letter-spacing:1px;">intellixai.com.br</p>
      </div>`;

  } else if (format === 'C') {
    // ── PHILOSOPHICAL — ultra minimal ─────────────────────────────────────────
    inner = `
      <div class="orb orb1"></div>
      <div class="hdr" style="margin-bottom:0;position:absolute;top:80px;left:90px;right:90px;">${logo()}${counter(slideIndex, totalSlides)}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        ${renderLines(content, '52px', '#FAFAFA', 800, '1.15')}
      </div>`;

  } else if (format === 'E') {
    // ── DATA STORY slides ─────────────────────────────────────────────────────
    // Slide 2 = CONTEXTO, 3 = INSIGHT, 4 = IMPLICAÇÃO, 5 = RECOMENDAÇÃO
    const chip = FORMAT_E_CHIPS[slideNum];
    const isRec = slideNum === 5;

    // Slide 1 is handled by isFirst above.
    // For Format E slide 1 (data anchor), it IS the first slide.
    // Check if this looks like a data anchor (very short, mostly number):
    const contentBody = isRec
      ? `<div class="rec">${renderLines(content, '28px', '#FAFAFA', 600, '1.65')}</div>`
      : renderLines(content, '28px', '#BDBDC3', 400, '1.65');

    inner = `
      <div class="orb orb1"></div><div class="orb orb2"></div>
      <div class="hdr">${logo()}${counter(slideIndex, totalSlides)}</div>
      ${chip ? `<div class="lbl" style="background:${chip.bg};color:${chip.color};border:1px solid ${chip.border};">${chip.text}</div>` : ''}
      <div class="mid">${contentBody}</div>`;

  } else {
    // ── DEFAULT content slide (A, B, D) ───────────────────────────────────────
    inner = `
      <div class="orb orb1"></div><div class="orb orb2"></div>
      <div class="hdr">${logo()}${counter(slideIndex, totalSlides)}</div>
      <div class="mid">${renderLines(content, '28px', '#BDBDC3', 400, '1.65')}</div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  <div class="slide">${inner}</div>
</body>
</html>`;
}

module.exports = { generateSlideHTML };
```

- [ ] **Step 3: Criar `playwright-service/server.js`**

```javascript
// server.js — IntelliX Playwright Carousel Renderer Service
'use strict';

require('dotenv').config();
const express = require('express');
const { chromium } = require('playwright');
const { generateSlideHTML } = require('./template');

const app = express();
app.use(express.json({ limit: '10mb' }));

const API_KEY = process.env.PLAYWRIGHT_API_KEY;
const PORT = process.env.PORT || 3001;

if (!API_KEY) {
  console.error('[playwright-service] PLAYWRIGHT_API_KEY not set — exiting');
  process.exit(1);
}

// ── Auth middleware ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === '/health') return next(); // health check is public
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

// ── Browser singleton ────────────────────────────────────────────────────────
let browser = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  console.log('[playwright-service] launching chromium...');
  browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  console.log('[playwright-service] chromium ready');
  return browser;
}

// Warm up on start
getBrowser().catch(e => console.error('[playwright-service] warmup failed:', e));

// ── POST /render ─────────────────────────────────────────────────────────────
app.post('/render', async (req, res) => {
  const { slides } = req.body;

  if (!Array.isArray(slides) || slides.length === 0) {
    return res.status(400).json({ error: 'slides[] array required' });
  }
  if (slides.length > 10) {
    return res.status(400).json({ error: 'max 10 slides per request' });
  }

  console.log(`[playwright-service] rendering ${slides.length} slides for pilar="${slides[0]?.pilar}"`);

  try {
    const b = await getBrowser();
    const images = [];

    for (let i = 0; i < slides.length; i++) {
      const html = generateSlideHTML(slides[i]);
      const page = await b.newPage();
      try {
        await page.setViewportSize({ width: 1080, height: 1350 });
        await page.setContent(html, { waitUntil: 'networkidle', timeout: 15000 });
        const screenshot = await page.screenshot({ type: 'png', fullPage: false });
        images.push(screenshot.toString('base64'));
        console.log(`[playwright-service] slide ${i + 1}/${slides.length} ✅`);
      } finally {
        await page.close();
      }
    }

    res.json({ success: true, images });
  } catch (e) {
    console.error('[playwright-service] render error:', e);
    res.status(500).json({ error: String(e) });
  }
});

// ── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, pid: process.pid });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[playwright-service] listening on :${PORT}`);
});
```

- [ ] **Step 4: Commit**

```bash
git add playwright-service/
git commit -m "feat(playwright-service): add carousel renderer service with IntelliX design system template"
```

---

## Task 3: Deploy do serviço no VPS

Copiar os arquivos para o VPS, instalar dependências, instalar Chromium e iniciar com PM2.

**Files:** (apenas deploy — sem novos arquivos)

- [ ] **Step 1: Copiar arquivos para o VPS via SCP**

No PowerShell local, a partir da raiz do repositório:
```powershell
scp playwright-service/package.json root@2.25.200.152:/opt/playwright-service/package.json
scp playwright-service/server.js    root@2.25.200.152:/opt/playwright-service/server.js
scp playwright-service/template.js  root@2.25.200.152:/opt/playwright-service/template.js
```

- [ ] **Step 2: Criar o `.env` no VPS**

Gerar uma API key segura (32 chars hex) e criar o .env:
```powershell
$key = -join ((0..31) | ForEach-Object { [char]([byte][System.Security.Cryptography.RandomNumberGenerator]::GetBytes(1)[0] % 26 + 97) })
Write-Host "PLAYWRIGHT_API_KEY=$key"
ssh root@2.25.200.152 "echo 'PORT=3001' > /opt/playwright-service/.env && echo 'PLAYWRIGHT_API_KEY=$key' >> /opt/playwright-service/.env && cat /opt/playwright-service/.env"
```

**IMPORTANTE:** Anote o valor de `PLAYWRIGHT_API_KEY` — ele será adicionado como secret no Supabase em Task 6.

- [ ] **Step 3: Instalar dependências Node.js no VPS**

```powershell
ssh root@2.25.200.152 "cd /opt/playwright-service && npm install 2>&1 | tail -5"
```

Saída esperada: `added N packages` sem erros.

- [ ] **Step 4: Instalar Chromium via Playwright**

```powershell
ssh root@2.25.200.152 "cd /opt/playwright-service && npx playwright install chromium 2>&1 | tail -10"
```

Saída esperada: `Chromium X.X.X (playwright build vXXXX) downloaded to /root/.cache/ms-playwright/...`

- [ ] **Step 5: Testar o serviço manualmente**

```powershell
# Inicia o serviço em background para teste
ssh root@2.25.200.152 "cd /opt/playwright-service && node server.js &"
```

Aguardar 3 segundos e testar o health check:
```powershell
ssh root@2.25.200.152 "sleep 3 && curl -s http://localhost:3001/health"
```

Saída esperada: `{"ok":true,"pid":XXXX}`

Matar o processo de teste:
```powershell
ssh root@2.25.200.152 "pkill -f 'node server.js' 2>/dev/null; echo done"
```

- [ ] **Step 6: Iniciar com PM2 e configurar auto-restart**

```powershell
ssh root@2.25.200.152 "cd /opt/playwright-service && pm2 start server.js --name playwright-service && pm2 save && pm2 startup 2>&1 | tail -5"
```

Verificar que está rodando:
```powershell
ssh root@2.25.200.152 "pm2 status"
```

Saída esperada: linha com `playwright-service` status `online`.

- [ ] **Step 7: Testar render de um slide real**

Obter a API key do .env e testar via curl no VPS:
```powershell
$apiKey = (ssh root@2.25.200.152 "grep PLAYWRIGHT_API_KEY /opt/playwright-service/.env | cut -d= -f2").Trim()
Write-Host "API Key: $apiKey"

ssh root@2.25.200.152 @"
curl -s -X POST http://localhost:3001/render \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: $apiKey' \
  -d '{\"slides\":[{\"content\":\"46%\\n\\ndas equipes ja usam IA sem a empresa saber.\",\"slideIndex\":0,\"totalSlides\":7,\"pilar\":\"resultado_ia\",\"title\":\"46% das equipes\"}]}' | python3 -c \"import sys,json; d=json.load(sys.stdin); print('images:', len(d.get('images',[])), '| size:', len(d.get('images',[''])[0]) if d.get('images') else 0)\"
"@
```

Saída esperada: `images: 1 | size: XXXXX` (tamanho do base64 > 50000 indica PNG real gerado).

---

## Task 4: Edge Function `marketing-carousel-render`

Orquestra a chamada ao Playwright service, faz upload dos PNGs para Supabase Storage e devolve URLs públicas.

**Files:**
- Create: `supabase/functions/marketing-carousel-render/index.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// supabase/functions/marketing-carousel-render/index.ts
// Calls Playwright service to render carousel slides, uploads to Storage, returns public URLs.

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

interface SlideInput {
  content: string;
  slideIndex: number;
  totalSlides: number;
  pilar: string;
  title: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  // Auth: MARKETING_API_KEY (internal server-to-server) OR Supabase JWT (frontend)
  const apiKey = Deno.env.get("MARKETING_API_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${apiKey}` && !auth.startsWith("Bearer ey")) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const playwrightUrl = Deno.env.get("PLAYWRIGHT_SERVICE_URL") ?? "";
  const playwrightKey = Deno.env.get("PLAYWRIGHT_API_KEY") ?? "";
  if (!playwrightUrl || !playwrightKey) {
    return jsonResponse({ error: "PLAYWRIGHT_SERVICE_URL or PLAYWRIGHT_API_KEY not configured" }, 500);
  }

  const body = await req.json().catch(() => ({})) as {
    draft_id?: string;
    slides?: SlideInput[];
  };

  if (!body.draft_id || !Array.isArray(body.slides) || body.slides.length === 0) {
    return jsonResponse({ error: "draft_id and slides[] required" }, 400);
  }

  const { draft_id, slides } = body;

  console.log(`[carousel-render] rendering ${slides.length} slides for draft=${draft_id}`);

  // Call Playwright service
  let renderRes: Response;
  try {
    renderRes = await fetch(`${playwrightUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": playwrightKey,
      },
      body: JSON.stringify({ slides }),
    });
  } catch (e) {
    console.error("[carousel-render] playwright service unreachable:", e);
    return jsonResponse({ error: "playwright_service_unreachable", detail: String(e) }, 503);
  }

  if (!renderRes.ok) {
    const err = await renderRes.text();
    console.error(`[carousel-render] playwright error ${renderRes.status}:`, err);
    return jsonResponse({ error: "playwright_render_failed", detail: err }, 500);
  }

  const { images } = await renderRes.json() as { success: boolean; images: string[] };

  if (!Array.isArray(images) || images.length === 0) {
    return jsonResponse({ error: "no_images_returned" }, 500);
  }

  // Upload each PNG to Supabase Storage
  const db = adminClient();
  const urls: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const b64 = images[i];
    if (!b64) continue;

    // Decode base64 → Uint8Array
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);

    const path = `marketing/${draft_id}/carousel_${i}.png`;
    const { error } = await db.storage.from("assets").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });

    if (error) {
      console.error(`[carousel-render] upload slide ${i} failed:`, error.message);
      continue;
    }

    const { data } = db.storage.from("assets").getPublicUrl(path);
    urls.push(data.publicUrl);
    console.log(`[carousel-render] slide ${i} uploaded → ${data.publicUrl}`);
  }

  if (urls.length === 0) {
    return jsonResponse({ error: "all_uploads_failed" }, 500);
  }

  console.log(`[carousel-render] ✅ ${urls.length}/${images.length} slides ready for draft ${draft_id}`);
  return jsonResponse({ success: true, urls });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/marketing-carousel-render/
git commit -m "feat(marketing): add marketing-carousel-render edge function with Playwright integration"
```

---

## Task 5: Atualizar `marketing-publisher` — substituir GPT Image 2 por Playwright

Remover `generateAndStoreSlideImage`, `STYLE_BY_PILAR` e `buildSlideImagePrompt`. Substituir a fase 2 do carousel pelo `marketing-carousel-render`.

**Files:**
- Modify: `supabase/functions/marketing-publisher/index.ts`

- [ ] **Step 1: Ler o arquivo atual para confirmar linhas**

Verificar linhas 12-102 (STYLE_BY_PILAR + buildSlideImagePrompt + generateAndStoreSlideImage) e linhas 172-200 (Phase 2 loop).

- [ ] **Step 2: Remover constantes e funções obsoletas**

Remover as seguintes seções completamente do arquivo:
- `const STYLE_BY_PILAR` (linhas 12-18)
- `function buildSlideImagePrompt(...)` (linhas 61-65)
- `async function generateAndStoreSlideImage(...)` (linhas 67-102)

O início do arquivo após remoção deve ficar:

```typescript
// supabase/functions/marketing-publisher/index.ts
// Publishes approved drafts (Instagram carousel + single image, LinkedIn text).
// Phase 1: single-image posts (image_url set, no carousel)
// Phase 2: carousel posts — renders slides via marketing-carousel-render (Playwright)

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
```

- [ ] **Step 3: Substituir a Phase 2 do carousel**

Localizar o bloco Phase 2 (ao redor das linhas 172-200) que contém o `generateAndStoreSlideImage` em paralelo. Substituir por:

```typescript
      } else if (isCarousel) {
        // ── Phase 2: Carousel — render slides via Playwright, then publish ─────
        console.log(`[publisher] Phase 2 — carousel (Playwright): ${draft.title}`);
        const slides = draft.content.split("---SLIDE---").map((s: string) => s.trim()).filter(Boolean);

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const carouselRes = await fetch(`${supabaseUrl}/functions/v1/marketing-carousel-render`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            draft_id: draft.id,
            slides: slides.map((content: string, i: number) => ({
              content,
              slideIndex: i,
              totalSlides: slides.length,
              pilar: draft.pilar,
              title: draft.title,
            })),
          }),
        });

        if (!carouselRes.ok) {
          const errText = await carouselRes.text();
          console.error(`[publisher] carousel-render failed for ${draft.id}:`, errText);
          results.push({ id: draft.id, status: "error", reason: `carousel_render_failed: ${errText}` });
          continue;
        }

        const { urls: validUrls } = await carouselRes.json() as { urls: string[] };

        if (!validUrls || validUrls.length < 2) {
          console.error(`[publisher] only ${validUrls?.length ?? 0} images from carousel-render — need ≥2`);
          results.push({ id: draft.id, status: "skipped", reason: "insufficient_slide_images" });
          continue;
        }

        // Instagram carousel: max 10 slides
        const carouselUrls = validUrls.slice(0, 10);

        const childIds = await Promise.all(
          carouselUrls.map((url: string) => createCarouselItemContainer(igUserId, igToken, url))
        );

        const carouselId = await createCarouselContainer(igUserId, igToken, childIds, caption);
        igPostId = await publishContainer(igUserId, igToken, carouselId);
```

- [ ] **Step 4: Remover `openaiKey` da leitura de env vars (Phase 2 não usa mais)**

Localizar (por volta da linha original 119):
```typescript
const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
```

Verificar se `openaiKey` ainda é usado em algum outro lugar do arquivo. Se não for (após remover as funções GPT), remover a linha. Se ainda for referenciada, manter.

Após a remoção das funções GPT, `openaiKey` não é mais usado — remova a linha.

- [ ] **Step 5: Verificar que o arquivo compila**

```bash
cd C:\Projects\intellix-squad-hub
npx tsc --noEmit 2>&1
```

Saída esperada: sem erros. Se houver `igPostId used before assignment`, verificar que a variável é declarada antes do `if/else if` block.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/marketing-publisher/index.ts
git commit -m "feat(marketing): replace GPT Image 2 carousel with Playwright renderer in marketing-publisher"
```

---

## Task 6: Adicionar secrets Supabase + Deploy + Smoke Test

**Files:** nenhum novo — apenas configuração e deploy.

- [ ] **Step 1: Obter a PLAYWRIGHT_API_KEY do VPS**

```powershell
$playwrightKey = (ssh root@2.25.200.152 "grep PLAYWRIGHT_API_KEY /opt/playwright-service/.env | cut -d= -f2").Trim()
Write-Host "PLAYWRIGHT_API_KEY = $playwrightKey"
```

- [ ] **Step 2: Adicionar secrets no Supabase**

```powershell
cd C:\Projects\intellix-squad-hub
npx supabase secrets set PLAYWRIGHT_SERVICE_URL=http://2.25.200.152:3001 --project-ref hynadwlwrscvjubryqlg
npx supabase secrets set PLAYWRIGHT_API_KEY=$playwrightKey --project-ref hynadwlwrscvjubryqlg
```

Verificar:
```powershell
npx supabase secrets list --project-ref hynadwlwrscvjubryqlg 2>&1 | Select-String -Pattern "PLAYWRIGHT"
```

Saída esperada: duas linhas com `PLAYWRIGHT_SERVICE_URL` e `PLAYWRIGHT_API_KEY`.

- [ ] **Step 3: Deploy das edge functions**

```powershell
npx supabase functions deploy marketing-carousel-render --project-ref hynadwlwrscvjubryqlg 2>&1
npx supabase functions deploy marketing-publisher --project-ref hynadwlwrscvjubryqlg 2>&1
```

Saída esperada: `Deployed Function marketing-carousel-render` e `Deployed Function marketing-publisher`.

- [ ] **Step 4: Smoke test — testar carousel-render diretamente**

Obter o access token Supabase (JWT de serviço):
```powershell
$supabaseServiceKey = (npx supabase secrets list --project-ref hynadwlwrscvjubryqlg 2>&1 | Select-String "SUPABASE_SERVICE_ROLE_KEY" | Out-String).Trim()
```

Se não funcionar, usar o service_role key do painel Supabase → Settings → API.

Testar a edge function:
```powershell
$body = @{
  draft_id = "00000000-0000-0000-0000-000000000001"
  slides = @(
    @{ content = "46%`n`ndas equipes ja usam IA na sua empresa — sem voce saber."; slideIndex = 0; totalSlides = 7; pilar = "resultado_ia"; title = "Shadow AI" }
    @{ content = "De onde vem esse numero:`n`n65% das PMEs brasileiras ja adotaram alguma ferramenta de IA em 2025. Mas apenas 12% tem politica de uso documentada."; slideIndex = 1; totalSlides = 7; pilar = "resultado_ia"; title = "Shadow AI" }
    @{ content = "A causa raiz e simples:`n`nFerramentas de IA estao mais faceis de usar do que nunca. O colaborador resolve na hora, sem esperar aprovacao."; slideIndex = 2; totalSlides = 7; pilar = "resultado_ia"; title = "Shadow AI" }
  )
} | ConvertTo-Json -Depth 5

$result = Invoke-RestMethod -Uri "https://hynadwlwrscvjubryqlg.supabase.co/functions/v1/marketing-carousel-render" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $supabaseServiceKey"; "Content-Type" = "application/json" } `
  -Body $body

Write-Host "URLs returned: $($result.urls.Count)"
Write-Host "First URL: $($result.urls[0])"
```

Saída esperada: `URLs returned: 3` + URLs públicas do Supabase Storage.

Verificar visualmente: abrir a primeira URL no browser — deve mostrar um slide IntelliX com fundo `#171723`, texto em Space Grotesk e orbs de fundo.

- [ ] **Step 5: Smoke test end-to-end — aprovar e publicar manualmente**

1. No Supabase SQL Editor, encontrar um draft `approved` do tipo carousel (Instagram com `content` contendo `---SLIDE---`):
```sql
SELECT id, title, platform, status, content
FROM marketing_drafts
WHERE status = 'approved'
  AND platform = 'instagram'
  AND content LIKE '%---SLIDE---%'
LIMIT 1;
```

2. Se existir, chamar `marketing-publisher` com esse `draft_id` via Supabase Functions UI ou curl para testar publicação completa.

3. Verificar no Instagram que o carrossel foi publicado com os slides corretos.

- [ ] **Step 6: Commit final + push**

```bash
git add .
git commit -m "chore(marketing): Sprint B deployed — Playwright carousel renderer live"
git push origin main
```

---

## Self-Review

### Cobertura de spec
| Requisito | Task |
|-----------|------|
| Node.js + Playwright instalados no VPS | Task 1 |
| Serviço Express com POST /render e auth API key | Task 3 (server.js) |
| Template HTML 1080×1350 com design system IntelliX | Task 2 (template.js) |
| Layouts corretos: Cover, Content, Format C (minimal), Format E (chips), CTA | Task 2 |
| PM2 start + auto-restart | Task 3 |
| Edge function `marketing-carousel-render` | Task 4 |
| Upload para Supabase Storage + URLs públicas | Task 4 |
| `marketing-publisher` usa Playwright em vez de GPT Image 2 | Task 5 |
| Secrets `PLAYWRIGHT_SERVICE_URL` + `PLAYWRIGHT_API_KEY` | Task 6 |
| Deploy das funções + smoke test | Task 6 |

### Type consistency
- `SlideInput` em `marketing-carousel-render/index.ts` tem: `content`, `slideIndex`, `totalSlides`, `pilar`, `title` ✓
- `marketing-publisher` monta o objeto com os mesmos campos ✓
- `generateSlideHTML` em `template.js` desestrutura os mesmos campos ✓
- `server.js` passa `req.body.slides` diretamente para `generateSlideHTML` em loop ✓

### Placeholders
Nenhum "TBD" ou "handle edge cases" encontrado.

### Riscos
- **Google Fonts CDN no VPS**: Playwright faz requisições externas durante `waitUntil: 'networkidle'`. Se o VPS não tiver acesso à internet ou o CDN demorar, o timeout de 15s pode ser atingido. Mitigation: aumentar timeout para 30s se necessário, ou incorporar fontes como base64 no CSS.
- **Porta 3001 exposta**: Qualquer um que descobrir a URL pode tentar brute-force na API key. A key gerada tem entropia suficiente (32 chars aleatórios), mas em produção considere restringir a porta por IP via iptables.
- **Browser crash**: PM2 vai reiniciar o processo, mas o browser singleton pode não ser reiniciado automaticamente. O `getBrowser()` já lida com isso verificando `browser.isConnected()`.

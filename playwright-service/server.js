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

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

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

getBrowser().catch(e => console.error('[playwright-service] warmup failed:', e));

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
        await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
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
    // Reset browser singleton so next request gets a fresh browser
    try { if (browser) await browser.close(); } catch (_) {}
    browser = null;
    res.status(500).json({ error: String(e) });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, pid: process.pid, browser_connected: browser?.isConnected() ?? false });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[playwright-service] listening on :${PORT}`);
});

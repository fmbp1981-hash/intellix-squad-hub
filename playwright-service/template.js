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
  resultado_ia: 'Resultado IA', educacao_pratica: 'Educação',
  bastidores: 'Bastidores', posicionamento: 'Posicionamento', comercial: 'Comercial',
};

const FORMAT_E_CHIPS = {
  2: { text: 'CONTEXTO',     color: '#4FA6CC', bg: 'rgba(79,166,204,0.12)',  border: 'rgba(79,166,204,0.3)'  },
  3: { text: 'INSIGHT',      color: '#A0A0F8', bg: 'rgba(160,160,248,0.12)', border: 'rgba(160,160,248,0.3)' },
  4: { text: 'IMPLICAÇÃO',   color: '#F08080', bg: 'rgba(240,128,128,0.12)', border: 'rgba(240,128,128,0.3)' },
  5: { text: 'RECOMENDAÇÃO', color: '#F2A82A', bg: 'rgba(242,168,42,0.12)',  border: 'rgba(242,168,42,0.35)' },
};

function deriveFormat(pilar) {
  if (pilar === 'resultado_ia' || pilar === 'educacao_pratica') return 'E';
  if (pilar === 'posicionamento' || pilar === 'bastidores') return 'C';
  return 'A';
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderLines(text, fontSize, color, weight, lineHeight) {
  return text.trim().split('\n').filter(Boolean).map(line =>
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
  return '<div class="logo"><span class="logo-i">IntelliX</span><span class="logo-a">.AI</span></div>';
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
    const lines = content.trim().split('\n').filter(Boolean);
    const headline = lines[0] || title || '';
    const sub = lines.slice(1).join(' ').trim();
    inner = `
      <div class="orb orb1"></div><div class="orb orb2"></div>
      <div class="hdr">${logo()}<span class="hint">ARRASTE &#8594;</span></div>
      <div class="chip">${esc(pilarLabel)}</div>
      <div class="ruler"></div>
      <div class="mid">
        <p style="font-size:56px;font-weight:800;line-height:1.1;letter-spacing:-1px;">${esc(headline)}</p>
        ${sub ? `<p style="font-size:26px;font-weight:400;color:#BDBDC3;line-height:1.6;margin-top:28px;">${esc(sub)}</p>` : ''}
      </div>
      <div class="foot"><p class="hint" style="font-size:12px;margin-bottom:8px;">DESLIZE PARA SABER MAIS &#8594;</p></div>`;

  } else if (isLast) {
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
        <div class="cta-btn">Link na bio &#8594;</div>
      </div>
      <div class="foot" style="margin-top:40px;">
        <p style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#8C8C99;letter-spacing:1px;">intellixai.com.br</p>
      </div>`;

  } else if (format === 'C') {
    inner = `
      <div class="orb orb1"></div>
      <div class="hdr" style="margin-bottom:0;position:absolute;top:80px;left:90px;right:90px;">${logo()}${counter(slideIndex, totalSlides)}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        ${renderLines(content, '52px', '#FAFAFA', 800, '1.15')}
      </div>`;

  } else if (format === 'E') {
    const chip = FORMAT_E_CHIPS[slideNum];
    const isRec = slideNum === 5;
    const contentBody = isRec
      ? `<div class="rec">${renderLines(content, '28px', '#FAFAFA', 600, '1.65')}</div>`
      : renderLines(content, '28px', '#BDBDC3', 400, '1.65');
    inner = `
      <div class="orb orb1"></div><div class="orb orb2"></div>
      <div class="hdr">${logo()}${counter(slideIndex, totalSlides)}</div>
      ${chip ? `<div class="lbl" style="background:${chip.bg};color:${chip.color};border:1px solid ${chip.border};">${chip.text}</div>` : ''}
      <div class="mid">${contentBody}</div>`;

  } else {
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

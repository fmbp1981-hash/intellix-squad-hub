// IntelliX.AI — Brand Context (DNA Kit)
// Importado por todos os agentes de marketing. Fonte única de verdade para voz, portfólio e formatos.

// ─── DNA_04 — Posicionamento ────────────────────────────────────────────────

export const POSITIONING = {
  taglinePrimary: "Resultado Visível. Tecnologia Invisível.",
  taglineSecondary: "Sua empresa não precisa de mais IA. Precisa de mais resultado com IA.",
  taglinePhilosophy: "Tecnologia Invisível. Resultado Visível.",
  anchors: {
    descriptor: "Sem hype. Com método.",
    institutional: "A IntelliX.AI constrói sistemas inteligentes que transformam a forma como empresas operam, vendem e crescem.",
    central: "Inteligência Artificial aplicada ao negócio real. Menos hype. Mais resultado.",
    growth: "Escalar não é contratar mais. É estruturar melhor.",
  },
} as const;

// ─── DNA_05 — Portfólio ─────────────────────────────────────────────────────

export const PORTFOLIO = {
  cases: [
    {
      client: "Grupo Cavendish",
      product: "GIG",
      url: "https://cavendish-gig.vercel.app",
      type: "SaaS dashboard · governança empresarial",
      description: "Sistema de gestão e governança para consultoria empresarial com IA integrada.",
    },
    {
      client: "XPAG Brasil",
      product: "Site XPAG Brasil",
      url: "https://xpagbrasil-one-page.vercel.app",
      type: "One-page estratégico",
      description: "Site de posicionamento e captação para empresa de consultoria em franquias.",
    },
    {
      client: "Yolo Coliving",
      product: "Yolo SDR",
      url: "https://yolo-sdr.vercel.app",
      type: "SDR com IA · white-label",
      description: "Sistema de prospecção e SDR automatizado com IA para rede de coliving.",
    },
  ],
  frameworks: {
    radarAI: "Fase de diagnóstico — mapeamento de maturidade em IA e identificação de oportunidades.",
    forjaAI: "Fase de desenvolvimento — construção dos sistemas e automações.",
    trilhaAI: "Fase de mentoria — acompanhamento e evolução contínua.",
  },
  viradaInteligente: {
    name: "Virada Inteligente com IA",
    type: "Treinamento imersivo presencial",
    duration: "4 horas presenciais",
    tagline: "Aprenda IA na prática e transforme seu dia a dia.",
    methodology: "Aprende · Vê · Faz · Leva pra casa",
    pricing: {
      turmaAberta: { regular: "R$ 1.097", earlyBird: "R$ 897 (early bird)" },
      inCompany: "sob consulta · até 15 pessoas",
    },
    location: "Recife/PE — turmas abertas e in-company",
    instructor: "Felipe Maranhão (nunca terceirizado)",
    messagingHook: "IA aplicada de verdade muda o dia a dia da sua equipe.",
    shadowAIData: "46% das equipes usam IA sem que a empresa saiba (Software AG). Shadow AI adiciona US$670k ao custo médio de cada violação de dados (IBM 2025).",
    concept: "Pavimentar antes de proibir — governança e treinamento antes da restrição. A Virada Inteligente É esse caminho.",
  },
} as const;

// ─── DNA_07 — Voz e Tom ─────────────────────────────────────────────────────

export const BRAND_VOICE = {
  tone: "Especialista confiante, não arrogante. Claro, direto, orientado a resultado.",
  style: "PT-BR · sentence case sempre · prefira números e fatos a adjetivos vagos.",
  forbidden: [
    "revolucionário", "disruptivo", "incrível", "top demais",
    "game changer", "transformar vidas", "o futuro é a IA",
    "IA vai substituir seu trabalho", "dominar a IA",
  ],
  required: {
    // Pelo menos uma dessas frases deve aparecer em cada peça pública
    anchors: [
      "Resultado Visível. Tecnologia Invisível.",
      "Sem hype. Com método.",
    ],
    vocabulary: [
      "IA aplicada", "resultado mensurável", "método", "processo",
      "autonomia segura", "letramento em IA", "pavimentar antes de proibir",
    ],
  },
} as const;

// ─── Formatos de Conteúdo ────────────────────────────────────────────────────

export type ContentFormat = "A" | "B" | "C" | "D";

export const CONTENT_FORMATS: Record<ContentFormat, {
  name: string;
  description: string;
  slides?: string;
  structure: string;
  bestFor: string[];
}> = {
  A: {
    name: "Storytelling / Narrativa",
    description: "Carrossel narrativo com arco de história. Case real ou situação identificável.",
    slides: "7–11 slides",
    structure: "Gancho (dor/situação) → Jornada (complicação + virada) → Resultado (métrica real) → Lição → CTA",
    bestFor: ["resultado_ia", "bastidores"],
  },
  B: {
    name: "FAQ / Mito vs. Realidade",
    description: "Carrossel educativo quebrando objeções ou desmistificando conceitos de IA.",
    slides: "8–10 slides",
    structure: "Gancho (mito popular) → Slides pares (mito / realidade) → Slide final (síntese + CTA)",
    bestFor: ["educacao_pratica", "posicionamento"],
  },
  C: {
    name: "Reflexão Filosófica",
    description: "Post ou carrossel curto com insight provocador. Alta viralidade no LinkedIn.",
    slides: "5 slides (ou post texto único)",
    structure: "Gancho provocador → Desenvolvimento (2–3 pontos) → Inversão/surpresa → CTA suave",
    bestFor: ["posicionamento", "bastidores"],
  },
  D: {
    name: "Produto + Descredenciamento",
    description: "Apresentação direta de produto com diferenciação de mercado. Honesto, sem hype.",
    slides: "post texto ou carrossel 5–7 slides",
    structure: "Problema → Por que as soluções comuns falham → Como resolvemos (produto/Virada) → Prova social → CTA direto",
    bestFor: ["comercial", "resultado_ia"],
  },
};

// ─── Mix de Conteúdo ─────────────────────────────────────────────────────────

export const CONTENT_MIX = {
  informational: {
    range: "75–85%",
    description: "Educação, cases, bastidores, posicionamento — sem necessidade de imagem obrigatória.",
    needsImage: false,
  },
  withImage: {
    range: "15–25%",
    description: "Promoção de produto, Virada, brand — imagem aumenta engajamento.",
    needsImage: true,
  },
} as const;

// ─── Hooks de Conteúdo (templates) ──────────────────────────────────────────

export const HOOK_TEMPLATES = {
  resultado_ia: [
    "Em [X semanas], [cliente] saiu de [situação antes] para [situação depois]. Sem mágica — com processo.",
    "[Número] horas de trabalho manual por semana. É o que um dos nossos clientes economizou depois de automatizar [processo].",
    "Esse número vai parecer exagerado. Mas é real: [métrica concreta].",
  ],
  educacao_pratica: [
    "A maioria das empresas usa IA de forma errada. Aqui está o padrão que funciona:",
    "Três coisas que todo gestor precisa saber sobre IA em 2026 — e quase ninguém fala:",
    "Você não precisa saber programar para usar IA. Mas precisa saber isso:",
  ],
  bastidores: [
    "Passamos [X meses] construindo [sistema]. Aqui está o que aprendemos que nenhum tutorial ensina:",
    "Tomamos uma decisão técnica polêmica há [X meses]. Funcionou — e aqui está o porquê:",
    "Build in public: o que deu certo, o que deu errado e o que mudamos no [produto].",
  ],
  posicionamento: [
    "A IA não vai substituir seu trabalho. Vai substituir quem não souber usá-la. (E essa distinção importa muito.)",
    "Toda empresa diz que 'implementa IA'. Quase nenhuma mede resultado. Aqui está a diferença:",
    "O problema não é falta de IA. É excesso de hype e ausência de método.",
  ],
  comercial: [
    "Quatro horas. Uma tarde. Sua equipe sai sabendo usar IA no dia a dia — com método e segurança.",
    "46% das equipes já usam IA sem que a empresa saiba. A Virada Inteligente existe para mudar isso.",
    "Virada Inteligente — próxima turma em Recife. Early bird R$ 897 (normal R$ 1.097).",
  ],
} as const;

// ─── Pilar Context (para redação) ────────────────────────────────────────────

export const PILAR_CONTEXT = {
  resultado_ia: "Foque em case real, métricas concretas, antes/depois. Se não houver case específico, use dado verificável de mercado.",
  educacao_pratica: "Ensine algo prático. Passos concretos. Desmistifique. Termine com insight acionável.",
  bastidores: "Build in public. Mostre a decisão real, o aprendizado, o que deu errado ou certo.",
  posicionamento: "Hot take. Contrarianismo saudável. Uma opinião clara sobre o mercado de IA.",
  comercial: "Apresente produto/Virada de forma honesta. Benefício > feature. CTA direto.",
} as const;

// ─── System Prompt Block ─────────────────────────────────────────────────────
// Use buildBrandSystemBlock() para injetar contexto de marca em qualquer system prompt.

export function buildBrandSystemBlock(): string {
  return `## IntelliX.AI — Contexto de Marca

**Posicionamento:** ${POSITIONING.taglinePrimary}
**Tom:** ${BRAND_VOICE.tone}
**Estilo:** ${BRAND_VOICE.style}

**NUNCA usar:** ${BRAND_VOICE.forbidden.join(", ")}
**SEMPRE incluir (ao menos uma):** ${BRAND_VOICE.required.anchors.join(" | ")}

**Virada Inteligente com IA:** treinamento imersivo de 4h presenciais.
Preço: ${PORTFOLIO.viradaInteligente.pricing.turmaAberta.regular} (early bird ${PORTFOLIO.viradaInteligente.pricing.turmaAberta.earlyBird}).
Metodologia: ${PORTFOLIO.viradaInteligente.methodology}.
Dado de mercado: ${PORTFOLIO.viradaInteligente.shadowAIData}

**Cases ativos:** ${PORTFOLIO.cases.map((c) => `${c.product} (${c.client})`).join(", ")}

**Frameworks internos (não são produtos vendáveis):**
- RadarAI: ${PORTFOLIO.frameworks.radarAI}
- ForjaAI: ${PORTFOLIO.frameworks.forjaAI}
- TrilhaAI: ${PORTFOLIO.frameworks.trilhaAI}`;
}

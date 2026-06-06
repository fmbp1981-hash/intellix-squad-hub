// IntelliX.AI — Brand Context (DNA Kit + Estratégia de Conteúdo)
// Fonte única de verdade para todos os agentes de marketing.

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
    positioning: [
      "IA que trabalha enquanto você foca no que importa.",
      "IA não é para empresa grande. É para empresa inteligente.",
      "Menos operacional. Mais estratégia. IA aplicada de verdade.",
    ],
  },
  pillars: ["Pragmático", "Empático", "Ousado sem arrogância"],
} as const;

// ─── DNA_05 — Portfólio ─────────────────────────────────────────────────────

export const PORTFOLIO = {
  cases: [
    {
      client: "Grupo Cavendish",
      product: "GIG",
      type: "SaaS de governança empresarial com IA",
      hook: "Sistema que organiza toda a gestão da Cavendish — do operacional ao estratégico.",
    },
    {
      client: "XPAG Brasil",
      product: "Site XPAG Brasil",
      type: "One-page estratégico de posicionamento",
      hook: "Presença digital que converte para empresa de consultoria em franquias.",
    },
    {
      client: "Yolo Coliving",
      product: "Yolo SDR",
      type: "SDR automatizado com IA",
      hook: "Prospecção e atendimento no piloto automático para rede de coliving.",
    },
  ],
  frameworks: {
    radarAI: "Diagnóstico — mapeamento de maturidade em IA e oportunidades reais de implementação.",
    forjaAI: "Desenvolvimento — construção dos sistemas, agentes e automações.",
    trilhaAI: "Mentoria — acompanhamento contínuo pós-implementação.",
  },
  viradaInteligente: {
    name: "Virada Inteligente com IA",
    type: "Treinamento imersivo presencial · 4 horas",
    tagline: "Aprenda IA na prática e transforme seu dia a dia.",
    methodology: "Aprende · Vê · Faz · Leva pra casa",
    pricing: { regular: "R$ 1.097", earlyBird: "R$ 897 (early bird)" },
    location: "Recife/PE — turmas abertas e in-company (até 15 pessoas)",
    instructor: "Felipe Maranhão",
    hooks: [
      "Quatro horas. Uma tarde. Sua equipe sai sabendo usar IA no dia a dia — com método e segurança.",
      "46% das equipes já usam IA sem que a empresa saiba. A Virada existe pra mudar isso.",
      "Não é palestra. É uma tarde implementando. Aprende · Vê · Faz · Leva pra casa.",
    ],
    shadowAI: "46% das equipes usam IA sem que a empresa saiba (Software AG). Shadow AI adiciona US$670k ao custo médio de cada violação de dados (IBM 2025).",
    concept: "Pavimentar antes de proibir — governança e letramento antes da restrição.",
  },
} as const;

// ─── DNA_07 — Voz e Tom ─────────────────────────────────────────────────────

export const BRAND_VOICE = {
  tone: "Especialista confiante, não arrogante. Claro, direto, orientado a resultado.",
  register: "Coloquial brasileiro inteligente. Usa 'pra', 'tá', 'ninguém te conta', 'ficha caiu'. Fala DO público, não PARA o público. Nunca corporativo, nunca acadêmico.",
  style: "PT-BR · sentence case · prefira números e fatos reais a adjetivos vagos · frases curtas (1-2 linhas por parágrafo) · nunca 'olá' ou introdução — começa direto no gancho.",
  forbidden: [
    "revolucionário", "disruptivo", "incrível", "top demais", "game changer",
    "transformar vidas", "o futuro é a IA", "IA vai substituir seu trabalho",
    "dominar a IA", "solução completa", "plataforma robusta",
  ],
  required: {
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

// ─── Dores Centrais do Público-Alvo ─────────────────────────────────────────

export const AUDIENCE_PAINS = [
  "Empresa cresce mas operacional não escala — dono preso no dia a dia",
  "Processos manuais que consomem tempo e geram erro humano",
  "Custo operacional alto para manter qualidade de entrega",
  "Medo de ficar para trás enquanto concorrentes já usam IA",
  "Tentou usar IA mas não teve resultado — descrença e frustração",
  "Paralisia por excesso de informação — não sabe por onde começar",
  "Equipe resistente à mudança — falta de adoção",
  "Decisões sem dados — gestão no achismo",
] as const;

// ─── Mix de Conteúdo ─────────────────────────────────────────────────────────

export const CONTENT_MIX = {
  storytelling:   { pct: "40%", pilar: "resultado_ia + bastidores", needsImage: false, goal: "Engajamento + topo de funil" },
  philosophical:  { pct: "20%", pilar: "posicionamento",            needsImage: false, goal: "Viralização + crescimento orgânico" },
  faq_product:    { pct: "20%", pilar: "comercial",                  needsImage: true,  goal: "Conversão + quebra de objeções" },
  educational:    { pct: "10%", pilar: "educacao_pratica",           needsImage: false, goal: "Autoridade + salvamentos" },
  social_proof:   { pct: "10%", pilar: "resultado_ia",               needsImage: true,  goal: "Quebra de objeção final" },
  withImage:  "15–25% do total — promoção, Virada, brand, infográficos com dados",
  noImage:    "75–85% do total — educação, bastidores, posicionamento, notícias",
} as const;

// ─── Tipos de Conteúdo ────────────────────────────────────────────────────────

export type ContentType = "informational" | "product_promotion" | "virada_inteligente" | "news_data";
export type ContentFormat = "A" | "B" | "C" | "D";

// ─── Formatos de Conteúdo (Templates) ────────────────────────────────────────

export const CONTENT_FORMATS: Record<ContentFormat, {
  name: string;
  reference: string;
  slides: string;
  goal: string;
  structure: string[];
  copyTechniques: string[];
  intellixExamples: string[];
  ctaPattern: string;
  visualStyle: string;
  needsImage: boolean;
}> = {

  A: {
    name: "Carrossel Storytelling",
    reference: "@thaleslaray",
    slides: "7–11 slides",
    goal: "Engajamento + topo de funil",
    structure: [
      "SLIDE 1 — GANCHO: 1-2 frases curtas e bold, sem introdução. Fórmulas: (a) situação-espelho: cenário que o público reconhece na própria vida; (b) objeção nomeada: dizer o que o público pensa mas não fala; (c) urgência calendárica: datas/eventos para urgência orgânica; (d) promessa específica: 'Como [resultado] em [tempo]'. Termina sem fechar — tensão imediata.",
      "SLIDES 2-4 — DOR E IDENTIFICAÇÃO: Personagem anônimo que vive a dor do público. Frases de 1-2 linhas por parágrafo. Tom empático, não julgamental. Cada slide termina com → ou ... Não resolva ainda.",
      "SLIDES 5-7 — VIRADA E SOLUÇÃO: Transição com 'Mas existe uma saída' ou 'Só que tem um detalhe...'. Contraste 'Antes X... Hoje com a IntelliX, Y'. Apresenta IntelliX como saída natural. Frase de suspense antes do CTA.",
      "SLIDE FINAL — CTA: Nome do produto/serviço + benefício concreto em 1 linha + 'Comenta [PALAVRA] que eu te envio no direct'. Palavra em MAIÚSCULAS.",
    ],
    copyTechniques: [
      "Storytelling com personagem-espelho: alguém anônimo que vive a situação do público",
      "Espelhamento da objeção: nomeie a resistência antes que o público pense",
      "Linguagem coloquial calculada: 'pra', 'tá', 'ninguém te conta', 'ficha caiu'",
      "Micro-suspense: cada slide termina com → ou ... que força o próximo",
      "Contraste passado vs. presente: 'Antes X era Y... Hoje X é Z'",
      "Urgência por contexto: datas, eventos e situações do calendário como âncoras",
      "CTA por palavra-gatilho: comentários com mesma palavra = prova social + alcance",
    ],
    intellixExamples: [
      "Sua empresa ainda funciona no improviso?",
      "Automatizar parece caro até você ver o quanto custa não automatizar.",
      "Ela contratou mais 3 pessoas. O problema continuou. Até que alguém disse: tenta a IA.",
      "IA não vai substituir sua empresa. Vai substituir quem não usa IA.",
    ],
    ctaPattern: "Comenta [PALAVRA] que eu te envio no direct. Palavras sugeridas: INTELLIX | DIAGNÓSTICO | AGENTE | AUTOMAÇÃO | IA | VIRADA",
    visualStyle: "Fundo claro/bege (como template atual IntelliX) + texto bold preto + seta dourada → + logo IntelliX canto superior esquerdo. Pode usar foto editorial emocional nos slides de dor.",
    needsImage: false,
  },

  B: {
    name: "Carrossel FAQ de Produto",
    reference: "@dumasolucoes",
    slides: "8–10 slides",
    goal: "Conversão + quebra de objeções",
    structure: [
      "SLIDE 1 — CAPA: Título '[Produto IntelliX] — as respostas que você precisa antes de decidir'. Subtítulo: 'Sem enrolação.' Thumbnails das frentes/produtos IntelliX embaixo. Instrução visual: 'ARRASTE →'.",
      "SLIDES 2-7 — PERGUNTAS E RESPOSTAS: Tag colorida por produto/frente. Formato fixo: Pergunta em bold + resposta começando com Sim./Não./Depende, mas... 3-4 perguntas por produto. Respostas diretas, sem rodeios.",
      "SLIDE FINAL — CTA: 'Bora conversar?' + botão visual com link ou instrução de DM + 'Descubra qual solução da IntelliX faz sentido pro seu momento.'",
    ],
    copyTechniques: [
      "FAQ antecipado: resolve objeções antes que o lead vá pesquisar em outro lugar",
      "Respostas binárias: Sim./Não./Depende, mas... — elimina ambiguidade",
      "Confronto com status quo: 'Enquanto algumas empresas tentam entender, outras já vendem mais com IA'",
      "Binário de uso: 'Vai usar IA pra brincar ou pra transformar?'",
      "Descredenciamento do hype: 'Nada de palestra cheia de hype. Nada de promessa mágica.'",
      "Ancoragem de autoridade: credenciais e cases mencionados casualmente",
      "Prova social contextual: depoimentos capturados em situação real",
    ],
    intellixExamples: [
      "É pra empresa pequena? → Para qualquer empresa que queira parar de perder tempo.",
      "Preciso entender de tecnologia? → Não. Entende de negócio? É suficiente.",
      "Qual o prazo pra ver resultado? → Nossos cases mostram retorno em 30 a 90 dias.",
      "Funciona pra minha área? → Sim. Não é sobre setor. É sobre processo e decisão.",
      "Tem suporte depois? → Sim. Não entregamos e sumimos.",
    ],
    ctaPattern: "CTA direto para link ou DM. B2B: 'Chama no direct' ou 'Link na bio'. B2C: 'Comenta [PALAVRA]'.",
    visualStyle: "Fundo dark (#171723 IntelliX) + gradiente roxo/azul + texto branco bold + tag colorida por produto + logo IntelliX em todos os slides + numeração '01/10' no canto.",
    needsImage: true,
  },

  C: {
    name: "Post Filosófico-Provocativo",
    reference: "@gestaoai",
    slides: "5 slides (ou post de texto único)",
    goal: "Viralização + crescimento orgânico",
    structure: [
      "SLIDE 1 — POLARIZAÇÃO: Afirmação controversa sem contexto. Fundo dark, só texto bold, zero imagem. Deve dividir opiniões e forçar o leitor a tomar uma posição. Ninguém rola sem parar.",
      "SLIDE 2 — CONFIRMAÇÃO INESPERADA: 'Sim. Vai.' ou 'Depende de quem você é.' — confirma em vez de refutar. Descreve quem vai ser prejudicado (segmentação negativa). Cria separação entre 'eles' e o público ideal da IntelliX.",
      "SLIDES 3-4 — APROFUNDAMENTO + VIRADA: Aprofunda a crítica → apresenta o outro lado. Descreve o perfil ideal (cliente IntelliX) sem nomeá-lo explicitamente. Tom: pensando em voz alta, não vendendo.",
      "SLIDE 5 — SÍNTESE MEMORÁVEL: 3-4 frases simétricas e paradoxais. Altamente compartilháveis. Sem CTA explícito — o salvamento e compartilhamento são o objetivo.",
    ],
    copyTechniques: [
      "Polarização deliberada: afirmações que forçam posicionamento imediato",
      "Confirmação do medo: 'Sim. Vai.' — subverte a expectativa, gera surpresa",
      "Segmentação negativa: descreve quem NÃO é o público, criando desejo de ser o 'outro tipo'",
      "Síntese em paradoxo: frases simétricas e opostas — citáveis, salváveis, compartilháveis",
      "Zero imagem: fundo escuro + texto branco = foco total na mensagem",
      "Confirmação do medo cria compartilhamento: todo mundo quer ser o 'profundo'",
      "Tom filosófico-executivo: pensa em voz alta, não vende antes de convencer",
    ],
    intellixExamples: [
      "A IA vai deixar metade da sua equipe obsoleta.",
      "Você já perdeu clientes pra um concorrente que usa IA. Só não sabe ainda.",
      "Empresas que não usam IA em 2026 não vão sobreviver.",
      "IA não cria estratégia. Ela acelera estratégia. Sem direção, só vai mais rápido pro lugar errado.",
      "A IA não muda sua empresa. Amplifica o que você já construiu. Se construiu bem, fica imparável.",
    ],
    ctaPattern: "Sem CTA direto. Máximo: 'Salva esse post se faz sentido pra você.' O engajamento e salvamento são o objetivo — alimentam o algoritmo.",
    visualStyle: "Fundo escuro sólido (#171723) + APENAS texto bold branco + zero elementos gráficos. Ultra minimalista. Logo IntelliX discreto no canto. Como o template atual da IntelliX ('A IA não é o futuro. Ela JÁ está...').",
    needsImage: false,
  },

  D: {
    name: "Carrossel Produto + Descredenciamento",
    reference: "@gestaoai",
    slides: "6–8 slides",
    goal: "Conversão de leads qualificados B2B",
    structure: [
      "LEGENDA — DESCREDENCIAMENTO INICIAL: 'Se você espera [expectativa errada], esse produto não é pra você.' Afasta o público errado ANTES de vender. Cria desejo em quem quer ser o público certo.",
      "SLIDE 1 — GANCHO DE EXCLUSIVIDADE: 'Espie o que tem dentro da [solução IntelliX] →' ou 'O que separa empresa que cresce com IA de empresa que só fala de IA →'.",
      "SLIDES 2-4 — ESTRUTURA E ENTREGÁVEIS: Screenshot real da plataforma/relatório/sistema. Objeção central respondida: 'Funciona pra minha área/empresa?'. Número específico como prova: 'X horas economizadas/semana' ou 'ROI em Y dias'.",
      "SLIDE 5 — PROVA SOCIAL: Screenshot real de depoimento + número específico de resultado. Depoimento capturado em situação real = máxima autenticidade.",
      "SLIDE 6 — CLAIM DE UNICIDADE: Lista de entregáveis com ✅. 'O único [produto/método] que [diferencial exclusivo].'",
      "SLIDE FINAL — CTA DE BAIXA PRESSÃO: 'Se isso faz sentido pra você, o próximo passo é seu.' Link ou instrução de DM. Não coercitivo — transfere a decisão para o leitor.",
    ],
    copyTechniques: [
      "Descredenciamento de entrada: afasta o público errado e cria desejo no certo",
      "Número específico como prova: 'X horas/semana' em vez de 'economize tempo'",
      "CTA de baixa pressão: 'se isso faz sentido pra você' — funciona para B2B e executivos",
      "Claim de unicidade: 'O único que...' — posicionamento de liderança",
      "Screenshot como prova de existência: nada mais crível que ver o produto real",
      "Objeção antecipada no slide: 'Funciona pra minha área? Sim. Não é sobre setor.'",
      "Lista com ✅: síntese visual de entregáveis antes do CTA final",
    ],
    intellixExamples: [
      "Se você espera mais uma consultoria de IA que entrega relatório e some, esse serviço não é pra você.",
      "Espie o que tem dentro do diagnóstico RadarAI →",
      "21 horas por semana — é a média de tempo operacional que nossos clientes recuperam.",
      "Se isso faz sentido pra você, o próximo passo é seu.",
    ],
    ctaPattern: "CTA de baixa pressão para B2B. 'Chama no direct' ou 'Comenta [PALAVRA]'. Não empurre quem não está pronto.",
    visualStyle: "Fundo dark (#171723) + gradiente sutil + texto branco + screenshot real do produto + logo IntelliX + lista ✅ no slide de entregáveis.",
    needsImage: true,
  },
};

// ─── Pilar Context (para redação) ────────────────────────────────────────────

export const PILAR_CONTEXT: Record<string, { description: string; format: ContentFormat; hooks: string[] }> = {
  resultado_ia: {
    description: "Case real, métricas concretas, antes/depois. Se não houver case específico, use dado verificável de mercado. Número específico supera adjetivo vago sempre.",
    format: "A",
    hooks: [
      "Em [X semanas], [cliente] saiu de [situação antes] para [situação depois]. Sem mágica — com processo.",
      "[Número] horas de trabalho manual por semana. É o que um dos nossos clientes economizou depois de automatizar [processo].",
      "Esse número vai parecer exagerado. Mas é real: [métrica concreta].",
    ],
  },
  educacao_pratica: {
    description: "Ensine algo prático. Passos concretos. Desmistifique. Termine com insight acionável. Salvar > curtir — o objetivo é ser referência.",
    format: "B",
    hooks: [
      "A maioria das empresas usa IA de forma errada. Aqui está o padrão que funciona:",
      "Três coisas que todo gestor precisa saber sobre IA em 2026 — e quase ninguém fala:",
      "Você não precisa saber programar para usar IA. Mas precisa saber isso:",
    ],
  },
  bastidores: {
    description: "Build in public. Mostre a decisão real, o aprendizado, o que deu errado ou certo. Tom: pensando em voz alta. Não vende — conecta.",
    format: "A",
    hooks: [
      "Passamos [X meses] construindo [sistema]. Aqui está o que aprendemos que nenhum tutorial ensina:",
      "Tomamos uma decisão técnica polêmica. Funcionou — e aqui está o porquê:",
      "Build in public: o que deu certo, o que deu errado e o que mudamos.",
    ],
  },
  posicionamento: {
    description: "Hot take. Contrarianismo saudável. Uma opinião clara sobre o mercado de IA. Provoca o status quo sem humilhar. Frases simétricas e paradoxais no final.",
    format: "C",
    hooks: [
      "A IA não vai substituir seu trabalho. Vai substituir quem não souber usá-la.",
      "O problema não é falta de IA. É excesso de hype e ausência de método.",
      "Toda empresa diz que 'implementa IA'. Quase nenhuma mede resultado.",
    ],
  },
  comercial: {
    description: "Apresente produto/Virada de forma honesta. Benefício > feature. CTA direto. Use descredenciamento de entrada para atrair o lead certo.",
    format: "D",
    hooks: [
      "Quatro horas. Uma tarde. Sua equipe sai sabendo usar IA no dia a dia — com método e segurança.",
      "46% das equipes já usam IA sem que a empresa saiba. A Virada Inteligente existe para mudar isso.",
      "Se você espera mais uma palestra sobre IA, a Virada não é pra você.",
    ],
  },
};

// ─── Estratégia de Legenda ────────────────────────────────────────────────────

export const CAPTION_STRATEGY = {
  b2c: [
    "Linha 1: resumo do gancho — aparece antes do 'ver mais'",
    "Parágrafo 2: produto + benefício principal",
    "Parágrafo 3: CTA com palavra-gatilho em MAIÚSCULAS",
    "Sem hashtags no corpo. Opcional: 3-5 hashtags no final.",
    "Exemplo: 'Comenta DIAGNÓSTICO que eu te envio no direct.'",
  ],
  b2b: [
    "Parágrafo 1: contexto 'antes vs. agora' que cria urgência",
    "Parágrafo 2: método/solução IntelliX",
    "Parágrafo 3: CTA de baixa pressão",
    "Tom limpo, sem emoji excessivo. Máximo 4 parágrafos.",
    "Exemplo: 'Se isso faz sentido pro seu momento, chama no direct.'",
  ],
  triggerWords: ["INTELLIX", "DIAGNÓSTICO", "AGENTE", "AUTOMAÇÃO", "IA", "VIRADA", "RADAR"],
  whyTriggerWorks: "Comentários com a mesma palavra aumentam o alcance no algoritmo + criam prova social passiva + disparam automação de DM sem custo de equipe.",
} as const;

// ─── Identidade Visual por Formato ──────────────────────────────────────────

export const VISUAL_IDENTITY = {
  formatA_storytelling: "Fundo bege/off-white + texto bold preto + seta dourada → + logo IntelliX canto superior esquerdo. Foto editorial emocional nos slides de dor (opcional). Como o template atual da IntelliX.",
  formatB_faq: "Fundo dark #171723 + gradiente roxo/azul + texto branco bold + tag colorida por produto + numeração '01/10' + logo IntelliX em todos os slides.",
  formatC_philosophical: "Fundo dark sólido #171723 + APENAS texto bold branco + zero elementos gráficos + logo IntelliX discreto. Ultra minimalista. Zero imagem.",
  formatD_product: "Fundo dark #171723 + gradiente sutil + screenshot real do produto + texto branco + ✅ no slide de entregáveis + logo IntelliX.",
  always: "Logo IntelliX.AI em todos os slides. Sentence case. Nunca title case. Nunca emoji decorativo.",
} as const;

// ─── Função: buildBrandSystemBlock ──────────────────────────────────────────
// Injeta o contexto completo de marca em qualquer system prompt de agente.

export function buildBrandSystemBlock(): string {
  return `## IntelliX.AI — Contexto de Marca e Estratégia de Conteúdo

### Posicionamento
"${POSITIONING.taglinePrimary}" | "${POSITIONING.taglineSecondary}"
Pilares: Pragmático · Empático · Ousado sem arrogância.

### Voz e Tom
${BRAND_VOICE.register}
NUNCA usar: ${BRAND_VOICE.forbidden.slice(0, 6).join(", ")}.
SEMPRE incluir (ao menos uma): ${BRAND_VOICE.required.anchors.join(" | ")}.

### Portfólio
Cases: ${PORTFOLIO.cases.map((c) => `${c.product} (${c.client})`).join(", ")}.
Virada Inteligente: treinamento imersivo 4h · ${PORTFOLIO.viradaInteligente.pricing.regular} (early bird ${PORTFOLIO.viradaInteligente.pricing.earlyBird}).
Dado Shadow AI: ${PORTFOLIO.viradaInteligente.shadowAI}
Frameworks internos (não são produtos): RadarAI (diagnóstico) · ForjaAI (desenvolvimento) · TrilhaAI (mentoria).

### Dores do Público
${AUDIENCE_PAINS.slice(0, 4).map((p, i) => `${i + 1}. ${p}`).join("\n")}

### Mix de Conteúdo
- 75-85% sem imagem: educação, bastidores, posicionamento, notícias/dados
- 15-25% com imagem: promoção, Virada, infográficos com dados reais
- Distribuição: 40% storytelling · 20% filosófico · 20% FAQ produto · 10% educativo · 10% prova social

### Formatos
- Formato A (Storytelling 7-11 slides): personagem-espelho, micro-suspense →, CTA "Comenta [PALAVRA]"
- Formato B (FAQ 8-10 slides): perguntas + Sim./Não., descredencia hype, resolve objeções
- Formato C (Filosófico 5 slides): polarização → confirmação inesperada → síntese paradoxal
- Formato D (Produto+Descredenciamento 6-8 slides): afasta lead errado, prova com número, CTA baixa pressão

### Palavras-Gatilho para CTA
${CAPTION_STRATEGY.triggerWords.join(" | ")}`;
}

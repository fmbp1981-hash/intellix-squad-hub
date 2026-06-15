// src/pages/marketing/MarketingStrategyConfig.ts

export interface PlatformTarget {
  platform: "linkedin" | "instagram";
  label: string;
  weeklyTarget: number;
  color: string;
}

export interface BestTime {
  platform: "linkedin" | "instagram";
  dayOfWeek: number; // 0=Dom, 1=Seg, ..., 6=Sáb
  hour: number;
  minute: number;
}

export interface PilarMixTarget {
  pilar: string;
  label: string;
  targetPercent: number;
  color: string;
}

// Meta de frequência semanal por plataforma
export const PLATFORM_TARGETS: PlatformTarget[] = [
  {
    platform: "linkedin",
    label: "LinkedIn",
    weeklyTarget: 3,
    color: "oklch(0.60 0.16 240)",
  },
  {
    platform: "instagram",
    label: "Instagram",
    weeklyTarget: 5,
    color: "oklch(0.68 0.18 330)",
  },
];

// Melhores horários para postar por plataforma (baseado em benchmarks de mercado B2B SaaS)
export const BEST_TIMES: BestTime[] = [
  { platform: "linkedin",  dayOfWeek: 2, hour: 9,  minute: 0  }, // Terça 9h
  { platform: "linkedin",  dayOfWeek: 3, hour: 12, minute: 0  }, // Quarta 12h
  { platform: "linkedin",  dayOfWeek: 4, hour: 10, minute: 0  }, // Quinta 10h
  { platform: "instagram", dayOfWeek: 1, hour: 11, minute: 0  }, // Seg 11h
  { platform: "instagram", dayOfWeek: 3, hour: 15, minute: 0  }, // Qua 15h
  { platform: "instagram", dayOfWeek: 5, hour: 18, minute: 0  }, // Sex 18h
  { platform: "instagram", dayOfWeek: 6, hour: 10, minute: 0  }, // Sáb 10h
  { platform: "instagram", dayOfWeek: 0, hour: 12, minute: 0  }, // Dom 12h
];

// Distribuição alvo de conteúdo por pilar (deve somar 100)
export const PILAR_MIX_TARGETS: PilarMixTarget[] = [
  { pilar: "educacao_pratica", label: "Educação",       targetPercent: 30, color: "oklch(0.70 0.14 240)" },
  { pilar: "resultado_ia",     label: "Resultado IA",   targetPercent: 25, color: "oklch(0.72 0.14 160)" },
  { pilar: "bastidores",       label: "Bastidores",     targetPercent: 20, color: "oklch(0.72 0.16 262)" },
  { pilar: "posicionamento",   label: "Posicionamento", targetPercent: 15, color: "oklch(0.80 0.14 38)"  },
  { pilar: "comercial",        label: "Comercial",      targetPercent: 10, color: "oklch(0.72 0.16 15)"  },
];

// Retorna os melhores horários de uma plataforma, ordenados por dia da semana
export function getBestTimesForPlatform(platform: "linkedin" | "instagram"): BestTime[] {
  return BEST_TIMES.filter((t) => t.platform === platform).sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour
  );
}

// Formata um BestTime em string legível: "Ter 9h", "Sex 18h"
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function formatBestTime(bt: BestTime): string {
  const min = bt.minute > 0 ? `:${String(bt.minute).padStart(2, "0")}` : "";
  return `${DAY_LABELS[bt.dayOfWeek]} ${bt.hour}${min}h`;
}

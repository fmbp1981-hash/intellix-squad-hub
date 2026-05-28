export interface JobDef {
  id: string;
  displayName: string;
  slaMin: number;
  estimatedTokens: number;
  requiresApproval?: boolean;
  cooldownMin?: number;
}

export const JOB_CATALOG: Record<string, JobDef[]> = {
  gestao: [
    { id: "on_demand", displayName: "Briefing On-Demand", slaMin: 3, estimatedTokens: 3000 },
    { id: "incident_response", displayName: "Resposta a Incidente", slaMin: 5, estimatedTokens: 3000 },
    { id: "weekly_review", displayName: "Revisão Semanal", slaMin: 10, estimatedTokens: 8000 },
  ],
  sdr: [
    { id: "prospect-icp", displayName: "Prospectar ICP", slaMin: 20, estimatedTokens: 6000, cooldownMin: 60 },
    { id: "qualify-lead", displayName: "Qualificar Lead BANT", slaMin: 10, estimatedTokens: 3000 },
    { id: "followup-sequence", displayName: "Sequência Follow-up", slaMin: 10, estimatedTokens: 3000, cooldownMin: 1440 },
    { id: "sdr-daily-prospecting", displayName: "Prospecção Diária SDR", slaMin: 30, estimatedTokens: 8000, cooldownMin: 720 },
  ],
  comercial: [
    { id: "run-diagnosis", displayName: "Diagnóstico do Deal", slaMin: 15, estimatedTokens: 4000 },
    { id: "generate-proposal", displayName: "Gerar Proposta", slaMin: 15, estimatedTokens: 5000, requiresApproval: true },
    { id: "followup-stale-deal", displayName: "Follow-up Deal Parado", slaMin: 10, estimatedTokens: 3000, cooldownMin: 1440 },
  ],
  marketing: [
    { id: "content-calendar", displayName: "Calendário Editorial", slaMin: 20, estimatedTokens: 5000, requiresApproval: true, cooldownMin: 10080 },
    { id: "create-carousel", displayName: "Criar Carrossel", slaMin: 10, estimatedTokens: 4000, requiresApproval: true },
    { id: "create-post", displayName: "Criar Post Feed", slaMin: 8, estimatedTokens: 2500, requiresApproval: true },
    { id: "create-story", displayName: "Criar Story", slaMin: 5, estimatedTokens: 1500, requiresApproval: true },
    { id: "create-linkedin", displayName: "Criar Post LinkedIn", slaMin: 8, estimatedTokens: 2500, requiresApproval: true },
  ],
  financeiro: [
    { id: "generate-invoice", displayName: "Emitir Fatura", slaMin: 5, estimatedTokens: 2000, requiresApproval: true },
    { id: "dunning-overdue", displayName: "Cobrança Inadimplentes", slaMin: 10, estimatedTokens: 3000 },
    { id: "cashflow-forecast", displayName: "Previsão Fluxo de Caixa", slaMin: 15, estimatedTokens: 4000 },
    { id: "monthly-report", displayName: "Fechamento Mensal", slaMin: 20, estimatedTokens: 6000, cooldownMin: 10080 },
  ],
  operacoes: [
    { id: "kickoff-engagement", displayName: "Kickoff de Engagement", slaMin: 10, estimatedTokens: 3000 },
    { id: "monitor-engagements", displayName: "Monitor Engagements", slaMin: 5, estimatedTokens: 2000 },
    { id: "escalate-blocked", displayName: "Escalar Bloqueados", slaMin: 5, estimatedTokens: 2000 },
    { id: "weekly-ops-report", displayName: "Relatório Semanal Ops", slaMin: 10, estimatedTokens: 4000, cooldownMin: 10080 },
  ],
  ti: [
    { id: "health-check", displayName: "Health Check", slaMin: 5, estimatedTokens: 2000, cooldownMin: 30 },
    { id: "incident-triage", displayName: "Triagem de Incidente", slaMin: 10, estimatedTokens: 3000 },
    { id: "cost-audit", displayName: "Auditoria de Custos", slaMin: 15, estimatedTokens: 4000, cooldownMin: 1440 },
    { id: "security-scan", displayName: "Scan de Segurança", slaMin: 20, estimatedTokens: 4000, cooldownMin: 1440 },
  ],
};

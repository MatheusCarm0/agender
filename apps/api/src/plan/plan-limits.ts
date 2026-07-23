import { PlanTier } from '@prisma/client';

/**
 * Matriz de capacidades por plano — FONTE ÚNICA da diferenciação comercial
 * (decisão do dono, jul/2026):
 *
 *  - Básico: funcionalidades essenciais, SEM disparo de campanha, SEM pagamento
 *    pela plataforma, SEM cupons e SEM clube fidelidade.
 *  - Profissional: tudo do Básico + pagamento pela plataforma + cupons.
 *  - Pro: tudo (inclui campanhas e fidelidade).
 *  - Limite de profissionais nos planos não-Pro.
 *
 * Os NÚMEROS de profissionais são placeholder de engenharia (mesmo padrão de
 * plan-pricing.ts) — ajustar quando a decisão comercial fechar.
 *
 * Negócio em TRIAL tem a experiência completa (Pro): o teste existe para o
 * dono conhecer tudo antes de escolher o plano.
 */

export interface PlanCapabilities {
  /** null = ilimitado */
  maxProfessionals: number | null;
  campaigns: boolean;
  coupons: boolean;
  memberships: boolean;
  onlinePayments: boolean;
}

export const PLAN_CAPABILITIES: Record<PlanTier, PlanCapabilities> = {
  basico: {
    maxProfessionals: 3,
    campaigns: false,
    coupons: false,
    memberships: false,
    onlinePayments: false,
  },
  profissional: {
    maxProfessionals: 10,
    campaigns: false,
    coupons: true,
    memberships: false,
    onlinePayments: true,
  },
  pro: {
    maxProfessionals: null,
    campaigns: true,
    coupons: true,
    memberships: true,
    onlinePayments: true,
  },
};

/** Listas para @RequiresPlan — derivadas da matriz para não divergirem dela. */
function plansWith(cap: keyof Omit<PlanCapabilities, 'maxProfessionals'>): string[] {
  return (Object.keys(PLAN_CAPABILITIES) as PlanTier[]).filter(
    (tier) => PLAN_CAPABILITIES[tier][cap],
  );
}

export const PLANS_WITH = {
  campaigns: plansWith('campaigns'),
  coupons: plansWith('coupons'),
  memberships: plansWith('memberships'),
  onlinePayments: plansWith('onlinePayments'),
};

/** Capacidades efetivas de um negócio (trial = experiência Pro completa). */
export function capabilitiesFor(
  plan: PlanTier | string,
  planStatus: string,
): PlanCapabilities {
  if (planStatus === 'trialing') return PLAN_CAPABILITIES.pro;
  return PLAN_CAPABILITIES[plan as PlanTier] ?? PLAN_CAPABILITIES.basico;
}

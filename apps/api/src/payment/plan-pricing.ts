// Preços de assinatura por plano. VALORES PLACEHOLDER de engenharia — a
// decisão comercial final ainda não está fechada (ver docs/05-monetizacao.md).
// Mantidos centralizados aqui para não espalhar preço pelo código.

import { PlanTier } from '@prisma/client';

export interface PlanPricing {
  tier: PlanTier;
  label: string;
  monthlyPrice: number; // BRL
}

export const PLAN_PRICING: Record<PlanTier, PlanPricing> = {
  basico: { tier: 'basico', label: 'Básico', monthlyPrice: 49.9 },
  profissional: {
    tier: 'profissional',
    label: 'Profissional',
    monthlyPrice: 99.9,
  },
  pro: { tier: 'pro', label: 'Pro', monthlyPrice: 199.9 },
};

export function getPlanPrice(tier: PlanTier): number {
  return PLAN_PRICING[tier]?.monthlyPrice ?? 0;
}

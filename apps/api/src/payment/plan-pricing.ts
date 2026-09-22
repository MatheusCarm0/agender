// Preços de assinatura. VALORES de partida definidos com o dono (set/2026):
// hoje a plataforma vende UM único plano com todas as funcionalidades, em dois
// ciclos — mensal e anual. Mantidos centralizados aqui para não espalhar preço
// pelo código.
//
// Ramificação futura (Básico/Profissional/Pro): vire `PLANS_BRANCHED` para
// `true` e ajuste os preços/rótulos por tier em BRANCHED_PRICING. A UI e o
// catálogo derivam tudo daqui — reativar a ramificação não exige reescrever a
// lógica de assinatura.

import { PlanTier } from '@prisma/client';

export type BillingCycle = 'monthly' | 'annual';

/**
 * Com `false`, a plataforma opera em PLANO ÚNICO (todas as funcionalidades).
 * Vire para `true` para reativar a ramificação de planos.
 */
export const PLANS_BRANCHED = false;

/**
 * O plano único mapeia para o tier `pro`, que já concentra TODAS as capacidades
 * em `plan/plan-limits.ts`. Assim não mexemos no enum `PlanTier` do banco e a
 * reativação da ramificação é só ligar a flag acima.
 */
export const SINGLE_PLAN_TIER: PlanTier = 'pro';

export interface PlanPricing {
  tier: PlanTier;
  label: string;
  monthly: number; // preço do ciclo mensal (BRL)
  annual: number; // preço do ciclo anual (BRL)
}

/**
 * Preços por tier. No modo plano único, só o slot `pro` é vendido (39,90/mês,
 * 399,90/ano) — os demais ficam como referência para a ramificação futura.
 */
const BRANCHED_PRICING: Record<PlanTier, PlanPricing> = {
  basico: { tier: 'basico', label: 'Básico', monthly: 49.9, annual: 499.9 },
  profissional: {
    tier: 'profissional',
    label: 'Profissional',
    monthly: 99.9,
    annual: 999.9,
  },
  pro: { tier: 'pro', label: 'Pro', monthly: 199.9, annual: 1999.9 },
};

/** Definição do plano único (todas as funcionalidades). */
const SINGLE_PLAN: PlanPricing = {
  tier: SINGLE_PLAN_TIER,
  label: 'Plano completo',
  monthly: 39.9,
  annual: 399.9,
};

/**
 * Tabela de preços consultável por tier — sempre completa (para lookups de
 * `getPlanPrice`/label por tier armazenado). No modo plano único, o slot do
 * `SINGLE_PLAN_TIER` recebe o preço do plano único.
 */
export const PLAN_PRICING: Record<PlanTier, PlanPricing> = PLANS_BRANCHED
  ? BRANCHED_PRICING
  : { ...BRANCHED_PRICING, [SINGLE_PLAN_TIER]: SINGLE_PLAN };

/** Tiers efetivamente vendidos hoje (1 no plano único, 3 na ramificação). */
export function getActivePlanTiers(): PlanTier[] {
  return PLANS_BRANCHED ? ['basico', 'profissional', 'pro'] : [SINGLE_PLAN_TIER];
}

export interface CycleDiscount {
  /** Economia em BRL no anual vs. 12× o mensal. */
  savings: number;
  /** Percentual de desconto do anual (arredondado). */
  percent: number;
  /** Meses "grátis" equivalentes no anual (1 casa decimal). */
  monthsFree: number;
  /** Custo mensal equivalente pagando no anual (BRL). */
  monthlyEquivalent: number;
}

/** Desconto do ciclo anual em relação a pagar 12 meses avulsos. */
export function annualDiscount(monthly: number, annual: number): CycleDiscount {
  const fullYear = monthly * 12;
  const savings = Math.max(0, Math.round((fullYear - annual) * 100) / 100);
  const percent = fullYear > 0 ? Math.round((savings / fullYear) * 100) : 0;
  const monthsFree =
    monthly > 0 ? Math.round((savings / monthly) * 10) / 10 : 0;
  const monthlyEquivalent = Math.round((annual / 12) * 100) / 100;
  return { savings, percent, monthsFree, monthlyEquivalent };
}

export interface PlanCatalogItem {
  tier: PlanTier;
  label: string;
  monthly: number;
  annual: number;
  discount: CycleDiscount;
}

/** Catálogo exibido na UI (com desconto do anual já calculado). */
export function getPlanCatalog(): PlanCatalogItem[] {
  return getActivePlanTiers().map((tier) => {
    const p = PLAN_PRICING[tier];
    return {
      tier,
      label: p.label,
      monthly: p.monthly,
      annual: p.annual,
      discount: annualDiscount(p.monthly, p.annual),
    };
  });
}

/** Preço a cobrar de um tier no ciclo escolhido (default: mensal). */
export function getPlanPrice(
  tier: PlanTier,
  cycle: BillingCycle = 'monthly',
): number {
  const pricing = PLAN_PRICING[tier];
  if (!pricing) return 0;
  return cycle === 'annual' ? pricing.annual : pricing.monthly;
}

import Link from 'next/link';

export type Plan = 'basico' | 'profissional' | 'pro';

const PLAN_RANK: Record<string, number> = { basico: 0, profissional: 1, pro: 2 };

/**
 * Retorna true se o negócio atende (ou supera) o plano mínimo exigido.
 * Negócio em TRIAL (`planStatus === 'trialing'`) tem a experiência Pro completa,
 * espelhando `capabilitiesFor` no backend (apps/api/src/plan/plan-limits.ts).
 */
export function planAllows(
  plan: string | undefined | null,
  minPlan: 'profissional' | 'pro',
  planStatus?: string | null,
): boolean {
  if (planStatus === 'trialing') return true;
  return (PLAN_RANK[plan ?? 'basico'] ?? 0) >= PLAN_RANK[minPlan];
}

/**
 * Card de upsell padrão para funcionalidades bloqueadas por plano.
 * Mantém um visual único para todos os gates (Cupons, Fidelidade, Campanhas…).
 */
export function UpsellCard({
  title,
  description,
  plansLabel,
}: {
  title: string;
  description: string;
  plansLabel: string;
}) {
  return (
    <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 text-center max-w-lg mx-auto mt-12">
      <div className="w-12 h-12 rounded-full bg-primary-tint-bg flex items-center justify-center mx-auto mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-default" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-text-strong">{title}</h2>
      <p className="text-sm text-text-muted mt-2 max-w-sm mx-auto">{description}</p>
      <p className="text-sm text-text-muted mt-3">{plansLabel}</p>
      <Link
        href="/admin/plano"
        className="inline-flex items-center justify-center mt-5 px-5 py-2 text-sm font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors"
      >
        Ver planos
      </Link>
    </div>
  );
}

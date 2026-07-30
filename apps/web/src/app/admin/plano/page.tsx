'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { getCached } from '@/lib/prefetch-cache';

type PlanTier = 'basico' | 'profissional' | 'pro';

interface CatalogItem {
  tier: PlanTier;
  label: string;
  monthlyPrice: number;
}

interface SubscriptionInfo {
  plan: string;
  planStatus: string;
  planUpdatedAt: string | null;
  subscription: {
    id: string;
    planTier: PlanTier;
    status: string;
    amount: number;
    checkoutUrl: string | null;
    nextDueDate: string | null;
  } | null;
  catalog: CatalogItem[];
}

interface PlanUsage {
  campaignSendsIncluded: number;
  campaignSendsUsed: number;
  overageSends: number;
}

// Espelho da matriz comercial em apps/api/src/plan/plan-limits.ts —
// mantenha os dois em sincronia ao mudar a diferenciação.
const PLAN_FEATURES: Record<PlanTier, string[]> = {
  basico: [
    'Agendamento online ilimitado',
    'Página pública personalizada',
    'Até 3 profissionais ativos',
    'Lembretes de agendamento',
    'Relatório financeiro',
  ],
  profissional: [
    'Tudo do Básico',
    'Até 10 profissionais ativos',
    'Cobrança no agendamento (PIX)',
    'Cupons de desconto',
  ],
  pro: [
    'Tudo do Profissional',
    'Profissionais ilimitados',
    'Campanhas de disparo',
    'Clube fidelidade',
  ],
};

const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando pagamento',
  active: 'Ativa',
  overdue: 'Pagamento atrasado',
  cancelled: 'Cancelada',
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function PlanPage() {
  const { token, user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');

  useEffect(() => {
    if (!token) return;
    // Retorno do checkout do gateway: reconcilia o status antes de exibir.
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'return') {
      syncOnReturn();
    } else {
      const cached = getCached<SubscriptionInfo>('/plan-subscription');
      if (cached) { setInfo(cached); setLoading(false); }
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadData() {
    try {
      const [sub, usageData] = await Promise.all([
        api<SubscriptionInfo>('/plan-subscription', { token: token! }),
        api<PlanUsage>('/plan/usage', { token: token! }).catch(() => null),
      ]);
      setInfo(sub);
      if (usageData) setUsage(usageData);
    } catch {
      toast('Não foi possível carregar seu plano.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function syncOnReturn() {
    try {
      await api('/plan-subscription/sync', { token: token!, method: 'POST' });
      await refreshUser();
    } catch {
      // segue para o load normal mesmo se o sync falhar
    } finally {
      window.history.replaceState(null, '', '/admin/plano');
      loadData();
    }
  }

  async function handleSubscribe(plan: PlanTier) {
    setWorking(plan);
    try {
      const res = await api<{ checkoutUrl: string | null }>('/plan-subscription', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      if (res.checkoutUrl) {
        // Redireciona para o checkout do gateway; o plano vira ativo no retorno
        // (via webhook em produção, ou pelo sync do retorno em dev).
        window.location.href = res.checkoutUrl;
        return;
      }
      await refreshUser();
      await loadData();
      toast('Assinatura criada.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível assinar.', 'error');
    } finally {
      setWorking('');
    }
  }

  const isExpired = user?.business.planStatus === 'expired';
  const isTrialing = info?.planStatus === 'trialing';
  const trialEndsAt = user?.business.trialEndsAt;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-surface-subtle rounded animate-pulse" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const catalog = info?.catalog ?? [];
  const activeSub = info?.subscription;

  return (
    <div className="space-y-6">
      {isExpired && (
        <div className="bg-danger-bg border border-danger-fg/20 rounded-[var(--radius-md)] p-4">
          <h2 className="text-base font-semibold text-danger-text">
            Seu período de teste expirou
          </h2>
          <p className="text-sm text-danger-text/80 mt-1">
            Assine um plano para continuar usando a plataforma. Seus dados estão seguros e seus agendamentos existentes continuam visíveis.
          </p>
        </div>
      )}

      {isTrialing && trialEndsAt && (
        <div className="bg-info-bg border border-info-fg/20 rounded-[var(--radius-md)] p-4">
          <h2 className="text-base font-semibold text-info-text">
            Período de teste ativo
          </h2>
          <p className="text-sm text-info-text/80 mt-1">
            Seu teste termina em{' '}
            <strong>
              {new Date(trialEndsAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </strong>
            . Assine um plano a qualquer momento para garantir acesso contínuo.
          </p>
        </div>
      )}

      {activeSub && activeSub.status === 'pending' && activeSub.checkoutUrl && (
        <div className="bg-warning-bg border border-warning-fg/20 rounded-[var(--radius-md)] p-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-warning-text">
              Pagamento pendente
            </h2>
            <p className="text-sm text-warning-text/80 mt-1">
              Sua assinatura do plano {catalog.find((c) => c.tier === activeSub.planTier)?.label} aguarda a confirmação do pagamento.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                await syncOnReturn();
              }}
              className="h-9 px-4 text-sm font-medium border border-border-strong text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle"
            >
              Já paguei, verificar
            </button>
            <a
              href={activeSub.checkoutUrl}
              className="h-9 px-4 flex items-center bg-warning-fg text-white text-sm font-medium rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
            >
              Concluir pagamento
            </a>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-text-strong leading-tight">
          {isExpired ? 'Assine um plano para continuar' : 'Seu plano'}
        </h1>
        {!isExpired && info && (
          <p className="text-sm text-text-muted mt-1">
            Plano atual:{' '}
            <strong>{catalog.find((c) => c.tier === info.plan)?.label ?? info.plan}</strong>
            {' · '}
            Status: {activeSub ? (SUBSCRIPTION_STATUS_LABEL[activeSub.status] ?? activeSub.status) : (info.planStatus === 'active' ? 'Ativo' : info.planStatus === 'trialing' ? 'Em teste' : info.planStatus)}
            {activeSub?.status === 'active' && activeSub.nextDueDate && (
              <>
                {' · '}
                Próxima cobrança em{' '}
                <span className="font-mono tabular-nums">
                  {new Date(activeSub.nextDueDate).toLocaleDateString('pt-BR')}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {catalog.map((item) => {
          const isCurrent =
            info?.plan === item.tier &&
            info?.planStatus === 'active' &&
            activeSub?.status === 'active';
          const highlight = item.tier === 'profissional';
          return (
            <div
              key={item.tier}
              className={`bg-surface-card border rounded-[var(--radius-md)] p-5 flex flex-col ${
                highlight
                  ? 'border-primary-default ring-1 ring-primary-default'
                  : 'border-border-default'
              }`}
            >
              {highlight && (
                <span className="text-xs font-medium text-primary-default mb-2">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-text-strong">
                {item.label}
              </h3>
              <p className="mt-1">
                <span className="text-2xl font-semibold text-text-strong font-mono tabular-nums">
                  {formatBRL(item.monthlyPrice)}
                </span>
                <span className="text-sm text-text-muted">/mês</span>
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {PLAN_FEATURES[item.tier].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-text-default">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-fg mt-0.5 shrink-0" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <span className="block text-center text-sm font-medium text-primary-default py-2">
                    Plano atual
                  </span>
                ) : (
                  <button
                    onClick={() => handleSubscribe(item.tier)}
                    disabled={working !== ''}
                    className={`w-full py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors disabled:opacity-50 ${
                      highlight
                        ? 'bg-primary-default text-primary-fg hover:bg-primary-hover'
                        : 'bg-surface-subtle text-text-strong border border-border-strong hover:bg-surface-card'
                    }`}
                  >
                    {working === item.tier ? 'Redirecionando...' : 'Assinar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {usage && info?.planStatus === 'active' && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-5">
          <h3 className="text-base font-semibold text-text-strong mb-3">
            Uso do ciclo atual
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Disparos de campanha</span>
                <span className="font-mono text-text-strong tabular-nums">
                  {usage.campaignSendsUsed} / {usage.campaignSendsIncluded}
                </span>
              </div>
              <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-default rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, usage.campaignSendsIncluded > 0 ? (usage.campaignSendsUsed / usage.campaignSendsIncluded) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
            {usage.overageSends > 0 && (
              <div className="text-sm">
                <span className="text-warning-text font-medium">
                  +{usage.overageSends} excedente
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-text-subtle">
        A cobrança da assinatura é recorrente e processada com segurança pelo Mercado Pago. Você pode trocar de plano a qualquer momento.
      </p>
    </div>
  );
}

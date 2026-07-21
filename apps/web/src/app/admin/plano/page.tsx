'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface PlanInfo {
  plan: string;
  planStatus: string;
  trialEndsAt: string;
  planUpdatedAt: string | null;
}

interface PlanUsage {
  campaignSendsIncluded: number;
  campaignSendsUsed: number;
  overageSends: number;
}

const PLAN_LABELS: Record<string, string> = {
  basico: 'Básico',
  profissional: 'Profissional',
  pro: 'Pro',
};

const PLAN_FEATURES: Record<string, string[]> = {
  basico: [
    'Agendamento online ilimitado',
    'Página pública personalizada',
    'Gestão de equipe',
    'Relatório financeiro',
  ],
  profissional: [
    'Tudo do Básico',
    'Campanhas de disparo (300/mês)',
    'Cupons e fidelidade',
    'Notificações WhatsApp',
  ],
  pro: [
    'Tudo do Profissional',
    'Campanhas de disparo (1.000/mês)',
    'Suporte prioritário',
    'Relatórios avançados',
  ],
};

export default function PlanPage() {
  const { token, user, refreshUser } = useAuth();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState('');

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const [plan, usageData] = await Promise.all([
        api<PlanInfo>('/plan', { token: token! }),
        api<PlanUsage>('/plan/usage', { token: token! }),
      ]);
      setPlanInfo(plan);
      setUsage(usageData);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(plan: string) {
    setActivating(plan);
    try {
      await api('/plan/activate', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      await refreshUser();
      await loadData();
    } catch {
      // handle error
    } finally {
      setActivating('');
    }
  }

  const isExpired = user?.business.planStatus === 'expired';
  const isTrialing = user?.business.planStatus === 'trialing';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-surface-subtle rounded animate-pulse" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isExpired && (
        <div className="bg-danger-bg border border-danger-fg/20 rounded-[var(--radius-md)] p-4">
          <h2 className="text-base font-semibold text-danger-text">
            Seu período de teste expirou
          </h2>
          <p className="text-sm text-danger-text/80 mt-1">
            Escolha um plano para continuar usando a plataforma. Seus dados estão seguros e seus agendamentos existentes continuam visíveis.
          </p>
        </div>
      )}

      {isTrialing && planInfo && (
        <div className="bg-info-bg border border-info-fg/20 rounded-[var(--radius-md)] p-4">
          <h2 className="text-base font-semibold text-info-text">
            Período de teste ativo
          </h2>
          <p className="text-sm text-info-text/80 mt-1">
            Seu teste termina em{' '}
            <strong>
              {new Date(planInfo.trialEndsAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </strong>
            . Escolha um plano a qualquer momento para garantir acesso contínuo.
          </p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-text-strong leading-tight">
          {isExpired ? 'Escolha um plano para continuar' : 'Seu plano'}
        </h1>
        {!isExpired && planInfo && (
          <p className="text-sm text-text-muted mt-1">
            Plano atual: <strong>{PLAN_LABELS[planInfo.plan] ?? planInfo.plan}</strong>
            {' · '}
            Status: {planInfo.planStatus === 'active' ? 'Ativo' : planInfo.planStatus === 'trialing' ? 'Em teste' : planInfo.planStatus}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(['basico', 'profissional', 'pro'] as const).map((plan) => {
          const isCurrent = planInfo?.plan === plan && planInfo?.planStatus === 'active';
          return (
            <div
              key={plan}
              className={`bg-surface-card border rounded-[var(--radius-md)] p-5 flex flex-col ${
                plan === 'profissional'
                  ? 'border-primary-default ring-1 ring-primary-default'
                  : 'border-border-default'
              }`}
            >
              {plan === 'profissional' && (
                <span className="text-xs font-medium text-primary-default mb-2">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-text-strong">
                {PLAN_LABELS[plan]}
              </h3>
              <ul className="mt-4 space-y-2 flex-1">
                {PLAN_FEATURES[plan].map((feature) => (
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
                    onClick={() => handleActivate(plan)}
                    disabled={activating !== ''}
                    className={`w-full py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors disabled:opacity-50 ${
                      plan === 'profissional'
                        ? 'bg-primary-default text-primary-fg hover:bg-primary-hover'
                        : 'bg-surface-subtle text-text-strong border border-border-strong hover:bg-surface-card'
                    }`}
                  >
                    {activating === plan ? 'Ativando...' : isCurrent ? 'Plano atual' : 'Escolher plano'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {usage && planInfo?.planStatus === 'active' && (
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
        A ativação de plano nesta fase é feita manualmente. Entre em contato para confirmar pagamento e ativar seu plano.
      </p>
    </div>
  );
}

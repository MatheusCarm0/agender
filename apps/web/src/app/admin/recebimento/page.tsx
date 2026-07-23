'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';

interface Balance {
  gross: number;
  estimatedFees: number;
  net: number;
  withdrawn: number;
  available: number;
  currency: string;
}

interface Account {
  id: string;
  status: 'pending_verification' | 'active' | 'restricted';
  provider: string;
  pixKey: string | null;
  documentType: string | null;
  documentNumberMasked: string | null;
  externalAccountId: string | null;
  createdAt: string;
}

interface AccountResponse {
  account: Account | null;
  balance: Balance;
  canWithdraw: boolean;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  destination: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<Account['status'], string> = {
  pending_verification: 'Em verificação',
  active: 'Ativa',
  restricted: 'Restrita',
};

const WITHDRAWAL_STATUS: Record<Withdrawal['status'], { label: string; cls: string }> = {
  pending: { label: 'Processando', cls: 'bg-info-bg text-info-text' },
  confirmed: { label: 'Concluído', cls: 'bg-success-bg text-success-text' },
  failed: { label: 'Falhou', cls: 'bg-danger-bg text-danger-text' },
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RecebimentoPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<AccountResponse | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [form, setForm] = useState({ documentType: 'CPF', documentNumber: '', pixKey: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [policy, setPolicy] = useState<{ bookingPaymentPolicy: 'none' | 'deposit' | 'full'; depositPercent: number | null } | null>(null);

  useEffect(() => {
    if (!token) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadAll() {
    try {
      const [acc, wd, biz] = await Promise.all([
        api<AccountResponse>('/payment-account', { token: token! }),
        api<Withdrawal[]>('/payment-account/withdrawals', { token: token! }).catch(() => []),
        api<{ bookingPaymentPolicy?: 'none' | 'deposit' | 'full'; depositPercent?: number | null }>('/business', { token: token! }).catch(() => null),
      ]);
      setData(acc);
      setWithdrawals(wd);
      if (biz) setPolicy({ bookingPaymentPolicy: biz.bookingPaymentPolicy || 'none', depositPercent: biz.depositPercent ?? null });
    } catch {
      toast('Não foi possível carregar seus dados de recebimento.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const res = await api<AccountResponse>('/payment-account', {
        token,
        method: 'POST',
        body: JSON.stringify({
          documentType: form.documentType,
          documentNumber: form.documentNumber.replace(/\D/g, ''),
          pixKey: form.pixKey || undefined,
        }),
      });
      setData(res);
      toast('Dados de recebimento salvos.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    if (!token) return;
    setVerifying(true);
    try {
      const res = await api<AccountResponse>('/payment-account/verify', {
        token,
        method: 'POST',
      });
      setData(res);
      toast('Recebimento ativado.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao ativar.', 'error');
    } finally {
      setVerifying(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const amount = Number(withdrawAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      toast('Informe um valor válido.', 'error');
      return;
    }
    setWithdrawing(true);
    try {
      const res = await api<{ message?: string }>('/payment-account/withdraw', {
        token,
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      setWithdrawAmount('');
      await loadAll();
      toast(res.message || 'Saque solicitado.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao solicitar saque.', 'error');
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-7 w-48 bg-surface-subtle rounded animate-pulse" />
        <div className="h-40 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
        <div className="h-56 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
      </div>
    );
  }

  const account = data?.account;
  const balance = data?.balance;
  const isActive = account?.status === 'active';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-strong">Recebimento</h1>
        <p className="text-sm text-text-muted mt-1">
          Configure onde receber os pagamentos dos agendamentos e acompanhe seu saldo.
        </p>
      </div>

      {/* Saldo */}
      <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base font-semibold text-text-strong">Saldo disponível</h2>
          {account && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-[var(--radius-pill)] ${
                isActive ? 'bg-success-bg text-success-text' : 'bg-warning-bg text-warning-text'
              }`}
            >
              {STATUS_LABEL[account.status]}
            </span>
          )}
        </div>

        <p className="text-3xl font-semibold text-text-strong font-mono tabular-nums">
          {formatBRL(balance?.available ?? 0)}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Recebido (bruto)</dt>
            <dd className="font-mono tabular-nums text-text-default">{formatBRL(balance?.gross ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Taxa estimada</dt>
            <dd className="font-mono tabular-nums text-text-default">− {formatBRL(balance?.estimatedFees ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Líquido</dt>
            <dd className="font-mono tabular-nums text-text-default">{formatBRL(balance?.net ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Já sacado</dt>
            <dd className="font-mono tabular-nums text-text-default">− {formatBRL(balance?.withdrawn ?? 0)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-text-subtle">
          A taxa é cobrada pelo Mercado Pago sobre cada pagamento. Os valores acima são uma estimativa; a taxa final é definida na liquidação.
        </p>
      </section>

      {/* Política de cobrança (configurada em Configurações) */}
      {policy && (
        <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text-strong mb-1">Cobrança no agendamento</h2>
              <p className="text-sm text-text-default">
                {policy.bookingPaymentPolicy === 'none' && 'Você não está cobrando no agendamento — os clientes agendam sem pagar antes.'}
                {policy.bookingPaymentPolicy === 'deposit' && `Cobrando um sinal de ${policy.depositPercent ?? 0}% do valor do serviço ao agendar.`}
                {policy.bookingPaymentPolicy === 'full' && 'Cobrando o valor cheio do serviço ao agendar.'}
              </p>
            </div>
            <a
              href="/admin/settings"
              className="shrink-0 h-8 px-3 text-xs font-medium border border-border-strong text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle flex items-center"
            >
              Alterar em Configurações
            </a>
          </div>
        </section>
      )}

      {/* Onboarding / dados de recebimento */}
      <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
        <h2 className="text-base font-semibold text-text-strong mb-4">Dados de recebimento</h2>
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-28">
              <label className="block text-xs font-medium text-text-muted mb-1">Documento</label>
              <select
                value={form.documentType}
                onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
                className="w-full h-9 px-2 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Número {account?.documentNumberMasked ? `(atual: ${account.documentNumberMasked})` : ''}
              </label>
              <input
                value={form.documentNumber}
                onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
                placeholder="Somente números"
                className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-mono tabular-nums focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Chave PIX para saque
            </label>
            <input
              value={form.pixKey}
              onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))}
              placeholder={account?.pixKey || 'CPF, e-mail, telefone ou chave aleatória'}
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar dados'}
            </button>
            {account && !isActive && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="h-9 px-4 text-sm font-medium border border-border-strong text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle disabled:opacity-50"
              >
                {verifying ? 'Ativando...' : 'Ativar recebimento (teste)'}
              </button>
            )}
          </div>
        </form>
        {account && !isActive && (
          <p className="mt-3 text-xs text-text-subtle">
            Enquanto a conta não está verificada, você recebe agendamentos normalmente, mas o saque fica indisponível. Em produção a verificação é automática; nesta fase de testes use o botão acima para ativar.
          </p>
        )}
      </section>

      {/* Saque */}
      <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
        <h2 className="text-base font-semibold text-text-strong mb-4">Solicitar saque</h2>
        <form onSubmit={handleWithdraw} className="flex items-end gap-3">
          <div className="flex-1 max-w-[200px]">
            <label className="block text-xs font-medium text-text-muted mb-1">Valor (R$)</label>
            <input
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              disabled={!isActive}
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-mono tabular-nums focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!isActive || withdrawing || !data?.canWithdraw}
            className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
          >
            {withdrawing ? 'Solicitando...' : 'Solicitar saque'}
          </button>
        </form>
        {!isActive ? (
          <p className="mt-2 text-xs text-text-subtle">
            O saque fica disponível quando o recebimento estiver ativo.
          </p>
        ) : !data?.canWithdraw ? (
          <p className="mt-2 text-xs text-text-subtle">
            Você ainda não tem saldo disponível para saque.
          </p>
        ) : null}

        {withdrawals.length > 0 && (
          <div className="mt-5 -mx-6 px-6 pt-4 border-t border-border-default">
            <h3 className="text-xs font-medium text-text-muted mb-2">Histórico de saques</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-b border-border-default last:border-0">
                      <td className="py-2 font-mono tabular-nums text-text-strong">{formatBRL(w.amount)}</td>
                      <td className="py-2 text-text-muted">{w.destination || '—'}</td>
                      <td className="py-2 text-text-muted font-mono tabular-nums text-xs">
                        {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-[var(--radius-pill)] ${WITHDRAWAL_STATUS[w.status].cls}`}>
                          {WITHDRAWAL_STATUS[w.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';

interface AccountInfo {
  connected: boolean;
  account: {
    status: string;
    provider: string;
    externalAccountId: string | null;
    connectedAt: string | null;
    pixUnavailable: boolean;
  } | null;
  received: {
    gross: number;
    estimatedFees: number;
    net: number;
    count: number;
    currency: string;
  };
  recentPayments: {
    id: string;
    amount: number;
    method: string;
    paidAt: string | null;
  }[];
  withdrawUrl: string | null;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const METHOD_LABEL: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Mensagens do retorno do OAuth (query ?connect= / ?connected=).
const RETURN_MESSAGES: Record<string, { text: string; kind: 'success' | 'error' }> = {
  '1': { text: 'Conta Mercado Pago conectada.', kind: 'success' },
  denied: { text: 'Conexão não autorizada no Mercado Pago.', kind: 'error' },
  invalid: { text: 'Link de conexão inválido ou expirado. Tente novamente.', kind: 'error' },
  error: { text: 'Não foi possível concluir a conexão. Tente novamente.', kind: 'error' },
};

export default function RecebimentoPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!token) return;
    // Retorno do OAuth do Mercado Pago: mostra o feedback e limpa a query.
    const params = new URLSearchParams(window.location.search);
    const ret = params.get('connected') ?? params.get('connect');
    if (ret && RETURN_MESSAGES[ret]) {
      toast(RETURN_MESSAGES[ret].text, RETURN_MESSAGES[ret].kind);
      window.history.replaceState(null, '', '/admin/recebimento');
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load() {
    try {
      const data = await api<AccountInfo>('/payment-account', { token: token! });
      setInfo(data);
    } catch {
      toast('Não foi possível carregar o recebimento.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setWorking(true);
    try {
      const res = await api<{ authorizationUrl: string }>(
        '/payment-account/connect',
        { token: token! },
      );
      // Leva o lojista ao Mercado Pago para autorizar; volta pelo callback.
      window.location.href = res.authorizationUrl;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Não foi possível iniciar a conexão.',
        'error',
      );
      setWorking(false);
    }
  }

  async function handleRetryPix() {
    setWorking(true);
    try {
      const data = await api<AccountInfo>('/payment-account/pix/retry', {
        token: token!,
        method: 'POST',
      });
      setInfo(data);
      toast('PIX reativado. Vamos tentar de novo na próxima cobrança.');
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Não foi possível reativar o PIX.',
        'error',
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Desconectar a conta Mercado Pago? Você deixará de receber pagamentos online até conectar de novo.')) {
      return;
    }
    setWorking(true);
    try {
      const data = await api<AccountInfo>('/payment-account/disconnect', {
        token: token!,
        method: 'POST',
      });
      setInfo(data);
      toast('Conta desconectada.');
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Não foi possível desconectar.',
        'error',
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-strong">Recebimento</h1>
        <p className="text-sm text-text-muted mt-1">
          Conecte sua conta Mercado Pago para receber os pagamentos dos agendamentos direto na sua conta.
        </p>
      </div>

      {loading ? (
        <div className="h-48 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
      ) : info?.connected ? (
        <>
          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[var(--radius-pill)] bg-success-bg text-success-text text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-fg" aria-hidden="true" />
                  Conectada
                </span>
                <span className="text-sm text-text-muted">Mercado Pago</span>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={working}
                className="h-8 px-3 text-sm font-medium text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle disabled:opacity-50"
              >
                Desconectar
              </button>
            </div>

            {/* Extrato PRÓPRIO: o que entrou pelos agendamentos, dos nossos
                registros (o saldo global do MP não é acessível por API). */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-surface-subtle rounded-[var(--radius-md)] p-4">
                <p className="text-xs font-medium text-text-muted">Recebido (bruto)</p>
                <p className="mt-1 text-xl font-semibold text-text-strong font-mono tabular-nums">
                  {formatBRL(info.received.gross)}
                </p>
              </div>
              <div className="bg-surface-subtle rounded-[var(--radius-md)] p-4">
                <p className="text-xs font-medium text-text-muted">Taxas (estimadas)</p>
                <p className="mt-1 text-xl font-semibold text-text-muted font-mono tabular-nums">
                  −{formatBRL(info.received.estimatedFees)}
                </p>
              </div>
              <div className="bg-surface-subtle rounded-[var(--radius-md)] p-4">
                <p className="text-xs font-medium text-text-muted">Líquido</p>
                <p className="mt-1 text-xl font-semibold text-primary-default font-mono tabular-nums">
                  {formatBRL(info.received.net)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-text-subtle">
              Total recebido pelos agendamentos ({info.received.count}{' '}
              {info.received.count === 1 ? 'pagamento' : 'pagamentos'}). O saldo completo e os
              saques ficam no seu Mercado Pago.
            </p>

            <div className="mt-6 pt-5 border-t border-border-default">
              <a
                href={info.withdrawUrl ?? 'https://www.mercadopago.com.br/balance'}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-4 inline-flex items-center bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors"
              >
                Ver saldo e sacar no Mercado Pago
              </a>
            </div>
          </section>

          {/* PIX reativo: a conta não tem chave PIX (detectado numa cobrança). */}
          {info.account?.pixUnavailable && (
            <section className="bg-warning-bg border border-warning-fg/20 rounded-[var(--radius-md)] p-5">
              <h2 className="text-sm font-semibold text-warning-text">PIX indisponível</h2>
              <p className="mt-1 text-sm text-warning-text/90">
                Sua conta Mercado Pago não tem uma chave PIX cadastrada, então os clientes só
                conseguem pagar com cartão. Cadastre uma chave PIX no app do Mercado Pago e depois
                clique abaixo para reativar o PIX.
              </p>
              <button
                type="button"
                onClick={handleRetryPix}
                disabled={working}
                className="mt-3 h-9 px-4 text-sm font-medium border border-border-strong text-text-default bg-surface-card rounded-[var(--radius-sm)] hover:bg-surface-subtle disabled:opacity-50"
              >
                Já cadastrei minha chave PIX
              </button>
            </section>
          )}

          {info.recentPayments.length > 0 && (
            <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-hidden">
              <h2 className="text-sm font-semibold text-text-strong px-5 pt-5 pb-3">
                Últimos pagamentos
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-subtle text-xs text-text-muted">
                    <th className="text-left font-medium px-5 py-2">Data</th>
                    <th className="text-left font-medium px-5 py-2">Forma</th>
                    <th className="text-right font-medium px-5 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {info.recentPayments.map((p) => (
                    <tr key={p.id} className="border-t border-border-default">
                      <td className="px-5 py-2.5 font-mono tabular-nums text-text-default">{formatDate(p.paidAt)}</td>
                      <td className="px-5 py-2.5 text-text-default">{METHOD_LABEL[p.method] ?? p.method}</td>
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums text-text-strong">{formatBRL(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      ) : (
        <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-10 shadow-[var(--shadow-elevation-1)] text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-[var(--radius-pill)] bg-primary-tint-bg text-primary-tint-text flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12V7H5a2 2 0 010-4h14v4" />
              <path d="M3 5v14a2 2 0 002 2h16v-5" />
              <path d="M18 12a2 2 0 100 4h4v-4z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-text-strong">
            Conecte sua conta para receber
          </h2>
          <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
            Conecte sua conta Mercado Pago para aceitar pagamentos online no agendamento. O dinheiro cai direto na sua conta e você saca quando quiser.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={working}
            className="mt-5 h-10 px-5 inline-flex items-center bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {working ? 'Redirecionando...' : 'Conectar Mercado Pago'}
          </button>
        </section>
      )}
    </div>
  );
}

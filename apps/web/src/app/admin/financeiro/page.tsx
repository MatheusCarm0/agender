'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface RevenueReport {
  realized: number;
  projected: number;
  averageTicket: number;
  totalCompleted: number;
  byProfessional: { id: string; name: string; revenue: number; count: number }[];
  byService: { id: string; name: string; revenue: number; count: number }[];
}

interface EarningsEntry {
  professionalId: string;
  name: string;
  totalRevenue: number;
  commission: number;
  commissionType: string;
  commissionValue: number;
  count: number;
}

interface Professional {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

function SkeletonCard() {
  return (
    <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] p-6">
      <div className="h-3 w-24 bg-surface-subtle rounded animate-pulse mb-3" />
      <div className="h-7 w-32 bg-surface-subtle rounded animate-pulse" />
    </div>
  );
}

function SkeletonTable({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-hidden">
      <div className="h-10 bg-surface-subtle animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 border-b border-border-default px-4 flex items-center gap-4">
          <div className="h-3 flex-1 bg-surface-subtle rounded animate-pulse" />
          <div className="h-3 w-16 bg-surface-subtle rounded animate-pulse" />
          <div className="h-3 w-20 bg-surface-subtle rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function FinanceiroPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState(getCurrentMonthRange);
  const [professionalFilter, setProfessionalFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFilters = useCallback(async () => {
    if (!token) return;
    try {
      const [p, s] = await Promise.all([
        api<Professional[]>('/professionals', { token }),
        api<Service[]>('/services', { token }),
      ]);
      setProfessionals(p);
      setServices(s);
    } catch {
      toast('Não foi possível carregar os filtros', 'error');
    }
  }, [token, toast]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    const params = new URLSearchParams({
      from: dateRange.from,
      to: dateRange.to,
    });
    if (professionalFilter) params.set('professionalId', professionalFilter);
    if (serviceFilter) params.set('serviceId', serviceFilter);

    try {
      const [rev, earn] = await Promise.all([
        api<RevenueReport>(`/reports/revenue?${params}`, { token }),
        api<EarningsEntry[]>(`/reports/earnings?from=${dateRange.from}&to=${dateRange.to}`, { token }),
      ]);
      setRevenue(rev);
      setEarnings(earn);
    } catch {
      toast('Não foi possível carregar os dados financeiros', 'error');
    }
    setLoading(false);
  }, [token, dateRange, professionalFilter, serviceFilter, toast]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadData();
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [loadData]);

  function exportCSV() {
    if (!revenue) return;
    const rows = [
      ['Tipo', 'Nome', 'Atendimentos', 'Receita (R$)'],
      ...revenue.byProfessional.map((p) => ['Profissional', p.name, String(p.count), p.revenue.toFixed(2)]),
      ...revenue.byService.map((s) => ['Serviço', s.name, String(s.count), s.revenue.toFixed(2)]),
    ];
    if (earnings.length > 0) {
      rows.push([]);
      rows.push(['Profissional', 'Receita total', 'Tipo comissão', 'Valor comissão', 'Comissão (R$)', 'Atendimentos']);
      earnings.forEach((e) => {
        rows.push([
          e.name,
          e.totalRevenue.toFixed(2),
          e.commissionType === 'percent' ? 'Percentual' : e.commissionType === 'fixed' ? 'Fixo' : 'Nenhuma',
          e.commissionType === 'percent' ? `${e.commissionValue}%` : e.commissionValue.toFixed(2),
          e.commission.toFixed(2),
          String(e.count),
        ]);
      });
    }
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro_${dateRange.from}_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mono = 'font-[family-name:var(--font-geist-mono)] tabular-nums';

  return (
    <div>
      {/* Header + filters */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Financeiro</h1>
          <p className="text-xs text-text-muted mt-1">Acompanhe receita, comissões e desempenho do negócio.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="fin-from" className="block text-xs font-medium text-text-muted mb-1">De</label>
            <input
              id="fin-from"
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              className="h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
            />
          </div>
          <div>
            <label htmlFor="fin-to" className="block text-xs font-medium text-text-muted mb-1">Até</label>
            <input
              id="fin-to"
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              className="h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
            />
          </div>
          <div>
            <label htmlFor="fin-prof" className="block text-xs font-medium text-text-muted mb-1">Profissional</label>
            <select
              id="fin-prof"
              value={professionalFilter}
              onChange={(e) => setProfessionalFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
            >
              <option value="">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fin-svc" className="block text-xs font-medium text-text-muted mb-1">Serviço</label>
            <select
              id="fin-svc"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
            >
              <option value="">Todos</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={exportCSV}
            disabled={loading || !revenue}
            className="h-9 px-4 border border-border-strong text-text-default text-sm rounded-[var(--radius-sm)] hover:bg-surface-subtle disabled:opacity-50 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : revenue && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] p-6">
            <p className="text-xs font-medium text-text-muted mb-1">Faturamento realizado</p>
            <p className={`text-2xl font-semibold text-success-text ${mono}`}>
              {formatCurrency(revenue.realized)}
            </p>
          </div>
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] p-6">
            <p className="text-xs font-medium text-text-muted mb-1">Faturamento previsto</p>
            <p className={`text-2xl font-semibold text-info-text ${mono}`}>
              {formatCurrency(revenue.projected)}
            </p>
          </div>
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] p-6">
            <p className="text-xs font-medium text-text-muted mb-1">Ticket médio</p>
            <p className={`text-2xl font-semibold text-text-strong ${mono}`}>
              {formatCurrency(revenue.averageTicket)}
            </p>
          </div>
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] p-6">
            <p className="text-xs font-medium text-text-muted mb-1">Atendimentos concluídos</p>
            <p className={`text-2xl font-semibold text-text-strong ${mono}`}>
              {revenue.totalCompleted}
            </p>
          </div>
        </div>
      )}

      {/* Revenue by professional */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-text-strong mb-4">Receita por profissional</h2>
        {loading ? (
          <SkeletonTable />
        ) : revenue && revenue.byProfessional.length > 0 ? (
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-border-default">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Nome</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Atendimentos</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Receita (R$)</th>
                </tr>
              </thead>
              <tbody>
                {[...revenue.byProfessional]
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((p) => (
                    <tr key={p.id} className="border-b border-border-default hover:bg-surface-subtle">
                      <td className="px-4 py-3 font-medium text-text-strong">{p.name}</td>
                      <td className={`px-4 py-3 text-right ${mono}`}>{p.count}</td>
                      <td className={`px-4 py-3 text-right ${mono}`}>{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">Nenhum dado disponível para o período selecionado.</p>
          </div>
        )}
      </div>

      {/* Revenue by service */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-text-strong mb-4">Receita por serviço</h2>
        {loading ? (
          <SkeletonTable />
        ) : revenue && revenue.byService.length > 0 ? (
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-border-default">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Serviço</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Atendimentos</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Receita (R$)</th>
                </tr>
              </thead>
              <tbody>
                {[...revenue.byService]
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((s) => (
                    <tr key={s.id} className="border-b border-border-default hover:bg-surface-subtle">
                      <td className="px-4 py-3 font-medium text-text-strong">{s.name}</td>
                      <td className={`px-4 py-3 text-right ${mono}`}>{s.count}</td>
                      <td className={`px-4 py-3 text-right ${mono}`}>{formatCurrency(s.revenue)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">Nenhum dado disponível para o período selecionado.</p>
          </div>
        )}
      </div>

      {/* Earnings / commissions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-text-strong mb-4">Comissões</h2>
        {loading ? (
          <SkeletonTable rows={4} />
        ) : earnings.length > 0 ? (
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-border-default">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Profissional</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Receita total</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Tipo comissão</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Valor comissão</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Comissão (R$)</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Atendimentos</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e) => (
                  <tr key={e.professionalId} className="border-b border-border-default hover:bg-surface-subtle">
                    <td className="px-4 py-3 font-medium text-text-strong">{e.name}</td>
                    <td className={`px-4 py-3 text-right ${mono}`}>{formatCurrency(e.totalRevenue)}</td>
                    <td className="px-4 py-3 text-text-default">
                      {e.commissionType === 'percent' ? 'Percentual' : e.commissionType === 'fixed' ? 'Fixo' : 'Nenhuma'}
                    </td>
                    <td className={`px-4 py-3 text-right ${mono}`}>
                      {e.commissionType === 'percent'
                        ? `${e.commissionValue}%`
                        : e.commissionType === 'fixed'
                          ? formatCurrency(e.commissionValue)
                          : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right ${mono}`}>{formatCurrency(e.commission)}</td>
                    <td className={`px-4 py-3 text-right ${mono}`}>{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">Nenhum dado de comissão disponível para o período selecionado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

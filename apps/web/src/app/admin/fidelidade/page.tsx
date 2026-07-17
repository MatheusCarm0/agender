'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  usageLimitType: 'unlimited' | 'limited';
  usageLimit: number | null;
  serviceIds: string;
  active: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface ClientMembership {
  id: string;
  clientId: string;
  planId: string;
  status: string;
  cycleStart: string;
  cycleEnd: string;
  usageInCycle: number;
  paymentStatus: string;
  client: Client;
  plan: MembershipPlan;
}

const CYCLE_LABELS: Record<string, string> = { monthly: 'Mensal', quarterly: 'Trimestral', yearly: 'Anual' };

export default function FidelityPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<'plans' | 'memberships'>('plans');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '', price: '', billingCycle: 'monthly', usageLimitType: 'unlimited', usageLimit: '',
  });
  const [savingPlan, setSavingPlan] = useState(false);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ clientId: '', planId: '' });
  const [savingMember, setSavingMember] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    const [p, m, c] = await Promise.all([
      api<MembershipPlan[]>('/membership-plans', { token: token! }),
      api<ClientMembership[]>('/client-memberships', { token: token! }),
      api<Client[]>('/clients', { token: token! }),
    ]);
    setPlans(p);
    setMemberships(m);
    setClients(c);
    setLoading(false);
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setSavingPlan(true);
    try {
      await api('/membership-plans', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({
          name: planForm.name,
          price: Number(planForm.price),
          billingCycle: planForm.billingCycle,
          usageLimitType: planForm.usageLimitType,
          usageLimit: planForm.usageLimitType === 'limited' ? Number(planForm.usageLimit) : undefined,
        }),
      });
      setShowPlanForm(false);
      setPlanForm({ name: '', price: '', billingCycle: 'monthly', usageLimitType: 'unlimited', usageLimit: '' });
      addToast('Plano criado com sucesso', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao criar plano', 'error');
    }
    setSavingPlan(false);
  }

  async function handleCreateMembership(e: React.FormEvent) {
    e.preventDefault();
    setSavingMember(true);
    try {
      await api('/client-memberships', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({
          clientId: memberForm.clientId,
          planId: memberForm.planId,
        }),
      });
      setShowMemberForm(false);
      setMemberForm({ clientId: '', planId: '' });
      addToast('Cliente matriculado com sucesso', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao matricular', 'error');
    }
    setSavingMember(false);
  }

  async function updateMembershipStatus(id: string, status: string) {
    await api(`/client-memberships/${id}`, {
      method: 'PATCH',
      token: token!,
      body: JSON.stringify({ status }),
    });
    loadData();
  }

  async function markPaid(id: string) {
    await api(`/client-memberships/${id}`, {
      method: 'PATCH',
      token: token!,
      body: JSON.stringify({ paymentStatus: 'paid', status: 'active' }),
    });
    addToast('Pagamento confirmado', 'success');
    loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Clube de fidelidade</h1>
          <p className="text-xs text-text-muted mt-1">Planos de assinatura e matrículas de clientes.</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-surface-subtle rounded-[var(--radius-sm)] p-1 w-fit">
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${
            tab === 'plans' ? 'bg-surface-card text-text-strong shadow-sm' : 'text-text-muted hover:text-text-default'
          }`}
        >
          Planos
        </button>
        <button
          onClick={() => setTab('memberships')}
          className={`px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${
            tab === 'memberships' ? 'bg-surface-card text-text-strong shadow-sm' : 'text-text-muted hover:text-text-default'
          }`}
        >
          Matrículas
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-12 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />)}
        </div>
      ) : tab === 'plans' ? (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowPlanForm(true)} className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover">
              Criar plano
            </button>
          </div>

          {showPlanForm && (
            <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
              <h2 className="text-base font-semibold text-text-strong mb-4">Novo plano</h2>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="w-48">
                    <label className="block text-xs font-medium text-text-muted mb-1">Nome</label>
                    <input value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Plano Ouro"
                      className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none" />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-text-muted mb-1">Preço (R$)</label>
                    <input type="number" value={planForm.price} onChange={(e) => setPlanForm((f) => ({ ...f, price: e.target.value }))} required min={0} step={0.01}
                      className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none" />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs font-medium text-text-muted mb-1">Ciclo</label>
                    <select value={planForm.billingCycle} onChange={(e) => setPlanForm((f) => ({ ...f, billingCycle: e.target.value }))}
                      className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none">
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                  <div className="w-36">
                    <label className="block text-xs font-medium text-text-muted mb-1">Tipo de uso</label>
                    <select value={planForm.usageLimitType} onChange={(e) => setPlanForm((f) => ({ ...f, usageLimitType: e.target.value }))}
                      className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none">
                      <option value="unlimited">Ilimitado</option>
                      <option value="limited">Limitado</option>
                    </select>
                  </div>
                  {planForm.usageLimitType === 'limited' && (
                    <div className="w-32">
                      <label className="block text-xs font-medium text-text-muted mb-1">Limite/ciclo</label>
                      <input type="number" value={planForm.usageLimit} onChange={(e) => setPlanForm((f) => ({ ...f, usageLimit: e.target.value }))} required min={1}
                        className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingPlan} className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50">
                    {savingPlan ? 'Criando...' : 'Criar'}
                  </button>
                  <button type="button" onClick={() => setShowPlanForm(false)} className="h-9 px-4 border border-border-strong text-text-default text-sm rounded-[var(--radius-sm)] hover:bg-surface-subtle">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {plans.length === 0 ? (
            <div className="text-center py-12">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
              <p className="text-text-muted">Nenhum plano criado.</p>
              <p className="text-xs text-text-subtle mt-1">Crie planos de fidelidade para reter seus clientes.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <div key={p.id} className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-elevation-1)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-strong">{p.name}</h3>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                      p.active ? 'bg-success-bg text-success-text' : 'bg-surface-subtle text-text-muted'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-success-fg' : 'bg-text-subtle'}`} />
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="text-2xl font-semibold text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums mb-1">
                    R$ {Number(p.price).toFixed(2)}
                    <span className="text-xs text-text-muted font-normal ml-1">/{CYCLE_LABELS[p.billingCycle]?.toLowerCase()}</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {p.usageLimitType === 'unlimited' ? 'Uso ilimitado' : `${p.usageLimit} usos por ciclo`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowMemberForm(true)} className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover" disabled={plans.length === 0 || clients.length === 0}>
              Matricular cliente
            </button>
          </div>

          {showMemberForm && (
            <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
              <h2 className="text-base font-semibold text-text-strong mb-4">Nova matrícula</h2>
              <form onSubmit={handleCreateMembership} className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="w-56">
                    <label className="block text-xs font-medium text-text-muted mb-1">Cliente</label>
                    <select value={memberForm.clientId} onChange={(e) => setMemberForm((f) => ({ ...f, clientId: e.target.value }))} required
                      className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none">
                      <option value="">Selecione...</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                    </select>
                  </div>
                  <div className="w-48">
                    <label className="block text-xs font-medium text-text-muted mb-1">Plano</label>
                    <select value={memberForm.planId} onChange={(e) => setMemberForm((f) => ({ ...f, planId: e.target.value }))} required
                      className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none">
                      <option value="">Selecione...</option>
                      {plans.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingMember} className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50">
                    {savingMember ? 'Matriculando...' : 'Matricular'}
                  </button>
                  <button type="button" onClick={() => setShowMemberForm(false)} className="h-9 px-4 border border-border-strong text-text-default text-sm rounded-[var(--radius-sm)] hover:bg-surface-subtle">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {memberships.length === 0 ? (
            <div className="text-center py-12">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <p className="text-text-muted">Nenhuma matrícula ativa.</p>
              <p className="text-xs text-text-subtle mt-1">Matricule clientes em planos de fidelidade.</p>
            </div>
          ) : (
            <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-default">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Plano</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Uso</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Ciclo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Pagamento</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m) => {
                    const statusColors: Record<string, string> = {
                      active: 'bg-success-bg text-success-text',
                      pending: 'bg-warning-bg text-warning-text',
                      suspended: 'bg-surface-subtle text-text-muted',
                      cancelled: 'bg-danger-bg text-danger-text',
                      expired: 'bg-surface-subtle text-text-muted',
                    };
                    const statusLabels: Record<string, string> = {
                      active: 'Ativo', pending: 'Pendente', suspended: 'Suspenso', cancelled: 'Cancelado', expired: 'Expirado',
                    };
                    return (
                      <tr key={m.id} className="border-b border-border-default hover:bg-surface-subtle">
                        <td className="px-4 py-3 font-medium text-text-strong">{m.client.name}</td>
                        <td className="px-4 py-3 text-text-default">{m.plan.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[m.status] || ''}`}>
                            {statusLabels[m.status] || m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">
                          {m.usageInCycle}{m.plan.usageLimitType === 'limited' ? ` / ${m.plan.usageLimit}` : ''}
                        </td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap text-xs">
                          {new Date(m.cycleStart).toLocaleDateString('pt-BR')} — {new Date(m.cycleEnd).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            m.paymentStatus === 'paid' ? 'bg-success-bg text-success-text' : 'bg-warning-bg text-warning-text'
                          }`}>
                            {m.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {m.paymentStatus !== 'paid' && (
                              <button onClick={() => markPaid(m.id)} className="text-xs px-2 py-1 text-success-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]">
                                Confirmar pgto
                              </button>
                            )}
                            {m.status === 'active' && (
                              <button onClick={() => updateMembershipStatus(m.id, 'suspended')} className="text-xs px-2 py-1 text-text-muted hover:bg-surface-subtle rounded-[var(--radius-sm)]">
                                Suspender
                              </button>
                            )}
                            {m.status === 'suspended' && (
                              <button onClick={() => updateMembershipStatus(m.id, 'active')} className="text-xs px-2 py-1 text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)]">
                                Reativar
                              </button>
                            )}
                            {m.status !== 'cancelled' && (
                              <button onClick={() => updateMembershipStatus(m.id, 'cancelled')} className="text-xs px-2 py-1 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]">
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

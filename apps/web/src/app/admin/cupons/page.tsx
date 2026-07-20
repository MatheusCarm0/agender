'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  scope: 'all' | 'service';
  serviceId: string | null;
  maxUses: number | null;
  usedCount: number;
  perClientLimit: number | null;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
}

export default function CouponsPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role !== 'receptionist';
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '',
    scope: 'all' as 'all' | 'service',
    maxUses: '',
    perClientLimit: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api<Coupon[]>('/coupons', { token: token! });
      setCoupons(data);
    } catch {
      toast('Não foi possível carregar os cupons', 'error');
    }
    if (!silent) setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/coupons', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          scope: form.scope,
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          perClientLimit: form.perClientLimit ? Number(form.perClientLimit) : undefined,
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
        }),
      });
      setShowForm(false);
      setForm({ code: '', discountType: 'percent', discountValue: '', scope: 'all', maxUses: '', perClientLimit: '', validFrom: new Date().toISOString().slice(0, 10), validUntil: '' });
      toast('Cupom criado com sucesso', 'success');
      await loadData(true);
    } catch (err: any) {
      toast(err.message || 'Erro ao criar cupom', 'error');
    }
    setSaving(false);
  }

  async function toggleActive(coupon: Coupon) {
    try {
      await api(`/coupons/${coupon.id}`, {
        method: 'PATCH',
        token: token!,
        body: JSON.stringify({ active: !coupon.active }),
      });
      await loadData(true);
    } catch {
      toast('Erro ao alterar status do cupom', 'error');
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/coupons/${deleteTarget}`, { method: 'DELETE', token: token! });
      toast('Cupom removido', 'success');
      await loadData(true);
    } catch {
      toast('Erro ao remover cupom', 'error');
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  function formatDiscount(c: Coupon) {
    if (c.discountType === 'percent') return `${c.discountValue}%`;
    return `R$ ${Number(c.discountValue).toFixed(2)}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Cupons</h1>
          <p className="text-xs text-text-muted mt-1">Crie cupons de desconto para seus clientes.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active"
          >
            Criar cupom
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">Novo cupom</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="w-40">
                <label htmlFor="coupon-code" className="block text-xs font-medium text-text-muted mb-1">Código</label>
                <input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                  placeholder="VOLTA10"
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] uppercase focus:border-primary-default focus:outline-none"
                />
              </div>
              <div className="w-36">
                <label htmlFor="coupon-type" className="block text-xs font-medium text-text-muted mb-1">Tipo</label>
                <select
                  id="coupon-type"
                  value={form.discountType}
                  onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
                >
                  <option value="percent">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div className="w-32">
                <label htmlFor="coupon-discount" className="block text-xs font-medium text-text-muted mb-1">Desconto</label>
                <input
                  id="coupon-discount"
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  required
                  min={0}
                  step={form.discountType === 'percent' ? 1 : 0.01}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="w-40">
                <label htmlFor="coupon-from" className="block text-xs font-medium text-text-muted mb-1">Válido de</label>
                <input
                  id="coupon-from"
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                  required
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
              <div className="w-40">
                <label htmlFor="coupon-until" className="block text-xs font-medium text-text-muted mb-1">Válido até (opcional)</label>
                <input
                  id="coupon-until"
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
              <div className="w-32">
                <label htmlFor="coupon-max" className="block text-xs font-medium text-text-muted mb-1">Usos máx.</label>
                <input
                  id="coupon-max"
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                  placeholder="∞"
                  min={1}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
              <div className="w-32">
                <label htmlFor="coupon-per-client" className="block text-xs font-medium text-text-muted mb-1">Por cliente</label>
                <input
                  id="coupon-per-client"
                  type="number"
                  value={form.perClientLimit}
                  onChange={(e) => setForm((f) => ({ ...f, perClientLimit: e.target.value }))}
                  placeholder="∞"
                  min={1}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="h-9 px-4 border border-border-strong text-text-default text-sm rounded-[var(--radius-sm)] hover:bg-surface-subtle">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
            <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6" />
            <path d="M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2" />
            <path d="M12 4v16" />
            <path d="M2 12h20" />
          </svg>
          <p className="text-text-muted">Nenhum cupom cadastrado.</p>
          <p className="text-xs text-text-subtle mt-1">Crie cupons de desconto para atrair e fidelizar clientes.</p>
          {canEdit && <button
            onClick={() => setShowForm(true)}
            className="mt-3 h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
          >
            Criar primeiro cupom
          </button>}
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Código</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Desconto</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Usos</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Validade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                {canEdit && <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-border-default hover:bg-surface-subtle">
                  <td className="px-4 py-3 font-medium text-text-strong font-[family-name:var(--font-geist-mono)]">{c.code}</td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">{formatDiscount(c)}</td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {c.usedCount}{c.maxUses !== null ? ` / ${c.maxUses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                    {new Date(c.validFrom).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    {c.validUntil ? ` — ${new Date(c.validUntil).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ' — sem limite'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                      c.active ? 'bg-success-bg text-success-text' : 'bg-surface-subtle text-text-muted'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.active ? 'bg-success-fg' : 'bg-text-subtle'}`} />
                      {c.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => toggleActive(c)}
                          className="text-xs px-2 py-1 text-text-muted hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                        >
                          {c.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c.id)}
                          className="text-xs px-2 py-1 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Remover cupom"
        description="Tem certeza que deseja remover este cupom? Clientes não poderão mais utilizá-lo."
        confirmLabel="Remover"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

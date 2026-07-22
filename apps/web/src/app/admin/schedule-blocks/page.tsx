'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCached } from '@/lib/prefetch-cache';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';
import Link from 'next/link';

interface Professional {
  id: string;
  name: string;
}

interface ScheduleBlock {
  id: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  professional: { name: string };
}

export default function ScheduleBlocksPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role !== 'receptionist';
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ professionalId: '', startAt: '', endAt: '', reason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    const cached = getCached<ScheduleBlock[]>('/schedule-blocks');
    if (cached) { setBlocks(cached); setLoading(false); }
    loadData(!!cached);
  }, [token]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [b, p] = await Promise.all([
        api<ScheduleBlock[]>('/schedule-blocks', { token: token! }),
        api<Professional[]>('/professionals', { token: token! }),
      ]);
      setBlocks(b);
      setProfessionals(p);
    } catch {
      toast('Não foi possível carregar os bloqueios', 'error');
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/schedule-blocks', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({
          ...(form.professionalId ? { professionalId: form.professionalId } : {}),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          ...(form.reason ? { reason: form.reason } : {}),
        }),
      });
      toast('Bloqueio criado');
      setShowForm(false);
      loadData();
    } catch {
      toast('Erro ao criar bloqueio', 'error');
    }
    setSaving(false);
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/schedule-blocks/${deleteTarget}`, { method: 'DELETE', token: token! });
      toast('Bloqueio removido');
      loadData();
    } catch {
      toast('Erro ao remover bloqueio', 'error');
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Bloqueios</h1>
          <p className="text-xs text-text-muted mt-1">Bloqueie períodos para impedir agendamentos.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active"
          >
            Adicionar
          </button>
        )}
      </div>

      <div className="flex gap-0 border-b border-border-default mb-6" role="tablist">
        <span
          role="tab"
          aria-selected="true"
          className="px-4 py-2.5 text-sm font-medium text-primary-default border-b-2 border-primary-default -mb-px cursor-default"
        >
          Pontuais
        </span>
        <Link
          href="/admin/recurring-blocks"
          role="tab"
          aria-selected="false"
          className="px-4 py-2.5 text-sm text-text-muted hover:text-text-default -mb-px border-b-2 border-transparent"
        >
          Recorrentes
        </Link>
      </div>

      {showForm && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">Novo bloqueio</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="w-52">
                <label htmlFor="sb-prof" className="block text-xs font-medium text-text-muted mb-1">Profissional</label>
                <select
                  id="sb-prof"
                  value={form.professionalId}
                  onChange={(e) => setForm((f) => ({ ...f, professionalId: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
                >
                  <option value="">Negócio inteiro</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-52">
                <label htmlFor="sb-start" className="block text-xs font-medium text-text-muted mb-1">Início</label>
                <input
                  id="sb-start"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                  required
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
              <div className="w-52">
                <label htmlFor="sb-end" className="block text-xs font-medium text-text-muted mb-1">Fim</label>
                <input
                  id="sb-end"
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                  required
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="sb-reason" className="block text-xs font-medium text-text-muted mb-1">Motivo (opcional)</label>
              <input
                id="sb-reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ex: férias, consulta médica"
                className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-9 px-4 border border-border-strong text-text-default text-sm rounded-[var(--radius-sm)] hover:bg-surface-subtle"
              >
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
      ) : blocks.length === 0 ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l14.14 14.14" />
          </svg>
          <p className="text-text-muted">Nenhum bloqueio pontual cadastrado.</p>
          <p className="text-xs text-text-subtle mt-1">Bloqueios pontuais impedem agendamentos em datas específicas.</p>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
            >
              Criar primeiro bloqueio
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Profissional</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Início</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Fim</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Motivo</th>
                {canEdit && <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id} className="border-b border-border-default hover:bg-surface-subtle">
                  <td className="px-4 py-3 font-medium text-text-strong">{b.professional?.name || 'Negócio inteiro'}</td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums whitespace-nowrap">
                    {new Date(b.startAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums whitespace-nowrap">
                    {new Date(b.endAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{b.reason || '—'}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(b.id)}
                        className="text-xs px-2 py-1 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                      >
                        Remover
                      </button>
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
        title="Remover bloqueio"
        description="Tem certeza que deseja remover este bloqueio? Os horários ficarão disponíveis para agendamento."
        confirmLabel="Remover"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

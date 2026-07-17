'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/confirm-modal';

interface Professional {
  id: string;
  name: string;
}

interface RecurringBlock {
  id: string;
  professionalId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  reason: string | null;
}

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function RecurringBlocksPage() {
  const { token } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [blocks, setBlocks] = useState<RecurringBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    professionalId: '',
    weekday: '1',
    startTime: '12:00',
    endTime: '13:00',
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    const [p, b] = await Promise.all([
      api<Professional[]>('/professionals', { token: token! }),
      api<RecurringBlock[]>('/recurring-blocks', { token: token! }),
    ]);
    setProfessionals(p);
    setBlocks(b);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await api('/recurring-blocks', {
      method: 'POST',
      token: token!,
      body: JSON.stringify({
        professionalId: form.professionalId || undefined,
        weekday: Number(form.weekday),
        startTime: form.startTime,
        endTime: form.endTime,
        reason: form.reason || undefined,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ professionalId: '', weekday: '1', startTime: '12:00', endTime: '13:00', reason: '' });
    loadData();
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await api(`/recurring-blocks/${deleteTarget}`, { method: 'DELETE', token: token! });
    setDeleteTarget(null);
    setDeleting(false);
    loadData();
  }

  function getProfName(id: string | null) {
    if (!id) return 'Todos';
    return professionals.find((p) => p.id === id)?.name || '—';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Bloqueios recorrentes</h1>
          <p className="text-xs text-text-muted mt-1">Almoço, folgas semanais e bloqueios que se repetem toda semana.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active"
        >
          Adicionar
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">Novo bloqueio recorrente</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="w-48">
                <label className="block text-xs font-medium text-text-muted mb-1">Profissional</label>
                <select
                  value={form.professionalId}
                  onChange={(e) => setForm((f) => ({ ...f, professionalId: e.target.value }))}
                  className="w-full h-9 px-3 pr-8 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
                >
                  <option value="">Todos (negócio inteiro)</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-text-muted mb-1">Dia da semana</label>
                <select
                  value={form.weekday}
                  onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
                >
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-text-muted mb-1">Início</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  required
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-text-muted mb-1">Fim</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  required
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Motivo (opcional)</label>
              <input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ex: Almoço, Folga"
                className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
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
            <path d="M17 2.1l4 4-4 4" />
            <path d="M3 12.2v-2a4 4 0 014-4h12.8" />
            <path d="M7 21.9l-4-4 4-4" />
            <path d="M21 11.8v2a4 4 0 01-4 4H4.2" />
          </svg>
          <p className="text-text-muted">Nenhum bloqueio recorrente configurado.</p>
          <p className="text-xs text-text-subtle mt-1">Adicione bloqueios como almoço ou folgas semanais.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
          >
            Criar primeiro bloqueio
          </button>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Profissional</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Dia</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Início</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Fim</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Motivo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id} className="border-b border-border-default hover:bg-surface-subtle">
                  <td className="px-4 py-3 font-medium text-text-strong">{getProfName(b.professionalId)}</td>
                  <td className="px-4 py-3">{DAYS[b.weekday]}</td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">{b.startTime}</td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">{b.endTime}</td>
                  <td className="px-4 py-3 text-text-muted">{b.reason || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(b.id)}
                      className="text-xs px-2 py-1 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Remover bloqueio recorrente"
        description="Tem certeza que deseja remover este bloqueio recorrente? Os horários ficarão disponíveis para agendamento toda semana."
        confirmLabel="Remover"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

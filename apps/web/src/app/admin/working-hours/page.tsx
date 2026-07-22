'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCached } from '@/lib/prefetch-cache';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';

interface Professional {
  id: string;
  name: string;
}

interface WorkingHour {
  id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function WorkingHoursPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role !== 'receptionist';
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weekday: '1', startTime: '09:00', endTime: '18:00' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    const cached = getCached<Professional[]>('/professionals');
    if (cached) {
      setProfessionals(cached);
      if (cached.length > 0) setSelectedProfId(cached[0].id);
      setLoading(false);
    }
    api<Professional[]>('/professionals', { token })
      .then((data) => {
        setProfessionals(data);
        if (!cached && data.length > 0) setSelectedProfId(data[0].id);
      })
      .catch(() => toast('Não foi possível carregar os profissionais', 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedProfId) return;
    loadHours();
  }, [token, selectedProfId]);

  async function loadHours() {
    try {
      const data = await api<WorkingHour[]>(`/working-hours?professionalId=${selectedProfId}`, { token: token! });
      setHours(data);
    } catch {
      toast('Não foi possível carregar os horários', 'error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/working-hours', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({
          professionalId: selectedProfId,
          weekday: Number(form.weekday),
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });
      toast('Horário adicionado');
      setShowForm(false);
      loadHours();
    } catch {
      toast('Erro ao salvar horário', 'error');
    }
    setSaving(false);
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/working-hours/${deleteTarget}`, { method: 'DELETE', token: token! });
      toast('Horário removido');
      loadHours();
    } catch {
      toast('Erro ao remover horário', 'error');
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Horários de trabalho</h1>
          <p className="text-xs text-text-muted mt-1">Defina os dias e horários de atendimento de cada profissional.</p>
        </div>
        {canEdit && selectedProfId && (
          <button
            onClick={() => setShowForm(true)}
            className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active"
          >
            Adicionar
          </button>
        )}
      </div>

      {professionals.length > 1 && (
        <div className="mb-4">
          <label htmlFor="wh-prof" className="block text-xs font-medium text-text-muted mb-1">Profissional</label>
          <select
            id="wh-prof"
            value={selectedProfId}
            onChange={(e) => setSelectedProfId(e.target.value)}
            className="h-9 px-3 pr-8 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {showForm && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">Novo horário</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="w-40">
                <label htmlFor="wh-weekday" className="block text-xs font-medium text-text-muted mb-1">Dia da semana</label>
                <select
                  id="wh-weekday"
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
                <label htmlFor="wh-start" className="block text-xs font-medium text-text-muted mb-1">Início</label>
                <input
                  id="wh-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  required
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
              <div className="w-32">
                <label htmlFor="wh-end" className="block text-xs font-medium text-text-muted mb-1">Fim</label>
                <input
                  id="wh-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  required
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none"
                />
              </div>
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
      ) : !selectedProfId ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          <p className="text-text-muted">Cadastre um profissional primeiro.</p>
          <p className="text-xs text-text-subtle mt-1">É necessário ter ao menos um profissional para configurar horários.</p>
        </div>
      ) : hours.length === 0 ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <p className="text-text-muted">Nenhum horário configurado.</p>
          <p className="text-xs text-text-subtle mt-1">Adicione os dias e horários em que este profissional atende.</p>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
            >
              Adicionar horário
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Dia</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Início</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Fim</th>
                {canEdit && <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {hours
                .sort((a, b) => a.weekday - b.weekday)
                .map((h) => (
                  <tr key={h.id} className="border-b border-border-default hover:bg-surface-subtle">
                    <td className="px-4 py-3 font-medium text-text-strong">{DAYS[h.weekday]}</td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">{h.startTime}</td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">{h.endTime}</td>
                    {canEdit && <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(h.id)}
                        className="text-xs px-2 py-1 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                      >
                        Remover
                      </button>
                    </td>}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Remover horário"
        description="Tem certeza que deseja remover este horário de trabalho? Isso pode afetar a disponibilidade do profissional."
        confirmLabel="Remover"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

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

const DAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

export default function WorkingHoursPage() {
  const { token } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weekday: '1', startTime: '09:00', endTime: '18:00' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<Professional[]>('/professionals', { token })
      .then((data) => {
        setProfessionals(data);
        if (data.length > 0) setSelectedProfId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedProfId) return;
    loadHours();
  }, [token, selectedProfId]);

  async function loadHours() {
    const data = await api<WorkingHour[]>(`/working-hours?professionalId=${selectedProfId}`, { token: token! });
    setHours(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
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
    setSaving(false);
    setShowForm(false);
    loadHours();
  }

  async function handleDelete(id: string) {
    await api(`/working-hours/${id}`, { method: 'DELETE', token: token! });
    loadHours();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-strong">Horarios de trabalho</h1>
        {selectedProfId && (
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
          <label className="block text-xs font-medium text-text-muted mb-1">Profissional</label>
          <select
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
          <h2 className="text-base font-semibold text-text-strong mb-4">Novo horario</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 flex-wrap">
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
                <label className="block text-xs font-medium text-text-muted mb-1">Inicio</label>
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
          <p className="text-text-muted">Cadastre um profissional primeiro.</p>
        </div>
      ) : hours.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted">Nenhum horario configurado.</p>
          <p className="text-xs text-text-subtle mt-1">Adicione os dias e horarios em que este profissional atende.</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Dia</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Inicio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Fim</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {hours
                .sort((a, b) => a.weekday - b.weekday)
                .map((h) => (
                  <tr key={h.id} className="border-b border-border-default hover:bg-surface-subtle">
                    <td className="px-4 py-3 font-medium text-text-strong">{DAYS[h.weekday]}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">{h.startTime}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">{h.endTime}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(h.id)}
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
    </div>
  );
}

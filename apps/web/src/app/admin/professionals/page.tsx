'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface Professional {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  active: boolean;
}

export default function ProfessionalsPage() {
  const { token } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    const data = await api<Professional[]>('/professionals', { token: token! });
    setProfessionals(data);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', bio: '' });
    setShowForm(true);
  }

  function openEdit(p: Professional) {
    setEditingId(p.id);
    setForm({ name: p.name, bio: p.bio || '' });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = JSON.stringify({
      name: form.name,
      ...(form.bio ? { bio: form.bio } : {}),
    });

    if (editingId) {
      await api(`/professionals/${editingId}`, { method: 'PATCH', token: token!, body });
    } else {
      await api('/professionals', { method: 'POST', token: token!, body });
    }
    setSaving(false);
    setShowForm(false);
    loadData();
  }

  async function toggleActive(p: Professional) {
    await api(`/professionals/${p.id}`, {
      method: 'PATCH',
      token: token!,
      body: JSON.stringify({ active: !p.active }),
    });
    loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-strong">Profissionais</h1>
        <button
          onClick={openCreate}
          className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active"
        >
          Adicionar
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">
            {editingId ? 'Editar profissional' : 'Novo profissional'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                minLength={2}
                className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Bio (opcional)</label>
              <input
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Ex: Especialista em cortes modernos"
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
            <div key={i} className="h-14 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      ) : professionals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted">Nenhum profissional cadastrado.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
          >
            Cadastrar primeiro profissional
          </button>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Bio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((p) => (
                <tr key={p.id} className="border-b border-border-default hover:bg-surface-subtle">
                  <td className="px-4 py-3 font-medium text-text-strong">{p.name}</td>
                  <td className="px-4 py-3 text-text-muted">{p.bio || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                      p.active
                        ? 'bg-success-bg text-success-text'
                        : 'bg-surface-subtle text-text-muted'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-success-fg' : 'bg-text-subtle'}`} />
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs px-2 py-1 text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className="text-xs px-2 py-1 text-text-muted hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                      >
                        {p.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
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

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: string;
  active: boolean;
}

interface Professional {
  id: string;
  name: string;
}

export default function ServicesPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', durationMin: '30', price: '' });
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        api<Service[]>('/services', { token: token! }),
        api<Professional[]>('/professionals', { token: token! }),
      ]);
      setServices(s);
      setProfessionals(p);
    } catch {
      toast('Não foi possível carregar os serviços', 'error');
    }
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', durationMin: '30', price: '' });
    setSelectedProfessionals([]);
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      durationMin: String(s.durationMin),
      price: String(Number(s.price)),
    });
    setSelectedProfessionals([]);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = JSON.stringify({
      name: form.name,
      durationMin: Number(form.durationMin),
      price: Number(form.price),
    });

    try {
      if (editingId) {
        await api(`/services/${editingId}`, { method: 'PATCH', token: token!, body });
        toast('Serviço atualizado');
      } else {
        const created = await api<Service>('/services', { method: 'POST', token: token!, body });
        for (const profId of selectedProfessionals) {
          await api(`/services/${created.id}/professionals`, {
            method: 'POST',
            token: token!,
            body: JSON.stringify({ professionalId: profId }),
          });
        }
        toast('Serviço criado com sucesso');
      }
      setShowForm(false);
      loadData();
    } catch {
      toast('Erro ao salvar serviço', 'error');
    }
    setSaving(false);
  }

  const [search, setSearch] = useState('');

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Serviços</h1>
          <p className="text-xs text-text-muted mt-1">Cadastre os serviços oferecidos pelo seu negócio.</p>
        </div>
        <button
          onClick={openCreate}
          className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active"
        >
          Adicionar
        </button>
      </div>

      {services.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20"
          />
        </div>
      )}

      {showForm && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">
            {editingId ? 'Editar serviço' : 'Novo serviço'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="svc-name" className="block text-xs font-medium text-text-muted mb-1">Nome</label>
              <input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              />
            </div>
            <div className="flex gap-4">
              <div className="w-40">
                <label htmlFor="svc-duration" className="block text-xs font-medium text-text-muted mb-1">Duração (min)</label>
                <input
                  id="svc-duration"
                  type="number"
                  value={form.durationMin}
                  onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
                  required
                  min={5}
                  step={5}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                />
              </div>
              <div className="w-40">
                <label htmlFor="svc-price" className="block text-xs font-medium text-text-muted mb-1">Preço (R$)</label>
                <input
                  id="svc-price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                  min={0}
                  step={0.01}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                />
              </div>
            </div>
            {!editingId && professionals.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Profissionais que realizam</label>
                <div className="flex flex-wrap gap-2">
                  {professionals.map((p) => {
                    const selected = selectedProfessionals.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setSelectedProfessionals((prev) =>
                            selected ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                          )
                        }
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          selected
                            ? 'bg-primary-tint-bg border-primary-tint-border text-primary-tint-text'
                            : 'border-border-default text-text-muted hover:bg-surface-subtle'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
      ) : filteredServices.length === 0 && search ? (
        <div className="text-center py-12">
          <p className="text-text-muted">Nenhum serviço encontrado para "{search}".</p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
            <circle cx="6" cy="6" r="3" />
            <path d="M8.12 8.12L12 12" />
            <path d="M20 4L8.12 15.88" />
            <circle cx="6" cy="18" r="3" />
            <path d="M14.8 14.8L20 20" />
          </svg>
          <p className="text-text-muted">Nenhum serviço cadastrado.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
          >
            Criar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Nome</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Duração</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Preço</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((s) => (
                <tr key={s.id} className="border-b border-border-default hover:bg-surface-subtle">
                  <td className="px-4 py-3 font-medium text-text-strong">{s.name}</td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {s.durationMin} min
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">
                    R$ {Number(s.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                      s.active
                        ? 'bg-success-bg text-success-text'
                        : 'bg-surface-subtle text-text-muted'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-success-fg' : 'bg-text-subtle'}`} />
                      {s.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs px-2 py-1 text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                    >
                      Editar
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

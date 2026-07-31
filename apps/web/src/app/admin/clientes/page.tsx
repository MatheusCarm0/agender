'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCached } from '@/lib/prefetch-cache';
import { useToast } from '@/components/toast';
import { formatBRL, formatPhone } from '@/lib/format';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
}

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  price: string;
  service: { name: string };
  professional: { name: string };
}

interface ClientDetail extends Client {
  appointments: Appointment[];
}

interface PaginatedResult {
  data: Client[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

export default function ClientsPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role !== 'receptionist';
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    if (!token) return;
    loadClients();
  }, [token, page, debouncedSearch]);

  async function loadClients() {
    // No view padrão (1ª página, sem busca) pinta do cache pré-carregado no hover.
    const isDefaultView = page === 1 && !debouncedSearch;
    const cached = isDefaultView ? getCached<PaginatedResult>('/clients?page=1&limit=20') : null;
    if (cached) {
      setClients(cached.data);
      setTotalPages(cached.totalPages);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const data = await api<PaginatedResult>(`/clients?${params}`, { token: token! });
      setClients(data.data);
      setTotalPages(data.totalPages);
    } catch {
      toast('Não foi possível carregar os clientes', 'error');
    }
    setLoading(false);
  }

  async function openDetail(id: string) {
    setLoadingDetail(true);
    setEditing(false);
    try {
      const data = await api<ClientDetail>(`/clients/${id}`, { token: token! });
      setSelectedClient(data);
    } catch {
      toast('Não foi possível carregar os detalhes do cliente', 'error');
    }
    setLoadingDetail(false);
  }

  function startEdit() {
    if (!selectedClient) return;
    setEditForm({
      name: selectedClient.name,
      phone: selectedClient.phone,
      notes: selectedClient.notes || '',
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!selectedClient) return;
    setSaving(true);
    try {
      await api(`/clients/${selectedClient.id}`, {
        method: 'PATCH',
        token: token!,
        body: JSON.stringify(editForm),
      });
      toast('Cliente atualizado');
      setEditing(false);
      openDetail(selectedClient.id);
      loadClients();
    } catch {
      toast('Erro ao salvar cliente', 'error');
    }
    setSaving(false);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className={selectedClient ? 'flex-1 min-w-0' : 'w-full'}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-strong">Clientes</h1>
            <p className="text-xs text-text-muted mt-1">Base de clientes que agendaram pelo seu link.</p>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-muted">
              {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-default">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Telefone</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">E-mail</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr
                      key={c.id}
                      className={`border-b border-border-default hover:bg-surface-subtle cursor-pointer ${
                        selectedClient?.id === c.id ? 'bg-surface-subtle' : ''
                      }`}
                      onClick={() => openDetail(c.id)}
                    >
                      <td className="px-4 py-3 font-medium text-text-strong">{c.name}</td>
                      <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">{formatPhone(c.phone)}</td>
                      <td className="px-4 py-3 text-text-muted">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetail(c.id); }}
                          className="text-xs inline-flex items-center min-h-[36px] px-2.5 text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] hover:bg-surface-subtle disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-text-muted">
                  {page} de {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] hover:bg-surface-subtle disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedClient && (
        <div className="w-full lg:w-96 shrink-0 bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] p-6 h-fit sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-strong">Detalhes do cliente</h2>
            <button
              onClick={() => setSelectedClient(null)}
              className="text-text-muted hover:text-text-strong text-sm"
            >
              Fechar
            </button>
          </div>

          {loadingDetail ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-surface-subtle rounded animate-pulse" />
              ))}
            </div>
          ) : editing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="client-name" className="block text-xs font-medium text-text-muted mb-1">Nome</label>
                <input
                  id="client-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="client-phone" className="block text-xs font-medium text-text-muted mb-1">Telefone</label>
                <input
                  id="client-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="client-notes" className="block text-xs font-medium text-text-muted mb-1">Notas</label>
                <textarea
                  id="client-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="h-9 px-4 border border-border-strong text-text-default text-sm rounded-[var(--radius-sm)] hover:bg-surface-subtle"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                <div>
                  <span className="text-xs text-text-muted">Nome</span>
                  <p className="text-sm font-medium text-text-strong">{selectedClient.name}</p>
                </div>
                <div>
                  <span className="text-xs text-text-muted">Telefone</span>
                  <p className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums">{formatPhone(selectedClient.phone)}</p>
                </div>
                <div>
                  <span className="text-xs text-text-muted">E-mail</span>
                  <p className="text-sm text-text-default">{selectedClient.email || '—'}</p>
                </div>
                {selectedClient.notes && (
                  <div>
                    <span className="text-xs text-text-muted">Notas</span>
                    <p className="text-sm text-text-default">{selectedClient.notes}</p>
                  </div>
                )}
                {canEdit && (
                  <button
                    onClick={startEdit}
                    className="text-xs inline-flex items-center min-h-[36px] px-2.5 text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                  >
                    Editar
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-xs font-medium text-text-muted mb-3">Histórico de agendamentos</h3>
                {selectedClient.appointments?.length === 0 ? (
                  <p className="text-xs text-text-subtle">Nenhum agendamento.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedClient.appointments?.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 border border-border-default rounded-[var(--radius-sm)] text-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-text-strong">{a.service.name}</p>
                            <p className="text-text-muted">{a.professional.name}</p>
                          </div>
                          <span className="text-text-muted">{STATUS_LABELS[a.status] || a.status}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-text-muted font-[family-name:var(--font-geist-mono)] tabular-nums">
                            {new Date(a.startAt).toLocaleDateString('pt-BR')} {new Date(a.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                            {formatBRL(a.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

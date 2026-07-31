'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCached } from '@/lib/prefetch-cache';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  professionalId: string | null;
  professional: { id: string; name: string } | null;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  professionalId: string | null;
  expiresAt: string;
  createdAt: string;
}

interface Professional {
  id: string;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  professional: 'Profissional',
  receptionist: 'Recepcionista',
};

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: 'bg-[#F0FDFA] text-[#115E59]',
    admin: 'bg-[#EFF6FF] text-[#1D4ED8]',
    professional: 'bg-[#F0FDF4] text-[#15803D]',
    receptionist: 'bg-[#FFFBEB] text-[#B45309]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || 'bg-surface-subtle text-text-muted'}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function StatusBadge({ active, pending }: { active?: boolean; pending?: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#B45309]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
        Convidado
      </span>
    );
  }
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#15803D]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
        Ativo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F5F5F4] text-[#78716C]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#A8A29E]" />
      Inativo
    </span>
  );
}

export default function EquipePage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'professional' as string, professionalId: '' });
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    const cached = getCached<{ users: StaffUser[]; pendingInvites: PendingInvite[] }>('/staff');
    if (cached) { setUsers(cached.users); setInvites(cached.pendingInvites); setLoading(false); }
    loadData(!!cached);
    loadProfessionals();
  }, [token]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api<{ users: StaffUser[]; pendingInvites: PendingInvite[] }>('/staff', { token: token! });
      setUsers(data.users);
      setInvites(data.pendingInvites);
    } catch {
      toast('Não foi possível carregar a equipe', 'error');
    }
    if (!silent) setLoading(false);
  }

  async function loadProfessionals() {
    try {
      const data = await api<Professional[]>('/professionals', { token: token! });
      setProfessionals(data);
    } catch {
      // ignore
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ id: string; token: string }>('/staff/invites', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
          professionalId: inviteForm.role === 'professional' ? inviteForm.professionalId || undefined : undefined,
        }),
      });
      const link = `${window.location.origin}/convite/${res.token}`;
      setInviteLink(link);
      setLinkCopied(false);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'professional', professionalId: '' });
      await loadData(true);
    } catch (err: any) {
      toast(err.message || 'Erro ao enviar convite', 'error');
    }
    setSaving(false);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    toast('Link copiado', 'success');
  }

  async function handleRevokeInvite(id: string) {
    try {
      await api(`/staff/invites/${id}`, { method: 'DELETE', token: token! });
      toast('Convite revogado', 'success');
      await loadData(true);
    } catch (err: any) {
      toast(err.message || 'Erro ao revogar convite', 'error');
    }
  }

  async function handleDeactivate(userId: string) {
    try {
      await api(`/staff/${userId}/deactivate`, { method: 'PATCH', token: token! });
      toast('Acesso desativado', 'success');
      await loadData(true);
    } catch (err: any) {
      toast(err.message || 'Erro ao desativar', 'error');
    }
  }

  async function handleReactivate(userId: string) {
    try {
      await api(`/staff/${userId}/reactivate`, { method: 'PATCH', token: token! });
      toast('Acesso reativado', 'success');
      await loadData(true);
    } catch (err: any) {
      toast(err.message || 'Erro ao reativar', 'error');
    }
  }

  const linkedProfessionalIds = users.filter(u => u.active && u.professionalId).map(u => u.professionalId);
  const availableProfessionals = professionals.filter(p => !linkedProfessionalIds.includes(p.id));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-surface-subtle rounded animate-pulse" />
        <div className="h-64 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Equipe</h1>
          <p className="text-xs text-text-muted mt-1">Convide e gerencie quem tem acesso ao painel do seu negócio.</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors"
        >
          Convidar
        </button>
      </div>

      {/* Active users table */}
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-3">E-mail</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Papel</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Profissional</th>
                <th className="text-right text-xs font-medium text-text-muted px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border-default last:border-0 hover:bg-surface-subtle transition-colors">
                  <td className="px-4 py-3 text-sm text-text-strong font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-text-default">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3"><StatusBadge active={u.active} /></td>
                  <td className="px-4 py-3 text-sm text-text-default">{u.professional?.name || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'owner' && (
                      <div className="flex items-center justify-end gap-1">
                        {u.active ? (
                          <button
                            onClick={() => setConfirmAction({
                              title: 'Desativar acesso',
                              description: `Deseja desativar o acesso de ${u.name}? A sessão será encerrada imediatamente.`,
                              onConfirm: () => handleDeactivate(u.id),
                            })}
                            className="px-2 py-1 text-xs text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)] transition-colors"
                          >
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(u.id)}
                            className="px-2 py-1 text-xs text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)] transition-colors"
                          >
                            Reativar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                    Nenhum membro na equipe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-strong mb-3">Convites pendentes</h2>
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-default">
                    <th className="text-left text-xs font-medium text-text-muted px-4 py-3">E-mail</th>
                    <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Papel</th>
                    <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Expira em</th>
                    <th className="text-right text-xs font-medium text-text-muted px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b border-border-default last:border-0 hover:bg-surface-subtle transition-colors">
                      <td className="px-4 py-3 text-sm text-text-default">{inv.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                      <td className="px-4 py-3 text-sm text-text-muted font-mono tabular-nums">
                        {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmAction({
                            title: 'Revogar convite',
                            description: `Deseja revogar o convite para ${inv.email}?`,
                            onConfirm: () => handleRevokeInvite(inv.id),
                          })}
                          className="px-2 py-1 text-xs text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)] transition-colors"
                        >
                          Revogar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/45" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-surface-card border border-border-default rounded-[var(--radius-lg)] shadow-[var(--shadow-elevation-3)] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-text-strong">Convidar membro</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-text-muted hover:text-text-strong transition-colors"
                aria-label="Fechar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-default placeholder:text-text-subtle focus:outline-none focus:border-primary-default focus:ring-1 focus:ring-primary-default"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Papel</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-default focus:outline-none focus:border-primary-default focus:ring-1 focus:ring-primary-default"
                >
                  <option value="professional">Profissional</option>
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {inviteForm.role === 'professional' && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Vincular profissional</label>
                  <select
                    value={inviteForm.professionalId}
                    onChange={(e) => setInviteForm({ ...inviteForm, professionalId: e.target.value })}
                    required
                    className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-default focus:outline-none focus:border-primary-default focus:ring-1 focus:ring-primary-default"
                  >
                    <option value="">Selecione...</option>
                    {availableProfessionals.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="h-9 px-4 text-sm font-medium text-text-strong border border-border-strong rounded-[var(--radius-sm)] hover:bg-surface-subtle transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 text-sm font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {saving ? 'Enviando...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite link modal */}
      {inviteLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/45" onClick={() => setInviteLink('')} />
          <div className="relative bg-surface-card border border-border-default rounded-[var(--radius-lg)] shadow-[var(--shadow-elevation-3)] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-strong">Convite criado</h3>
              <button
                onClick={() => setInviteLink('')}
                className="text-text-muted hover:text-text-strong transition-colors"
                aria-label="Fechar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-text-default mb-4">
              Envie este link para a pessoa convidada. O link expira em 48 horas.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-subtle text-text-default font-mono truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyLink}
                className="h-9 px-4 text-sm font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors whitespace-nowrap"
              >
                {linkCopied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          open={true}
          title={confirmAction.title}
          description={confirmAction.description}
          confirmLabel="Confirmar"
          variant="danger"
          onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

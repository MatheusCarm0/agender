'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCached, invalidateCache } from '@/lib/prefetch-cache';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  price: string;
  professional: { name: string };
  service: { name: string };
  client: { name: string; phone: string };
}

const STATUS_MAP: Record<string, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  scheduled: { label: 'Agendado', dotClass: 'bg-status-scheduled-dot', bgClass: 'bg-status-scheduled-bg', textClass: 'text-status-scheduled-text' },
  confirmed: { label: 'Confirmado', dotClass: 'bg-status-confirmed-dot', bgClass: 'bg-status-confirmed-bg', textClass: 'text-status-confirmed-text' },
  completed: { label: 'Concluído', dotClass: 'bg-status-completed-dot', bgClass: 'bg-status-completed-bg', textClass: 'text-status-completed-text' },
  cancelled: { label: 'Cancelado', dotClass: 'bg-status-cancelled-dot', bgClass: 'bg-status-cancelled-bg', textClass: 'text-status-cancelled-text' },
  no_show: { label: 'Não compareceu', dotClass: 'bg-status-noshow-dot', bgClass: 'bg-status-noshow-bg', textClass: 'text-status-noshow-text' },
};

interface OnboardingStatus {
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  pendingItems: string[];
  completed: boolean;
}

const CHECKLIST_ITEMS: Record<string, { label: string; href: string }> = {
  logo: { label: 'Adicione sua logo', href: '/admin/customization' },
  service: { label: 'Crie seu primeiro serviço', href: '/admin/services' },
  working_hours: { label: 'Defina seus horários', href: '/admin/working-hours' },
  team: { label: 'Convide sua equipe', href: '/admin/equipe' },
};

function OnboardingChecklist({ token }: { token: string }) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const router = useRouter();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api<OnboardingStatus>('/onboarding/status', { token });
      setStatus(res);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  if (!status || status.completed || status.pendingItems.length === 0) return null;

  async function dismiss(item: string) {
    try {
      const res = await api<OnboardingStatus>('/onboarding/dismiss', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ item }),
      });
      setStatus(res);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mb-6 bg-surface-card border border-border-default rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-elevation-1)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-strong">Complete a configuração</h3>
        <span className="text-xs text-text-muted">{status.pendingItems.length} pendente{status.pendingItems.length > 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {status.pendingItems.map((item) => {
          const info = CHECKLIST_ITEMS[item];
          if (!info) return null;
          return (
            <div key={item} className="flex items-center justify-between py-1.5">
              <Link href={info.href} className="text-sm text-primary-default hover:text-primary-hover font-medium">
                {info.label}
              </Link>
              <button
                onClick={() => dismiss(item)}
                className="text-text-subtle hover:text-text-muted p-1"
                aria-label={`Dispensar "${info.label}"`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<string | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const cached = getCached<Appointment[]>('/appointments');
    if (cached) {
      setAppointments(cached);
      setLoading(false);
    }
    setError(false);
    api<Appointment[]>('/appointments', { token })
      .then((data) => {
        setAppointments(data);
        invalidateCache('/appointments');
      })
      .catch(() => {
        if (!cached) {
          setError(true);
          toast('Não foi possível carregar os agendamentos', 'error');
        }
      })
      .finally(() => setLoading(false));
  }, [token, toast]);

  async function updateStatus(id: string, status: string) {
    try {
      await api(`/appointments/${id}`, {
        method: 'PATCH',
        token: token!,
        body: JSON.stringify({ status }),
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
      const labels: Record<string, string> = {
        confirmed: 'Agendamento confirmado',
        completed: 'Agendamento concluído',
        cancelled: 'Agendamento cancelado',
        no_show: 'Marcado como não compareceu',
      };
      toast(labels[status] || 'Status atualizado');
    } catch {
      toast('Erro ao atualizar status', 'error');
    }
  }

  const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const todayAppts = appointments.filter((a) => { const d = new Date(a.startAt); return d >= todayStart && d <= todayEnd; });
  const activeToday = todayAppts.filter((a) => a.status !== 'cancelled');
  const completedToday = todayAppts.filter((a) => a.status === 'completed');
  const revenueToday = activeToday.reduce((sum, a) => sum + Number(a.price), 0);
  const totalActive = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed');
  const noShowCount = appointments.filter((a) => a.status === 'no_show').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const noShowRate = (completedCount + noShowCount) > 0 ? Math.round((noShowCount / (completedCount + noShowCount)) * 100) : 0;

  return (
    <div>
      {token && <OnboardingChecklist token={token} />}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-strong">
          {user?.role === 'professional' ? 'Minha agenda' : 'Agenda'}
        </h1>
        <p className="text-xs text-text-muted mt-1">
          {user?.role === 'professional' ? 'Seus agendamentos aparecem aqui.' : 'Acompanhe e gerencie todos os agendamentos.'}
        </p>
      </div>

      {!loading && !error && appointments.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-elevation-1)]">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-default"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Hoje</span>
            </div>
            <p className="text-2xl font-bold text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums">{activeToday.length}</p>
            <p className="text-[11px] text-text-subtle mt-0.5">{completedToday.length} concluído{completedToday.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-elevation-1)]">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-fg"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Receita hoje</span>
            </div>
            <p className="text-2xl font-bold text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums">R$ {revenueToday.toFixed(0)}</p>
            <p className="text-[11px] text-text-subtle mt-0.5">previsão do dia</p>
          </div>
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-elevation-1)]">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info-fg"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums">{totalActive.length}</p>
            <p className="text-[11px] text-text-subtle mt-0.5">aguardando confirmação</p>
          </div>
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-elevation-1)]">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={noShowRate > 20 ? 'text-danger-fg' : 'text-text-muted'}><circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" /></svg>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">No-show</span>
            </div>
            <p className="text-2xl font-bold text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums">{noShowRate}%</p>
            <p className="text-[11px] text-text-subtle mt-0.5">{noShowCount} de {completedCount + noShowCount} atendidos</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-danger-fg">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-text-muted mb-1">Erro ao carregar agendamentos.</p>
          <p className="text-xs text-text-subtle mb-3">Verifique sua conexão e tente novamente.</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(false);
              api<Appointment[]>('/appointments', { token: token! })
                .then(setAppointments)
                .catch(() => {
                  setError(true);
                  toast('Não foi possível carregar os agendamentos', 'error');
                })
                .finally(() => setLoading(false));
            }}
            className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
          >
            Tentar novamente
          </button>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
          </svg>
          <p className="text-text-muted mb-1">Nenhum agendamento ainda.</p>
          <p className="text-xs text-text-subtle">Os agendamentos aparecerão aqui quando clientes marcarem horário.</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Horário</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Profissional</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Serviço</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Cliente</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const st = STATUS_MAP[appt.status] || STATUS_MAP.scheduled;
                const start = new Date(appt.startAt);
                const end = new Date(appt.endAt);
                return (
                  <tr key={appt.id} className="border-b border-border-default hover:bg-surface-subtle">
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums whitespace-nowrap">
                      {start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                      {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–
                      {end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">{appt.professional.name}</td>
                    <td className="px-4 py-3">{appt.service.name}</td>
                    <td className="px-4 py-3">
                      <div>{appt.client.name}</div>
                      <div className="text-xs text-text-muted">{appt.client.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">
                      R$ {Number(appt.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${st.bgClass} ${st.textClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {appt.status === 'scheduled' && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => updateStatus(appt.id, 'confirmed')}
                            className="text-xs px-2 py-1 text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setCancelTarget(appt.id)}
                            className="text-xs px-2 py-1 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                      {appt.status === 'confirmed' && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setCompleteTarget(appt.id)}
                            className="text-xs px-2 py-1 text-success-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                          >
                            Concluir
                          </button>
                          <button
                            onClick={() => setNoShowTarget(appt.id)}
                            className="text-xs px-2 py-1 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                          >
                            Não compareceu
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!cancelTarget}
        title="Cancelar agendamento"
        description="Tem certeza que deseja cancelar este agendamento? O cliente será notificado e o horário ficará disponível."
        confirmLabel="Cancelar agendamento"
        variant="danger"
        onConfirm={() => {
          if (cancelTarget) {
            updateStatus(cancelTarget, 'cancelled');
            setCancelTarget(null);
          }
        }}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmModal
        open={!!completeTarget}
        title="Concluir agendamento"
        description="Marcar este agendamento como concluído? Essa ação não pode ser desfeita."
        confirmLabel="Concluir"
        onConfirm={() => {
          if (completeTarget) {
            updateStatus(completeTarget, 'completed');
            setCompleteTarget(null);
          }
        }}
        onCancel={() => setCompleteTarget(null)}
      />

      <ConfirmModal
        open={!!noShowTarget}
        title="Registrar ausência"
        description="Marcar que o cliente não compareceu? Essa ação não pode ser desfeita."
        confirmLabel="Não compareceu"
        variant="danger"
        onConfirm={() => {
          if (noShowTarget) {
            updateStatus(noShowTarget, 'no_show');
            setNoShowTarget(null);
          }
        }}
        onCancel={() => setNoShowTarget(null)}
      />
    </div>
  );
}

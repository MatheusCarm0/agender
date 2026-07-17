'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/confirm-modal';

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

export default function AgendaPage() {
  const { token, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api<Appointment[]>('/appointments', { token })
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function updateStatus(id: string, status: string) {
    await api(`/appointments/${id}`, {
      method: 'PATCH',
      token: token!,
      body: JSON.stringify({ status }),
    });
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong mb-6">
        {user?.role === 'professional' ? 'Minha agenda' : 'Agenda'}
      </h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
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
                            onClick={() => updateStatus(appt.id, 'completed')}
                            className="text-xs px-2 py-1 text-success-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                          >
                            Concluir
                          </button>
                          <button
                            onClick={() => updateStatus(appt.id, 'no_show')}
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
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';
import { formatBRL, formatPhone } from '@/lib/format';

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

function StatCards({ appointments }: { appointments: Appointment[] }) {
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

  if (appointments.length === 0) return null;

  return (
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
        <p className="text-2xl font-bold text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums">{formatBRL(revenueToday)}</p>
        <p className="text-[11px] text-text-subtle mt-0.5">previsão do dia</p>
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-elevation-1)]">
        <div className="flex items-center gap-2 mb-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info-fg"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Pendentes</span>
        </div>
        <p className="text-2xl font-bold text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums">{totalActive.length}</p>
        <p className="text-[11px] text-text-subtle mt-0.5">em aberto · total</p>
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
  );
}

const HOUR_PX = 56;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Visão de calendário do dia: coluna de horário à esquerda, blocos coloridos por
// status posicionados pelo horário, linha do horário atual e empacotamento de
// colunas para agendamentos que se sobrepõem (profissionais diferentes).
function DayCalendar({
  date, appointments, onSelect, selectedId,
}: {
  date: Date;
  appointments: Appointment[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const dayAppts = appointments
    .filter((a) => sameDay(new Date(a.startAt), date) && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  let minH = 8;
  let maxH = 20;
  if (dayAppts.length > 0) {
    for (const a of dayAppts) {
      const s = new Date(a.startAt);
      const e = new Date(a.endAt);
      minH = Math.min(minH, s.getHours());
      maxH = Math.max(maxH, e.getHours() + (e.getMinutes() > 0 ? 1 : 0));
    }
  }
  minH = Math.max(0, minH);
  maxH = Math.min(24, maxH);
  const hours: number[] = [];
  for (let h = minH; h <= maxH; h++) hours.push(h);
  const gridHeight = (maxH - minH) * HOUR_PX;

  // Empacota em colunas dentro de cada cluster de sobreposição.
  const items = dayAppts.map((a) => ({ a, start: new Date(a.startAt).getTime(), end: new Date(a.endAt).getTime() }));
  const colMap = new Map<string, { col: number; cols: number }>();
  let cluster: typeof items = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    if (!cluster.length) return;
    const colEnds: number[] = [];
    const assign: Record<string, number> = {};
    for (const it of cluster) {
      let c = 0;
      while (c < colEnds.length && it.start < colEnds[c]) c++;
      colEnds[c] = it.end;
      assign[it.a.id] = c;
    }
    for (const it of cluster) colMap.set(it.a.id, { col: assign[it.a.id], cols: colEnds.length });
    cluster = [];
    clusterEnd = -Infinity;
  };
  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();

  const now = new Date();
  const showNow = sameDay(now, date);
  const nowTop = ((now.getHours() + now.getMinutes() / 60) - minH) * HOUR_PX;
  const nowInRange = showNow && now.getHours() >= minH && now.getHours() < maxH;

  return (
    <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-hidden">
      {dayAppts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-text-muted">Nenhum agendamento neste dia.</p>
        </div>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="flex">
            <div className="w-14 shrink-0 border-r border-border-default pt-2">
              {hours.map((h) => (
                <div key={h} className="text-[11px] text-text-subtle font-[family-name:var(--font-geist-mono)] tabular-nums text-right pr-2 -translate-y-1.5" style={{ height: HOUR_PX }}>
                  {h > minH ? `${String(h).padStart(2, '0')}:00` : ''}
                </div>
              ))}
            </div>
            <div className="relative flex-1 pt-2" style={{ height: gridHeight + 8 }}>
              {hours.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 border-t border-border-default" style={{ top: i * HOUR_PX + 8 }} />
              ))}
              {nowInRange && (
                <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop + 8 }}>
                  <div className="h-0.5 bg-danger-fg" />
                  <div className="w-2 h-2 rounded-full bg-danger-fg" style={{ marginTop: '-5px', marginLeft: '-4px' }} />
                </div>
              )}
              {dayAppts.map((a) => {
                const s = new Date(a.startAt);
                const e = new Date(a.endAt);
                const top = ((s.getHours() + s.getMinutes() / 60) - minH) * HOUR_PX + 8;
                const height = Math.max(24, ((e.getTime() - s.getTime()) / 3600000) * HOUR_PX);
                const { col, cols } = colMap.get(a.id) || { col: 0, cols: 1 };
                const st = STATUS_MAP[a.status] || STATUS_MAP.scheduled;
                const widthPct = 100 / cols;
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a.id)}
                    className={`absolute rounded-[var(--radius-sm)] text-left overflow-hidden border-l-2 px-2 py-1 transition-shadow ${st.bgClass} ${st.textClass} ${selectedId === a.id ? 'ring-2 ring-primary-default z-10' : 'hover:shadow-[var(--shadow-elevation-1)]'}`}
                    style={{ top, height: height - 2, left: `calc(${col * widthPct}% + 4px)`, width: `calc(${widthPct}% - 8px)` }}
                  >
                    <div className="text-[11px] font-medium font-[family-name:var(--font-geist-mono)] tabular-nums leading-tight">
                      {s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs font-medium leading-tight truncate">{a.service.name} -  {a.professional.name}</div>
                    {height > 44 && <div className="text-[11px] leading-tight truncate opacity-80">{a.client.name}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgendaClient({ initialAppointments }: { initialAppointments: Appointment[] | null }) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments ?? []);
  const [error, setError] = useState(!initialAppointments);
  const [loading, setLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<string | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<string | null>(null);
  const [view, setView] = useState<'day' | 'list'>('day');
  const [calDate, setCalDate] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAppt = appointments.find((a) => a.id === selectedId) || null;
  function shiftDay(delta: number) {
    setCalDate((d) => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; });
    setSelectedId(null);
  }

  useEffect(() => {
    if (!token || initialAppointments) return;
    setLoading(true);
    api<Appointment[]>('/appointments', { token })
      .then((data) => { setAppointments(data); setError(false); })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  }, [token, initialAppointments]);

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

      <StatCards appointments={appointments} />

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
                .then((data) => { setAppointments(data); })
                .catch(() => { setError(true); toast('Não foi possível carregar os agendamentos', 'error'); })
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
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="inline-flex rounded-[var(--radius-sm)] border border-border-strong overflow-hidden">
              <button onClick={() => setView('day')} className={`h-9 px-3 text-sm font-medium ${view === 'day' ? 'bg-primary-default text-primary-fg' : 'bg-surface-card text-text-default hover:bg-surface-subtle'}`}>Dia</button>
              <button onClick={() => setView('list')} className={`h-9 px-3 text-sm font-medium border-l border-border-strong ${view === 'list' ? 'bg-primary-default text-primary-fg' : 'bg-surface-card text-text-default hover:bg-surface-subtle'}`}>Lista</button>
            </div>
            {view === 'day' && (
              <div className="flex items-center gap-2">
                <button onClick={() => shiftDay(-1)} aria-label="Dia anterior" className="h-9 w-9 inline-flex items-center justify-center border border-border-strong rounded-[var(--radius-sm)] hover:bg-surface-subtle text-text-default">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setCalDate(d); setSelectedId(null); }} className="h-9 px-3 text-sm font-medium border border-border-strong rounded-[var(--radius-sm)] hover:bg-surface-subtle text-text-default">Hoje</button>
                <button onClick={() => shiftDay(1)} aria-label="Próximo dia" className="h-9 w-9 inline-flex items-center justify-center border border-border-strong rounded-[var(--radius-sm)] hover:bg-surface-subtle text-text-default">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
                <span className="text-sm font-medium text-text-strong ml-1 capitalize">{calDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              </div>
            )}
          </div>
          {view === 'day' ? (
            <DayCalendar date={calDate} appointments={appointments} onSelect={setSelectedId} selectedId={selectedId} />
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
                      <div className="text-xs text-text-muted font-[family-name:var(--font-geist-mono)] tabular-nums">{formatPhone(appt.client.phone)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">
                      {formatBRL(appt.price)}
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
                          <button onClick={() => updateStatus(appt.id, 'confirmed')} className="text-xs inline-flex items-center min-h-[36px] px-2.5 text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)]">Confirmar</button>
                          <button onClick={() => setCancelTarget(appt.id)} className="text-xs inline-flex items-center min-h-[36px] px-2.5 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]">Cancelar</button>
                        </div>
                      )}
                      {appt.status === 'confirmed' && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setCompleteTarget(appt.id)} className="text-xs inline-flex items-center min-h-[36px] px-2.5 text-success-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]">Concluir</button>
                          <button onClick={() => setNoShowTarget(appt.id)} className="text-xs inline-flex items-center min-h-[36px] px-2.5 text-danger-fg hover:bg-surface-subtle rounded-[var(--radius-sm)]">Não compareceu</button>
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
        </>
      )}

      {selectedAppt && (() => {
        const st = STATUS_MAP[selectedAppt.status] || STATUS_MAP.scheduled;
        const s = new Date(selectedAppt.startAt);
        const e = new Date(selectedAppt.endAt);
        return (
          <div className="fixed inset-0 z-40" onClick={() => setSelectedId(null)}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-surface-card shadow-[var(--shadow-elevation-3)] p-6 overflow-y-auto" onClick={(ev) => ev.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-base font-semibold text-text-strong">Detalhe do agendamento</h2>
                <button onClick={() => setSelectedId(null)} aria-label="Fechar" className="text-text-muted hover:text-text-strong p-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${st.bgClass} ${st.textClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                {st.label}
              </span>
              <dl className="mt-4 space-y-3">
                <div><dt className="text-xs text-text-muted">Serviço</dt><dd className="text-sm text-text-strong">{selectedAppt.service.name}</dd></div>
                <div><dt className="text-xs text-text-muted">Profissional</dt><dd className="text-sm text-text-strong">{selectedAppt.professional.name}</dd></div>
                <div><dt className="text-xs text-text-muted">Cliente</dt><dd className="text-sm text-text-strong">{selectedAppt.client.name}</dd><dd className="text-xs text-text-muted font-[family-name:var(--font-geist-mono)] tabular-nums">{formatPhone(selectedAppt.client.phone)}</dd></div>
                <div><dt className="text-xs text-text-muted">Horário</dt><dd className="text-sm text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums">{s.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–{e.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd></div>
                <div><dt className="text-xs text-text-muted">Valor</dt><dd className="text-sm text-text-strong font-[family-name:var(--font-geist-mono)] tabular-nums">{formatBRL(selectedAppt.price)}</dd></div>
              </dl>
              {selectedAppt.status === 'scheduled' && (
                <div className="flex gap-2 mt-6">
                  <button onClick={() => { updateStatus(selectedAppt.id, 'confirmed'); setSelectedId(null); }} className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover">Confirmar</button>
                  <button onClick={() => { setCancelTarget(selectedAppt.id); setSelectedId(null); }} className="h-9 px-4 border border-border-strong text-danger-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-surface-subtle">Cancelar</button>
                </div>
              )}
              {selectedAppt.status === 'confirmed' && (
                <div className="flex gap-2 mt-6">
                  <button onClick={() => { setCompleteTarget(selectedAppt.id); setSelectedId(null); }} className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover">Concluir</button>
                  <button onClick={() => { setNoShowTarget(selectedAppt.id); setSelectedId(null); }} className="h-9 px-4 border border-border-strong text-danger-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-surface-subtle">Não compareceu</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <ConfirmModal open={!!cancelTarget} title="Cancelar agendamento" description="Tem certeza que deseja cancelar este agendamento? O cliente será notificado e o horário ficará disponível." confirmLabel="Cancelar agendamento" cancelLabel="Manter agendamento" variant="danger"
        onConfirm={() => { if (cancelTarget) { updateStatus(cancelTarget, 'cancelled'); setCancelTarget(null); } }} onCancel={() => setCancelTarget(null)} />
      <ConfirmModal open={!!completeTarget} title="Concluir agendamento" description="Marcar este agendamento como concluído? Essa ação não pode ser desfeita." confirmLabel="Concluir"
        onConfirm={() => { if (completeTarget) { updateStatus(completeTarget, 'completed'); setCompleteTarget(null); } }} onCancel={() => setCompleteTarget(null)} />
      <ConfirmModal open={!!noShowTarget} title="Registrar ausência" description="Marcar que o cliente não compareceu? Essa ação não pode ser desfeita." confirmLabel="Não compareceu" variant="danger"
        onConfirm={() => { if (noShowTarget) { updateStatus(noShowTarget, 'no_show'); setNoShowTarget(null); } }} onCancel={() => setNoShowTarget(null)} />
    </div>
  );
}

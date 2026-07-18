'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface NotificationLog {
  id: string;
  channel: 'email' | 'whatsapp';
  type: string;
  status: 'pending' | 'sent' | 'failed';
  payload: any;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  booking_confirmation: 'Confirmação',
  booking_reminder: 'Lembrete',
  booking_cancelled: 'Cancelamento',
  membership_expiring: 'Assinatura expirando',
};

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-success-bg text-success-text',
  pending: 'bg-warning-bg text-warning-text',
  failed: 'bg-danger-bg text-danger-text',
};

const STATUS_LABELS: Record<string, string> = {
  sent: 'Enviado',
  pending: 'Pendente',
  failed: 'Falhou',
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api<NotificationLog[]>('/notifications/log', { token })
      .then(setLogs)
      .catch(() => toast('Não foi possível carregar as notificações', 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-strong">Notificações</h1>
        <p className="text-xs text-text-muted mt-1">Histórico de notificações enviadas aos clientes.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <p className="text-text-muted">Nenhuma notificação enviada ainda.</p>
          <p className="text-xs text-text-subtle mt-1">As notificações serão enviadas automaticamente ao criar ou cancelar agendamentos.</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Canal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Enviado em</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Erro</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border-default hover:bg-surface-subtle">
                  <td className="px-4 py-3 font-medium text-text-strong">{TYPE_LABELS[log.type] || log.type}</td>
                  <td className="px-4 py-3 text-text-default capitalize">{log.channel}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[log.status] || ''}`}>
                      {STATUS_LABELS[log.status] || log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums whitespace-nowrap text-text-muted">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs max-w-xs truncate">{log.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

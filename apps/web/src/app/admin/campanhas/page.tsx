'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCached } from '@/lib/prefetch-cache';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  costEstimate: string;
  costActual: string;
  createdAt: string;
}

interface Estimate {
  totalRecipients: number;
  costPerSend: number;
  totalCost: number;
  withinQuota: number;
  overage: number;
  overageCost: number;
}

const STATUS_LABELS: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  draft: { label: 'Rascunho', dot: '#A8A29E', bg: '#F5F5F4', text: '#78716C' },
  scheduled: { label: 'Agendada', dot: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8' },
  sending: { label: 'Enviando', dot: '#D97706', bg: '#FFFBEB', text: '#B45309' },
  sent: { label: 'Enviada', dot: '#16A34A', bg: '#F0FDF4', text: '#15803D' },
  failed: { label: 'Falha', dot: '#DC2626', bg: '#FEF2F2', text: '#B91C1C' },
  cancelled: { label: 'Cancelada', dot: '#A8A29E', bg: '#F5F5F4', text: '#78716C' },
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  both: 'WhatsApp + E-mail',
};

function UpsellCard() {
  return (
    <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 text-center max-w-lg mx-auto mt-12">
      <div className="w-12 h-12 rounded-full bg-primary-tint-bg flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-default" aria-hidden="true">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-text-strong">
        Campanhas de disparo
      </h2>
      <p className="text-sm text-text-muted mt-2 max-w-sm mx-auto">
        Envie promoções, mensagens de reengajamento e ofertas especiais para seus clientes via WhatsApp ou e-mail.
      </p>
      <p className="text-sm text-text-muted mt-3">
        Disponível nos planos <strong>Profissional</strong> e <strong>Pro</strong>.
      </p>
      <a
        href="/admin/plano"
        className="inline-flex items-center justify-center mt-5 px-5 py-2 text-sm font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors"
      >
        Ver planos
      </a>
    </div>
  );
}

export default function CampaignsPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimatingId, setEstimatingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    channel: 'whatsapp',
    messageText: '',
    emailSubject: '',
    scheduledFor: '',
  });

  const canAccessCampaigns =
    user?.business.planStatus === 'trialing' ||
    user?.business.plan === 'profissional' ||
    user?.business.plan === 'pro';

  const loadCampaigns = useCallback(async () => {
    if (!token || !canAccessCampaigns) {
      setLoading(false);
      return;
    }
    const cached = getCached<Campaign[]>('/campaigns');
    if (cached) { setCampaigns(cached); setLoading(false); }
    try {
      const data = await api<Campaign[]>('/campaigns', { token });
      setCampaigns(data);
    } catch {
      // 403 expected for wrong plan
    } finally {
      setLoading(false);
    }
  }, [token, canAccessCampaigns]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  async function handleCreate() {
    try {
      await api('/campaigns', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          channel: form.channel,
          messageText: form.messageText,
          emailSubject: form.emailSubject || undefined,
          scheduledFor: form.scheduledFor || undefined,
          audienceFilter: { allOptedIn: true },
        }),
      });
      toast('Campanha criada', 'success');
      setShowCreate(false);
      setForm({ name: '', channel: 'whatsapp', messageText: '', emailSubject: '', scheduledFor: '' });
      loadCampaigns();
    } catch {
      toast('Erro ao criar campanha', 'error');
    }
  }

  async function handleEstimate(id: string) {
    setEstimatingId(id);
    try {
      const est = await api<Estimate>(`/campaigns/${id}/estimate`, {
        token: token!,
        method: 'POST',
      });
      setEstimate(est);
      setConfirmingId(id);
    } catch {
      toast('Erro ao calcular estimativa', 'error');
    } finally {
      setEstimatingId(null);
    }
  }

  async function handleConfirm(id: string) {
    try {
      await api(`/campaigns/${id}/confirm`, {
        token: token!,
        method: 'POST',
      });
      toast('Campanha confirmada para envio', 'success');
      setConfirmingId(null);
      setEstimate(null);
      loadCampaigns();
    } catch {
      toast('Erro ao confirmar campanha', 'error');
    }
  }

  async function handleCancel(id: string) {
    try {
      await api(`/campaigns/${id}`, {
        token: token!,
        method: 'DELETE',
      });
      toast('Campanha cancelada', 'success');
      loadCampaigns();
    } catch {
      toast('Erro ao cancelar campanha', 'error');
    }
  }

  if (!canAccessCampaigns) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-strong leading-tight">Campanhas</h1>
        <UpsellCard />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-40 bg-surface-subtle rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-strong leading-tight">Campanhas</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-4 text-sm font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors"
        >
          Nova campanha
        </button>
      </div>

      {campaigns.length === 0 && !showCreate && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-subtle mx-auto mb-3" aria-hidden="true">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          <p className="text-sm text-text-muted">Nenhuma campanha criada ainda.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm font-medium text-primary-default hover:text-primary-hover transition-colors"
          >
            Criar primeira campanha
          </button>
        </div>
      )}

      {showCreate && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-5 space-y-4">
          <h3 className="text-base font-semibold text-text-strong">Nova campanha</h3>

          <div className="space-y-4 max-w-[720px]">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Nome da campanha</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-9 px-3 border border-border-strong rounded-[var(--radius-sm)] text-sm text-text-default bg-surface-card focus:outline-none focus:border-primary-default focus:ring-1 focus:ring-primary-default"
                placeholder="Ex.: Promoção de inverno"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Canal</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full h-9 px-3 border border-border-strong rounded-[var(--radius-sm)] text-sm text-text-default bg-surface-card focus:outline-none focus:border-primary-default focus:ring-1 focus:ring-primary-default"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="both">WhatsApp + E-mail</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Mensagem</label>
              <textarea
                value={form.messageText}
                onChange={(e) => setForm({ ...form, messageText: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-border-strong rounded-[var(--radius-sm)] text-sm text-text-default bg-surface-card focus:outline-none focus:border-primary-default focus:ring-1 focus:ring-primary-default resize-none"
                placeholder="Texto da mensagem..."
              />
            </div>

            {(form.channel === 'email' || form.channel === 'both') && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Assunto do e-mail</label>
                <input
                  type="text"
                  value={form.emailSubject}
                  onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
                  className="w-full h-9 px-3 border border-border-strong rounded-[var(--radius-sm)] text-sm text-text-default bg-surface-card focus:outline-none focus:border-primary-default focus:ring-1 focus:ring-primary-default"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Agendar envio (opcional)</label>
              <input
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                className="w-full h-9 px-3 border border-border-strong rounded-[var(--radius-sm)] text-sm text-text-default bg-surface-card focus:outline-none focus:border-primary-default focus:ring-1 focus:ring-primary-default"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="h-9 px-4 text-sm font-medium text-text-default bg-surface-card border border-border-strong rounded-[var(--radius-sm)] hover:bg-surface-subtle transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name || !form.messageText}
                className="h-9 px-4 text-sm font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                Salvar rascunho
              </button>
            </div>
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Canal</th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-text-muted px-4 py-3">Destinatários</th>
                <th className="text-right text-xs font-medium text-text-muted px-4 py-3">Enviados</th>
                <th className="text-right text-xs font-medium text-text-muted px-4 py-3">Custo</th>
                <th className="text-right text-xs font-medium text-text-muted px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft;
                return (
                  <tr key={c.id} className="border-b border-border-default last:border-0 hover:bg-surface-subtle transition-colors h-11">
                    <td className="px-4 py-2 text-sm text-text-strong">{c.name}</td>
                    <td className="px-4 py-2 text-sm text-text-default">{CHANNEL_LABELS[c.channel] ?? c.channel}</td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full text-xs font-medium"
                        style={{ background: st.bg, color: st.text }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-text-default text-right font-mono tabular-nums">{c.totalRecipients}</td>
                    <td className="px-4 py-2 text-sm text-text-default text-right font-mono tabular-nums">
                      {c.totalSent}
                      {c.totalFailed > 0 && (
                        <span className="text-danger-fg ml-1">({c.totalFailed} falhas)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-default text-right font-mono tabular-nums">
                      R$ {Number(c.costActual || c.costEstimate).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(c.status === 'draft' || c.status === 'scheduled') && (
                          <>
                            <button
                              onClick={() => handleEstimate(c.id)}
                              disabled={estimatingId === c.id}
                              className="h-8 px-3 text-xs font-medium text-primary-default hover:bg-primary-tint-bg rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
                            >
                              {estimatingId === c.id ? 'Calculando...' : 'Enviar'}
                            </button>
                            <button
                              onClick={() => handleCancel(c.id)}
                              className="h-8 px-3 text-xs font-medium text-danger-fg hover:bg-danger-bg rounded-[var(--radius-sm)] transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!confirmingId && !!estimate}
        title="Confirmar envio"
        description={
          estimate
            ? `${estimate.totalRecipients} destinatário(s). Custo estimado: R$ ${estimate.totalCost.toFixed(2)}.${
                estimate.overage > 0
                  ? ` ${estimate.withinQuota} dentro da cota, ${estimate.overage} excedente (R$ ${estimate.overageCost.toFixed(2)}).`
                  : ''
              }`
            : ''
        }
        variant="default"
        confirmLabel="Confirmar envio"
        onConfirm={() => confirmingId && handleConfirm(confirmingId)}
        onCancel={() => { setConfirmingId(null); setEstimate(null); }}
      />
    </div>
  );
}

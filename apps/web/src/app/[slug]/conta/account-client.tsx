'use client';

import { useState, useEffect, useCallback } from 'react';
import { onColor, readableText } from '@/lib/color';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Colors { background: string; surface: string; primary: string; text: string }
interface Appointment {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  price: number;
  discountAmount: number;
  paymentStatus: string;
  serviceName: string;
  durationMin: number;
  professionalName: string;
}

interface PlanSummary {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  usageLimitType: string;
  usageLimit: number | null;
}
interface ClientPlan extends PlanSummary {
  services: { id: string; name: string }[];
}
interface MyMembership {
  id: string;
  status: string;
  paymentStatus: string;
  cycleStart: string;
  cycleEnd: string;
  usageInCycle: number;
  plan: PlanSummary;
}

type Step = 'email' | 'code' | 'list';

const CYCLE_SUFFIX: Record<string, string> = { monthly: 'mês', quarterly: 'trimestre', yearly: 'ano' };
const MEMBERSHIP_STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: 'Ativo', bg: '#F0FDF4', text: '#15803D', dot: '#16A34A' },
  pending: { label: 'Aguardando confirmação', bg: '#FFFBEB', text: '#B45309', dot: '#D97706' },
  suspended: { label: 'Suspenso', bg: '#F5F5F4', text: '#78716C', dot: '#A8A29E' },
  expired: { label: 'Expirado', bg: '#F5F5F4', text: '#78716C', dot: '#A8A29E' },
  cancelled: { label: 'Cancelado', bg: '#FEF2F2', text: '#B91C1C', dot: '#DC2626' },
};

const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  scheduled: { label: 'Agendado', dot: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8' },
  confirmed: { label: 'Confirmado', dot: '#0D9488', bg: '#F0FDFA', text: '#0F766E' },
  completed: { label: 'Concluído', dot: '#16A34A', bg: '#F0FDF4', text: '#15803D' },
  cancelled: { label: 'Cancelado', dot: '#A8A29E', bg: '#F5F5F4', text: '#78716C' },
  no_show: { label: 'Não compareceu', dot: '#DC2626', bg: '#FEF2F2', text: '#B91C1C' },
};

function fontFamily(font: string): string {
  const map: Record<string, string> = {
    inter: 'var(--font-inter)', poppins: 'var(--font-poppins)',
    playfair: 'var(--font-playfair)', dmSans: 'var(--font-dm-sans)',
    montserrat: 'var(--font-montserrat)', raleway: 'var(--font-raleway)',
    lora: 'var(--font-lora)', nunito: 'var(--font-nunito)',
    spaceGrotesk: 'var(--font-space-grotesk)', cormorant: 'var(--font-cormorant)',
  };
  return map[font] || 'var(--font-inter)';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function AccountClient({
  slug, businessName, logoUrl, colors, font, buttonRadius,
}: {
  slug: string; businessName: string; logoUrl?: string; colors: Colors; font: string; buttonRadius: string;
}) {
  const tokenKey = `agender-client-token-${slug}`;
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState('');
  const [clubPlans, setClubPlans] = useState<ClientPlan[]>([]);
  const [myMemberships, setMyMemberships] = useState<MyMembership[]>([]);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [clubMsg, setClubMsg] = useState('');

  const loadAppointments = useCallback(async (authToken: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/public/v1/${slug}/me/appointments`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return false;
      setAppointments(await res.json());
      return true;
    } catch {
      return false;
    }
  }, [slug]);

  // Clube de fidelidade: planos disponíveis (público) + minhas assinaturas
  // (autenticado). Silencioso — se o recurso estiver desligado, vem vazio.
  const loadClub = useCallback(async (authToken: string) => {
    const [plans, mine] = await Promise.all([
      fetch(`${API_URL}/public/v1/${slug}/membership-plans`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${API_URL}/public/v1/${slug}/me/memberships`, { headers: { Authorization: `Bearer ${authToken}` } })
        .then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    setClubPlans(plans);
    setMyMemberships(mine);
  }, [slug]);

  // Sessão persistida: se há token válido, entra direto na lista.
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(tokenKey) : null;
    if (!stored) { setBootstrapping(false); return; }
    (async () => {
      const [meOk, apptsOk] = await Promise.all([
        fetch(`${API_URL}/public/v1/${slug}/me`, { headers: { Authorization: `Bearer ${stored}` } })
          .then((r) => (r.ok ? r.json() : null)).catch(() => null),
        loadAppointments(stored),
        loadClub(stored),
      ]);
      if (meOk && apptsOk) {
        setToken(stored);
        setClientName(meOk.name || '');
        setStep('list');
      } else {
        localStorage.removeItem(tokenKey);
      }
      setBootstrapping(false);
    })();
  }, [slug, tokenKey, loadAppointments, loadClub]);

  async function startOtp(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError('Informe um e-mail válido.'); return; }
    setLoading(true); setError(''); setDevCode('');
    try {
      const res = await fetch(`${API_URL}/public/v1/${slug}/auth/otp/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Não foi possível enviar o código.');
      if (body.devCode) setDevCode(body.devCode);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o código.');
    }
    setLoading(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setError('O código tem 6 dígitos.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/public/v1/${slug}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Código incorreto.');
      localStorage.setItem(tokenKey, body.accessToken);
      setToken(body.accessToken);
      setClientName(body.client?.name || '');
      await Promise.all([loadAppointments(body.accessToken), loadClub(body.accessToken)]);
      setStep('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorreto.');
    }
    setLoading(false);
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setToken(null); setStep('email'); setEmail(''); setCode(''); setDevCode('');
    setAppointments([]); setClientName('');
    setClubPlans([]); setMyMemberships([]); setClubMsg('');
  }

  async function subscribe(planId: string) {
    if (!token) return;
    setSubscribingId(planId); setClubMsg(''); setError('');
    try {
      const res = await fetch(`${API_URL}/public/v1/${slug}/me/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Não foi possível solicitar a assinatura.');
      await loadClub(token);
      setClubMsg('Solicitação enviada! O estabelecimento vai confirmar o pagamento para ativar seu plano.');
    } catch (err) {
      setClubMsg(err instanceof Error ? err.message : 'Não foi possível solicitar a assinatura.');
    }
    setSubscribingId(null);
  }

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function cancelAppointment(id: string) {
    if (!token) return;
    setCancelling(true); setError('');
    try {
      const res = await fetch(`${API_URL}/public/v1/${slug}/me/appointments/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Não foi possível cancelar o agendamento.');
      }
      await loadAppointments(token);
      setCancelId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cancelar o agendamento.');
    }
    setCancelling(false);
  }

  // Cards/painéis/inputs nunca viram pílula (999px em superfície larga vira elipse).
  const cardRad = buttonRadius === '999px' ? '18px' : buttonRadius === '4px' ? '6px' : '14px';
  // Cores legíveis (AA) para preenchimento primário e para o primário como texto/acento.
  const onPrimary = onColor(colors.primary);
  const accent = readableText(colors.primary, colors.surface);

  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.surface, borderColor: `${colors.text}20`, color: colors.text, borderRadius: cardRad,
  };

  const now = Date.now();
  const upcoming = appointments.filter((a) => new Date(a.startAt).getTime() >= now && !['cancelled', 'no_show', 'completed'].includes(a.status));
  const past = appointments.filter((a) => !upcoming.includes(a));

  const heldPlanIds = new Set(myMemberships.filter((m) => ['active', 'pending'].includes(m.status)).map((m) => m.plan.id));
  const availablePlans = clubPlans.filter((p) => !heldPlanIds.has(p.id));
  const showClub = clubPlans.length > 0 || myMemberships.length > 0;
  const usageText = (p: PlanSummary) => (p.usageLimitType === 'unlimited' ? 'Uso ilimitado' : `${p.usageLimit} usos por ciclo`);

  function ApptCard({ a, cancellable = false }: { a: Appointment; cancellable?: boolean }) {
    const meta = STATUS_META[a.status] || STATUS_META.scheduled;
    const total = Math.max(0, a.price - a.discountAmount);
    return (
      <div className="border p-5" style={{ backgroundColor: colors.surface, borderColor: `${colors.text}12`, borderRadius: cardRad }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm">{a.serviceName}</p>
            <p className="text-xs mt-0.5" style={{ opacity: 0.6 }}>com {a.professionalName} · {a.durationMin} min</p>
            <p className="text-xs mt-1" style={{ opacity: 0.8 }}>
              {new Date(a.startAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0"
            style={{ backgroundColor: meta.bg, color: meta.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
            {meta.label}
          </span>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${colors.text}10` }}>
          <span style={{ opacity: 0.6 }}>{a.paymentStatus === 'paid' ? 'Pago' : 'Pagamento no local'}</span>
          <span className="font-semibold tabular-nums" style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(total)}</span>
        </div>
        {cancellable && (
          cancelId === a.id ? (
            <div className="flex items-center gap-2 mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${colors.text}10` }}>
              <span style={{ opacity: 0.7 }}>Cancelar este horário?</span>
              <button type="button" onClick={() => cancelAppointment(a.id)} disabled={cancelling}
                className="ml-auto px-2.5 h-8 inline-flex items-center rounded font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#DC2626', borderRadius: buttonRadius }}>
                {cancelling ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
              <button type="button" onClick={() => setCancelId(null)} disabled={cancelling}
                className="px-2.5 h-8 inline-flex items-center rounded font-medium" style={{ border: `1px solid ${colors.text}20`, borderRadius: buttonRadius }}>
                Voltar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => { setCancelId(a.id); setError(''); }}
              className="mt-2 text-xs font-medium transition-opacity hover:opacity-70" style={{ color: '#DC2626' }}>
              Cancelar agendamento
            </button>
          )
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12"
      style={{ backgroundColor: colors.background, color: colors.text, fontFamily: fontFamily(font) }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="w-16 h-16 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: colors.surface }} />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: colors.primary, color: onPrimary }}>
              {businessName[0]?.toUpperCase() || 'N'}
            </div>
          )}
          <h1 className="text-xl font-semibold mt-4 tracking-[-0.01em]">{businessName}</h1>
          <p className="text-[11px] font-medium uppercase tracking-wider mt-1.5" style={{ opacity: 0.4 }}>Meus agendamentos</p>
        </div>

        {bootstrapping ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: `${colors.text}08` }} />)}
          </div>
        ) : step === 'email' ? (
          <form onSubmit={startOtp} className="border p-6 space-y-4" style={{ backgroundColor: colors.surface, borderColor: `${colors.text}12`, borderRadius: cardRad }}>
            <div>
              <label htmlFor="otp-email" className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Seu e-mail</label>
              <input id="otp-email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoFocus
                className="w-full h-11 px-3 text-sm border focus:outline-none" style={inputStyle} />
              <p className="text-[11px] mt-1.5" style={{ opacity: 0.5 }}>Enviaremos um código de confirmação por e-mail.</p>
            </div>
            {error && <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full h-11 font-semibold text-sm disabled:opacity-50 transition-colors"
              style={{ backgroundColor: colors.primary, color: onPrimary, borderRadius: buttonRadius }}>
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        ) : step === 'code' ? (
          <form onSubmit={verifyOtp} className="border p-6 space-y-4" style={{ backgroundColor: colors.surface, borderColor: `${colors.text}12`, borderRadius: cardRad }}>
            <div>
              <label htmlFor="otp-code" className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Código de 6 dígitos</label>
              <input id="otp-code" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" autoFocus
                className="w-full h-12 px-3 text-center text-xl tracking-[0.4em] border focus:outline-none tabular-nums" style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }} />
              <p className="text-[11px] mt-1.5" style={{ opacity: 0.5 }}>Enviamos um código de acesso para o seu e-mail. Válido por 5 minutos.</p>
              {devCode && (
                <p className="text-[11px] mt-2 px-2 py-1.5 rounded" style={{ backgroundColor: `${colors.primary}12`, color: accent }}>
                  Ambiente de teste — seu código é <strong>{devCode}</strong>
                </p>
              )}
            </div>
            {error && <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full h-11 font-semibold text-sm disabled:opacity-50 transition-colors"
              style={{ backgroundColor: colors.primary, color: onPrimary, borderRadius: buttonRadius }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="w-full text-xs transition-opacity hover:opacity-70" style={{ opacity: 0.5 }}>
              Usar outro e-mail
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {clientName && (
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ opacity: 0.7 }}>Olá, <span className="font-semibold" style={{ opacity: 1 }}>{clientName.split(' ')[0]}</span></p>
                <button onClick={logout} className="text-xs transition-opacity hover:opacity-70" style={{ opacity: 0.5 }}>Sair</button>
              </div>
            )}

            {appointments.length === 0 ? (
              <div className="border p-8 text-center" style={{ backgroundColor: colors.surface, borderColor: `${colors.text}12`, borderRadius: cardRad }}>
                <p className="text-sm font-medium">Você ainda não tem agendamentos</p>
                <a href={`/${slug}`} className="inline-block mt-3 px-4 py-2 text-sm font-semibold" style={{ backgroundColor: colors.primary, color: onPrimary, borderRadius: buttonRadius }}>
                  Agendar horário
                </a>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <h2 className="text-[11px] font-medium uppercase tracking-wider mb-2.5" style={{ opacity: 0.4 }}>Próximos</h2>
                    <div className="space-y-2.5">{upcoming.map((a) => <ApptCard key={a.id} a={a} cancellable />)}</div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <h2 className="text-[11px] font-medium uppercase tracking-wider mb-2.5" style={{ opacity: 0.4 }}>Histórico</h2>
                    <div className="space-y-2.5">{past.map((a) => <ApptCard key={a.id} a={a} />)}</div>
                  </div>
                )}
                <a href={`/${slug}`} className="block text-center w-full py-3 text-sm font-semibold transition-colors" style={{ backgroundColor: colors.primary, color: onPrimary, borderRadius: buttonRadius }}>
                  Agendar novo horário
                </a>
              </>
            )}

            {showClub && (
              <div>
                <h2 className="text-[11px] font-medium uppercase tracking-wider mb-2.5" style={{ opacity: 0.4 }}>Clube de fidelidade</h2>

                {clubMsg && (
                  <p className="text-xs px-3 py-2 rounded mb-3" style={{ backgroundColor: `${colors.primary}12`, color: accent }}>{clubMsg}</p>
                )}

                <div className="space-y-2.5">
                  {/* Minhas assinaturas */}
                  {myMemberships.map((m) => {
                    const meta = MEMBERSHIP_STATUS[m.status] || MEMBERSHIP_STATUS.pending;
                    return (
                      <div key={m.id} className="border p-5" style={{ backgroundColor: colors.surface, borderColor: `${colors.text}12`, borderRadius: cardRad }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{m.plan.name}</p>
                            <p className="text-xs mt-0.5" style={{ opacity: 0.6 }}>
                              {formatCurrency(m.plan.price)}/{CYCLE_SUFFIX[m.plan.billingCycle] || 'ciclo'} · {usageText(m.plan)}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0" style={{ backgroundColor: meta.bg, color: meta.text }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                            {meta.label}
                          </span>
                        </div>
                        {m.status === 'active' && (
                          <div className="flex items-center justify-between mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${colors.text}10` }}>
                            <span style={{ opacity: 0.6 }}>
                              {m.plan.usageLimitType === 'limited' ? `${m.usageInCycle} / ${m.plan.usageLimit} usados neste ciclo` : `${m.usageInCycle} usados neste ciclo`}
                            </span>
                            <span style={{ opacity: 0.6 }}>Renova em {new Date(m.cycleEnd).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                        {m.status === 'pending' && (
                          <p className="text-xs mt-3 pt-3" style={{ borderTop: `1px solid ${colors.text}10`, opacity: 0.6 }}>
                            Aguardando o estabelecimento confirmar o pagamento para ativar.
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* Planos disponíveis para assinar */}
                  {availablePlans.map((p) => (
                    <div key={p.id} className="border p-5" style={{ backgroundColor: colors.surface, borderColor: `${colors.text}12`, borderRadius: cardRad }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{p.name}</p>
                          <p className="text-xs mt-0.5" style={{ opacity: 0.6 }}>
                            {formatCurrency(p.price)}/{CYCLE_SUFFIX[p.billingCycle] || 'ciclo'} · {usageText(p)}
                          </p>
                          {p.services.length > 0 && (
                            <p className="text-[11px] mt-1" style={{ opacity: 0.5 }}>Serviços: {p.services.map((s) => s.name).join(', ')}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.price)}</span>
                      </div>
                      <button type="button" onClick={() => subscribe(p.id)} disabled={subscribingId === p.id}
                        className="mt-3 w-full py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
                        style={{ backgroundColor: colors.primary, color: onPrimary, borderRadius: buttonRadius }}>
                        {subscribingId === p.id ? 'Enviando...' : 'Assinar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-10">
          <a href={`/${slug}`} className="text-xs transition-opacity hover:opacity-70" style={{ opacity: 0.5, color: colors.text }}>← Voltar para a página</a>
        </div>
      </div>
    </div>
  );
}

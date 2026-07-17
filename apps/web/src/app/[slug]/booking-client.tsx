'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
}

interface Professional {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  services: Service[];
}

interface Business {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  logoUrl?: string;
  coverUrl?: string;
  professionals: Professional[];
}

interface Customization {
  theme: {
    palette: string;
    colors: { background: string; surface: string; primary: string; text: string };
    font: string;
    background: { type: string; value: string };
    logoUrl?: string;
    coverUrl?: string;
    buttonStyle: string;
    layout: string;
  };
  links: { label: string; url: string }[];
  socials: { instagram?: string; whatsapp?: string; facebook?: string; tiktok?: string };
  headline: string | null;
  about: string | null;
}

interface Slot {
  startAt: string;
  endAt: string;
}

type Step = 'home' | 'select' | 'slots' | 'form' | 'done';

function fontFamily(font: string): string {
  const map: Record<string, string> = {
    inter: 'var(--font-inter)',
    poppins: 'var(--font-poppins)',
    playfair: 'var(--font-playfair)',
    dmSans: 'var(--font-dm-sans)',
  };
  return map[font] || 'var(--font-inter)';
}

function btnRadius(style?: string): string {
  if (style === 'pill') return '999px';
  if (style === 'square') return '4px';
  return '8px';
}

export default function BookingClient({
  business,
  customization,
}: {
  business: Business;
  customization?: Customization | null;
}) {
  const [step, setStep] = useState<Step>('home');
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '' });
  const [couponCode, setCouponCode] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const c = customization?.theme?.colors;
  const bg = c?.background || '#f9fafb';
  const text = c?.text || '#1c1917';
  const surface = c?.surface || '#ffffff';
  const primary = c?.primary || '#0d9488';
  const radius = btnRadius(customization?.theme?.buttonStyle);
  const layout = customization?.theme?.layout || 'list';
  const socials = customization?.socials;
  const links = customization?.links;
  const coverUrl = business.coverUrl || customization?.theme?.coverUrl;
  const logoUrl = business.logoUrl || customization?.theme?.logoUrl;
  const headline = customization?.headline || business.name;
  const about = customization?.about;

  function selectProfessional(p: Professional) {
    setSelectedProf(p);
    setSelectedService(null);
  }

  function selectService(s: Service) {
    setSelectedService(s);
    setStep('slots');
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    loadSlots(dateStr, selectedProf!.id, s.id);
  }

  async function loadSlots(date: string, profId?: string, svcId?: string) {
    const pId = profId || selectedProf?.id;
    const sId = svcId || selectedService?.id;
    if (!pId || !sId) return;
    setLoadingSlots(true);
    setError('');
    try {
      const res = await fetch(
        `${API_URL}/public/v1/${business.slug}/availability?professionalId=${pId}&serviceId=${sId}&dateFrom=${date}&dateTo=${date}`,
      );
      if (!res.ok) throw new Error('Erro ao buscar horários');
      const data: Slot[] = await res.json();
      setSlots(data);
    } catch {
      setSlots([]);
    }
    setLoadingSlots(false);
  }

  function changeDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    loadSlots(date);
  }

  function pickSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep('form');
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProf || !selectedService || !selectedSlot) return;
    setBooking(true);
    setError('');
    const idempotencyKey = crypto.randomUUID();
    try {
      const res = await fetch(`${API_URL}/public/v1/${business.slug}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          professionalId: selectedProf.id,
          serviceId: selectedService.id,
          startAt: selectedSlot.startAt,
          clientName: clientForm.name,
          clientPhone: clientForm.phone,
          ...(clientForm.email ? { clientEmail: clientForm.email } : {}),
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Erro ao agendar');
      }
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar');
    }
    setBooking(false);
  }

  function goHome() {
    setStep('home');
    setSelectedProf(null);
    setSelectedService(null);
    setSelectedSlot(null);
    setClientForm({ name: '', phone: '', email: '' });
    setError('');
  }

  const hasSocials = socials && Object.values(socials).some(Boolean);
  const hasLinks = links && links.length > 0 && links.some((l) => l.label);

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ backgroundColor: bg, color: text, fontFamily: fontFamily(customization?.theme?.font || 'inter') }}
    >
      {/* Cover */}
      {coverUrl && (
        <div
          className="w-full h-44 sm:h-52 bg-cover bg-center"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      )}

      {/* Profile header — Linktree style */}
      <div className={`flex flex-col items-center text-center w-full max-w-[680px] px-6 ${coverUrl ? '-mt-12' : 'mt-10'}`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={business.name}
            className="w-24 h-24 rounded-full object-cover border-4 shadow-md"
            style={{ borderColor: surface }}
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 shadow-md"
            style={{ backgroundColor: primary, borderColor: surface }}
          >
            {headline[0]?.toUpperCase() || 'N'}
          </div>
        )}

        <h1 className="text-xl font-bold mt-4">{headline}</h1>
        {about && (
          <p className="text-sm mt-1 max-w-sm" style={{ opacity: 0.65 }}>{about}</p>
        )}

        {/* Social icons */}
        {hasSocials && (
          <div className="flex gap-4 mt-3">
            {socials!.instagram && (
              <a href={`https://instagram.com/${socials!.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100" style={{ opacity: 0.5 }} title="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            )}
            {socials!.whatsapp && (
              <a href={`https://wa.me/${socials!.whatsapp}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100" style={{ opacity: 0.5 }} title="WhatsApp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
            {socials!.facebook && (
              <a href={socials!.facebook.startsWith('http') ? socials!.facebook : `https://facebook.com/${socials!.facebook}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100" style={{ opacity: 0.5 }} title="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {socials!.tiktok && (
              <a href={`https://tiktok.com/@${socials!.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-100" style={{ opacity: 0.5 }} title="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="w-full max-w-[680px] px-6 pb-12 mt-6 flex flex-col items-center">

        {/* HOME step — Linktree-style buttons */}
        {step === 'home' && (
          <div className="w-full max-w-md space-y-3">
            {/* Main CTA */}
            <button
              onClick={() => setStep('select')}
              className="w-full py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: primary, borderRadius: radius }}
            >
              Agendar horário
            </button>

            {/* Extra links */}
            {hasLinks && links!.filter((l) => l.label).map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 text-sm font-medium border transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: surface,
                  borderColor: `${text}15`,
                  color: text,
                  borderRadius: radius,
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* SELECT step — pick professional & service */}
        {step === 'select' && (
          <div className="w-full max-w-md space-y-5">
            <button onClick={goHome} className="text-sm flex items-center gap-1" style={{ opacity: 0.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
              Voltar
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs" style={{ opacity: 0.4 }}>
              <span style={{ color: primary, fontWeight: 600, opacity: 1 }}>1. Escolher</span>
              <span>/</span>
              <span>2. Horário</span>
              <span>/</span>
              <span>3. Seus dados</span>
            </div>

            {business.professionals.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ opacity: 0.5 }}>Nenhum profissional disponível no momento.</p>
            ) : (
              <>
                <div>
                  <h2 className="text-sm font-medium mb-3" style={{ opacity: 0.7 }}>Escolha o profissional</h2>
                  <div className="space-y-2">
                    {business.professionals.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectProfessional(p)}
                        className="w-full text-left p-4 border transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: surface,
                          borderColor: selectedProf?.id === p.id ? primary : `${text}12`,
                          borderRadius: radius,
                          ...(selectedProf?.id === p.id ? { boxShadow: `0 0 0 1px ${primary}` } : {}),
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                              style={{ backgroundColor: primary }}
                            >
                              {p.name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            {p.bio && <p className="text-xs mt-0.5" style={{ opacity: 0.5 }}>{p.bio}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedProf && selectedProf.services.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium mb-3" style={{ opacity: 0.7 }}>Escolha o serviço</h2>
                    <div className={layout === 'cards' ? 'grid gap-2 grid-cols-2' : 'space-y-2'}>
                      {selectedProf.services.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => selectService(s)}
                          className={`w-full text-left p-4 border transition-all hover:scale-[1.01] ${layout === 'cards' ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}
                          style={{
                            backgroundColor: surface,
                            borderColor: `${text}12`,
                            borderRadius: radius,
                          }}
                        >
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs mt-0.5" style={{ opacity: 0.5 }}>{s.durationMin} min</p>
                          </div>
                          <span className="text-sm font-semibold font-mono tabular-nums" style={{ color: primary }}>
                            R$ {s.price.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* SLOTS step */}
        {step === 'slots' && (
          <div className="w-full max-w-md space-y-4">
            <button onClick={() => setStep('select')} className="text-sm flex items-center gap-1" style={{ opacity: 0.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
              Voltar
            </button>

            <div className="flex items-center gap-2 text-xs" style={{ opacity: 0.4 }}>
              <span>1. Escolher</span>
              <span>/</span>
              <span style={{ color: primary, fontWeight: 600, opacity: 1 }}>2. Horário</span>
              <span>/</span>
              <span>3. Seus dados</span>
            </div>

            <div className="border p-5" style={{ backgroundColor: surface, borderColor: `${text}12`, borderRadius: radius }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-sm">{selectedService?.name}</p>
                  <p className="text-xs" style={{ opacity: 0.5 }}>com {selectedProf?.name}</p>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => changeDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-9 px-3 text-sm border font-mono tabular-nums focus:outline-none"
                  style={{
                    backgroundColor: surface,
                    borderColor: `${text}20`,
                    color: text,
                    borderRadius: radius,
                  }}
                />
              </div>

              {loadingSlots ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: `${text}08` }} />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ opacity: 0.5 }}>Nenhum horário disponível nesta data.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.startAt}
                      onClick={() => pickSlot(slot)}
                      className="h-10 text-sm font-medium border font-mono tabular-nums transition-all hover:scale-[1.03]"
                      style={{
                        backgroundColor: `${text}04`,
                        borderColor: `${text}15`,
                        color: text,
                        borderRadius: radius,
                      }}
                    >
                      {new Date(slot.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FORM step */}
        {step === 'form' && (
          <div className="w-full max-w-md space-y-4">
            <button onClick={() => setStep('slots')} className="text-sm flex items-center gap-1" style={{ opacity: 0.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
              Voltar
            </button>

            <div className="flex items-center gap-2 text-xs" style={{ opacity: 0.4 }}>
              <span>1. Escolher</span>
              <span>/</span>
              <span>2. Horário</span>
              <span>/</span>
              <span style={{ color: primary, fontWeight: 600, opacity: 1 }}>3. Seus dados</span>
            </div>

            <div className="border p-5" style={{ backgroundColor: surface, borderColor: `${text}12`, borderRadius: radius }}>
              <div className="mb-5 pb-4" style={{ borderBottomColor: `${text}08`, borderBottomWidth: 1 }}>
                <p className="font-medium text-sm">{selectedService?.name}</p>
                <p className="text-xs mt-0.5" style={{ opacity: 0.5 }}>
                  {selectedProf?.name} &mdash;{' '}
                  {selectedSlot && new Date(selectedSlot.startAt).toLocaleString('pt-BR', {
                    weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Seu nome</label>
                  <input
                    value={clientForm.name}
                    onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full h-10 px-3 text-sm border focus:outline-none"
                    style={{ backgroundColor: surface, borderColor: `${text}20`, color: text, borderRadius: radius }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Telefone</label>
                  <input
                    value={clientForm.phone}
                    onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))}
                    required
                    placeholder="(11) 99999-9999"
                    className="w-full h-10 px-3 text-sm border focus:outline-none"
                    style={{ backgroundColor: surface, borderColor: `${text}20`, color: text, borderRadius: radius }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>E-mail (opcional)</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border focus:outline-none"
                    style={{ backgroundColor: surface, borderColor: `${text}20`, color: text, borderRadius: radius }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Cupom de desconto (opcional)</label>
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="CODIGO10"
                    className="w-full h-10 px-3 text-sm border focus:outline-none uppercase tracking-wider"
                    style={{ backgroundColor: surface, borderColor: `${text}20`, color: text, borderRadius: radius, fontFamily: 'monospace' }}
                  />
                </div>
                {error && (
                  <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>{error}</p>
                )}
                <button
                  type="submit"
                  disabled={booking}
                  className="w-full h-11 font-semibold text-sm text-white disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: primary, borderRadius: radius }}
                >
                  {booking ? 'Agendando...' : 'Confirmar agendamento'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* DONE step */}
        {step === 'done' && (
          <div className="w-full max-w-md border p-8 text-center" style={{ backgroundColor: surface, borderColor: `${text}12`, borderRadius: radius }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primary}20` }}
            >
              <svg width="28" height="28" fill="none" stroke={primary} strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2">Agendamento confirmado!</h2>
            <p className="text-sm mb-1" style={{ opacity: 0.7 }}>
              {selectedService?.name} com {selectedProf?.name}
            </p>
            <p className="text-sm mb-5" style={{ opacity: 0.7 }}>
              {selectedSlot && new Date(selectedSlot.startAt).toLocaleString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <button
              onClick={goHome}
              className="text-sm font-medium"
              style={{ color: primary }}
            >
              Voltar ao início
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

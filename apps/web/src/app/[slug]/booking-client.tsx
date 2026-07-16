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
  links: { label: string; url: string; icon?: string }[];
  socials: { instagram?: string; whatsapp?: string; facebook?: string; tiktok?: string };
  headline: string | null;
  about: string | null;
}

interface Slot {
  startAt: string;
  endAt: string;
}

type Step = 'select' | 'slots' | 'form' | 'done';

function fontFamily(font: string): string {
  const map: Record<string, string> = {
    inter: 'var(--font-inter)',
    poppins: 'var(--font-poppins)',
    playfair: 'var(--font-playfair)',
    dmSans: 'var(--font-dm-sans)',
  };
  return map[font] || 'var(--font-inter)';
}

export default function BookingClient({
  business,
  customization,
}: {
  business: Business;
  customization?: Customization | null;
}) {
  const [step, setStep] = useState<Step>('select');
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '' });
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const colors = customization?.theme?.colors;
  const layout = customization?.theme?.layout || 'list';
  const socials = customization?.socials as Record<string, string> | undefined;
  const links = customization?.links as { label: string; url: string }[] | undefined;

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
        `${API_URL}/public/${business.slug}/availability?professionalId=${pId}&serviceId=${sId}&dateFrom=${date}&dateTo=${date}`,
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
      const res = await fetch(`${API_URL}/public/${business.slug}/appointments`, {
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

  const bgStyle = colors
    ? { backgroundColor: colors.background, color: colors.text }
    : { backgroundColor: '#f9fafb' };

  const surfaceStyle = colors
    ? { backgroundColor: colors.surface, borderColor: `${colors.text}20` }
    : { backgroundColor: '#ffffff', borderColor: '#e5e7eb' };

  const primaryStyle = colors
    ? { backgroundColor: colors.primary, color: '#ffffff' }
    : { backgroundColor: '#0d9488', color: '#ffffff' };

  const primaryHoverStyle = colors
    ? { backgroundColor: colors.primary, color: '#ffffff', opacity: 0.9 }
    : {};

  const btnRadius = customization?.theme?.buttonStyle === 'pill'
    ? '999px'
    : customization?.theme?.buttonStyle === 'square'
      ? '4px'
      : '8px';

  return (
    <div className="min-h-screen" style={{ ...bgStyle, fontFamily: fontFamily(customization?.theme?.font || 'inter') }}>
      {(business.coverUrl || customization?.theme?.coverUrl) && (
        <div
          className="w-full h-40 bg-cover bg-center"
          style={{ backgroundImage: `url(${business.coverUrl || customization?.theme?.coverUrl})` }}
        />
      )}
      <header
        className={`border-b px-6 py-4 ${(business.coverUrl || customization?.theme?.coverUrl) ? '' : ''}`}
        style={{
          ...surfaceStyle,
          borderBottomColor: `${colors?.text || '#000'}15`,
        }}
      >
        <div className="flex items-center gap-3">
          {(business.logoUrl || customization?.theme?.logoUrl) ? (
            <img
              src={business.logoUrl || customization?.theme?.logoUrl}
              alt={business.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : null}
          <div>
            <h1 className="text-xl font-semibold">{business.name}</h1>
            {customization?.headline && (
              <p className="text-sm mt-0.5" style={{ opacity: 0.7 }}>{customization.headline}</p>
            )}
            {!customization?.headline && (
              <p className="text-sm" style={{ opacity: 0.5 }}>Agende seu horário online</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {customization?.about && step === 'select' && (
          <p className="text-sm mb-6" style={{ opacity: 0.7 }}>{customization.about}</p>
        )}

        {step === 'done' ? (
          <div className="rounded-lg border p-8 text-center" style={surfaceStyle}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${colors?.primary || '#16a34a'}20` }}
            >
              <svg width="24" height="24" fill="none" stroke={colors?.primary || '#16a34a'} strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Agendamento confirmado!</h2>
            <p className="text-sm mb-1" style={{ opacity: 0.7 }}>
              {selectedService?.name} com {selectedProf?.name}
            </p>
            <p className="text-sm mb-4" style={{ opacity: 0.7 }}>
              {selectedSlot && new Date(selectedSlot.startAt).toLocaleString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <button
              onClick={() => {
                setStep('select');
                setSelectedProf(null);
                setSelectedService(null);
                setSelectedSlot(null);
                setClientForm({ name: '', phone: '', email: '' });
              }}
              className="text-sm"
              style={{ color: colors?.primary || '#0d9488' }}
            >
              Fazer outro agendamento
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs mb-6" style={{ opacity: 0.4 }}>
              <span style={step === 'select' ? { color: colors?.primary || '#0d9488', fontWeight: 500, opacity: 1 } : {}}>
                1. Escolher
              </span>
              <span>/</span>
              <span style={step === 'slots' ? { color: colors?.primary || '#0d9488', fontWeight: 500, opacity: 1 } : {}}>
                2. Horário
              </span>
              <span>/</span>
              <span style={step === 'form' ? { color: colors?.primary || '#0d9488', fontWeight: 500, opacity: 1 } : {}}>
                3. Seus dados
              </span>
            </div>

            {step === 'select' && (
              <div className="space-y-6">
                {business.professionals.length === 0 ? (
                  <p className="text-center py-12" style={{ opacity: 0.5 }}>Nenhum profissional disponível no momento.</p>
                ) : (
                  <>
                    <div>
                      <h2 className="text-sm font-medium mb-3" style={{ opacity: 0.7 }}>Escolha o profissional</h2>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {business.professionals.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => selectProfessional(p)}
                            className="text-left p-4 rounded-lg border transition-colors"
                            style={{
                              ...surfaceStyle,
                              ...(selectedProf?.id === p.id
                                ? { borderColor: colors?.primary || '#0d9488', backgroundColor: `${colors?.primary || '#0d9488'}08` }
                                : {}),
                            }}
                          >
                            <p className="font-medium">{p.name}</p>
                            {p.bio && <p className="text-xs mt-1" style={{ opacity: 0.5 }}>{p.bio}</p>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedProf && selectedProf.services.length > 0 && (
                      <div>
                        <h2 className="text-sm font-medium mb-3" style={{ opacity: 0.7 }}>Escolha o serviço</h2>
                        {layout === 'cards' ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedProf.services.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => selectService(s)}
                                className="text-left p-4 rounded-lg border flex flex-col gap-2 transition-colors"
                                style={{ ...surfaceStyle, borderRadius: btnRadius }}
                              >
                                <p className="font-medium">{s.name}</p>
                                <p className="text-xs" style={{ opacity: 0.5 }}>{s.durationMin} min</p>
                                <span className="text-sm font-medium font-mono tabular-nums mt-auto" style={{ color: colors?.primary || '#0d9488' }}>
                                  R$ {s.price.toFixed(2)}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedProf.services.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => selectService(s)}
                                className="w-full text-left p-4 rounded-lg border flex items-center justify-between transition-colors"
                                style={surfaceStyle}
                              >
                                <div>
                                  <p className="font-medium">{s.name}</p>
                                  <p className="text-xs" style={{ opacity: 0.5 }}>{s.durationMin} min</p>
                                </div>
                                <span className="text-sm font-medium font-mono tabular-nums">
                                  R$ {s.price.toFixed(2)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {links && links.length > 0 && (
                  <div className="space-y-2 pt-4">
                    {links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center p-3 rounded-lg border text-sm font-medium transition-colors hover:opacity-90"
                        style={{
                          ...surfaceStyle,
                          borderRadius: btnRadius,
                        }}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}

                {socials && Object.values(socials).some(Boolean) && (
                  <div className="flex gap-4 justify-center pt-2">
                    {socials.instagram && (
                      <a href={`https://instagram.com/${socials.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-80 transition-opacity" title="Instagram">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      </a>
                    )}
                    {socials.whatsapp && (
                      <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-80 transition-opacity" title="WhatsApp">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </a>
                    )}
                    {socials.facebook && (
                      <a href={socials.facebook.startsWith('http') ? socials.facebook : `https://facebook.com/${socials.facebook}`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-80 transition-opacity" title="Facebook">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </a>
                    )}
                    {socials.tiktok && (
                      <a href={`https://tiktok.com/@${socials.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-80 transition-opacity" title="TikTok">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 'slots' && (
              <div className="space-y-4">
                <button
                  onClick={() => setStep('select')}
                  className="text-sm" style={{ opacity: 0.5 }}
                >
                  &larr; Voltar
                </button>
                <div className="rounded-lg border p-6" style={surfaceStyle}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">{selectedService?.name}</p>
                      <p className="text-xs" style={{ opacity: 0.5 }}>com {selectedProf?.name}</p>
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => changeDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="h-9 px-3 text-sm border rounded-md font-mono tabular-nums"
                      style={{
                        backgroundColor: colors?.surface || '#ffffff',
                        borderColor: `${colors?.text || '#000'}20`,
                        color: colors?.text || '#1c1917',
                      }}
                    />
                  </div>

                  {loadingSlots ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: `${colors?.text || '#000'}08` }} />
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
                          className="h-10 text-sm font-medium border rounded-md font-mono tabular-nums transition-colors"
                          style={{
                            backgroundColor: `${colors?.text || '#000'}04`,
                            borderColor: `${colors?.text || '#000'}15`,
                            color: colors?.text || '#1c1917',
                            borderRadius: btnRadius,
                          }}
                        >
                          {new Date(slot.startAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 'form' && (
              <div className="space-y-4">
                <button
                  onClick={() => setStep('slots')}
                  className="text-sm" style={{ opacity: 0.5 }}
                >
                  &larr; Voltar
                </button>
                <div className="rounded-lg border p-6" style={surfaceStyle}>
                  <div className="mb-6 pb-4" style={{ borderBottomColor: `${colors?.text || '#000'}08`, borderBottomWidth: 1 }}>
                    <p className="font-medium">{selectedService?.name}</p>
                    <p className="text-xs" style={{ opacity: 0.5 }}>
                      {selectedProf?.name} &mdash;{' '}
                      {selectedSlot && new Date(selectedSlot.startAt).toLocaleString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
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
                        className="w-full h-10 px-3 text-sm border rounded-md focus:outline-none"
                        style={{
                          backgroundColor: colors?.surface || '#ffffff',
                          borderColor: `${colors?.text || '#000'}20`,
                          color: colors?.text || '#1c1917',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Telefone</label>
                      <input
                        value={clientForm.phone}
                        onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))}
                        required
                        placeholder="(11) 99999-9999"
                        className="w-full h-10 px-3 text-sm border rounded-md focus:outline-none"
                        style={{
                          backgroundColor: colors?.surface || '#ffffff',
                          borderColor: `${colors?.text || '#000'}20`,
                          color: colors?.text || '#1c1917',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>E-mail (opcional)</label>
                      <input
                        type="email"
                        value={clientForm.email}
                        onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full h-10 px-3 text-sm border rounded-md focus:outline-none"
                        style={{
                          backgroundColor: colors?.surface || '#ffffff',
                          borderColor: `${colors?.text || '#000'}20`,
                          color: colors?.text || '#1c1917',
                        }}
                      />
                    </div>
                    {error && (
                      <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={booking}
                      className="w-full h-10 font-medium text-sm disabled:opacity-50"
                      style={{
                        ...primaryStyle,
                        borderRadius: btnRadius,
                      }}
                    >
                      {booking ? 'Agendando...' : 'Confirmar agendamento'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

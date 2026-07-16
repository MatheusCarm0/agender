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
      if (!res.ok) throw new Error('Erro ao buscar horarios');
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
    <div className="min-h-screen" style={bgStyle}>
      <header
        className="border-b px-6 py-4"
        style={{
          ...surfaceStyle,
          borderBottomColor: `${colors?.text || '#000'}15`,
        }}
      >
        <h1 className="text-xl font-semibold">{business.name}</h1>
        {customization?.headline && (
          <p className="text-sm mt-0.5" style={{ opacity: 0.7 }}>{customization.headline}</p>
        )}
        {!customization?.headline && (
          <p className="text-sm" style={{ opacity: 0.5 }}>Agende seu horario online</p>
        )}
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
                2. Horario
              </span>
              <span>/</span>
              <span style={step === 'form' ? { color: colors?.primary || '#0d9488', fontWeight: 500, opacity: 1 } : {}}>
                3. Seus dados
              </span>
            </div>

            {step === 'select' && (
              <div className="space-y-6">
                {business.professionals.length === 0 ? (
                  <p className="text-center py-12" style={{ opacity: 0.5 }}>Nenhum profissional disponivel no momento.</p>
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
                        <h2 className="text-sm font-medium mb-3" style={{ opacity: 0.7 }}>Escolha o servico</h2>
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
                      <a href={`https://instagram.com/${socials.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ opacity: 0.5 }}>
                        Instagram
                      </a>
                    )}
                    {socials.whatsapp && (
                      <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ opacity: 0.5 }}>
                        WhatsApp
                      </a>
                    )}
                    {socials.facebook && (
                      <a href={`https://facebook.com/${socials.facebook}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ opacity: 0.5 }}>
                        Facebook
                      </a>
                    )}
                    {socials.tiktok && (
                      <a href={`https://tiktok.com/@${socials.tiktok}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ opacity: 0.5 }}>
                        TikTok
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
                    <p className="text-sm text-center py-8" style={{ opacity: 0.5 }}>Nenhum horario disponivel nesta data.</p>
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

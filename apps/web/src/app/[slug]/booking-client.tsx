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

interface Slot {
  startAt: string;
  endAt: string;
}

type Step = 'select' | 'slots' | 'form' | 'done';

export default function BookingClient({ business }: { business: Business }) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">{business.name}</h1>
        <p className="text-sm text-gray-500">Agende seu horario online</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {step === 'done' ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Agendamento confirmado!</h2>
            <p className="text-sm text-gray-600 mb-1">
              {selectedService?.name} com {selectedProf?.name}
            </p>
            <p className="text-sm text-gray-600 mb-4">
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
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              Fazer outro agendamento
            </button>
          </div>
        ) : (
          <>
            {/* breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
              <span className={step === 'select' ? 'text-teal-600 font-medium' : ''}>
                1. Escolher
              </span>
              <span>/</span>
              <span className={step === 'slots' ? 'text-teal-600 font-medium' : ''}>
                2. Horario
              </span>
              <span>/</span>
              <span className={step === 'form' ? 'text-teal-600 font-medium' : ''}>
                3. Seus dados
              </span>
            </div>

            {step === 'select' && (
              <div className="space-y-6">
                {business.professionals.length === 0 ? (
                  <p className="text-gray-500 text-center py-12">Nenhum profissional disponivel no momento.</p>
                ) : (
                  <>
                    <div>
                      <h2 className="text-sm font-medium text-gray-700 mb-3">Escolha o profissional</h2>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {business.professionals.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => selectProfessional(p)}
                            className={`text-left p-4 rounded-lg border transition-colors ${
                              selectedProf?.id === p.id
                                ? 'border-teal-500 bg-teal-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <p className="font-medium text-gray-900">{p.name}</p>
                            {p.bio && <p className="text-xs text-gray-500 mt-1">{p.bio}</p>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedProf && selectedProf.services.length > 0 && (
                      <div>
                        <h2 className="text-sm font-medium text-gray-700 mb-3">Escolha o servico</h2>
                        <div className="space-y-2">
                          {selectedProf.services.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => selectService(s)}
                              className="w-full text-left p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 flex items-center justify-between transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{s.name}</p>
                                <p className="text-xs text-gray-500">{s.durationMin} min</p>
                              </div>
                              <span className="text-sm font-medium text-gray-900 font-mono tabular-nums">
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

            {step === 'slots' && (
              <div className="space-y-4">
                <button
                  onClick={() => setStep('select')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  &larr; Voltar
                </button>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-gray-900">{selectedService?.name}</p>
                      <p className="text-xs text-gray-500">com {selectedProf?.name}</p>
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => changeDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="h-9 px-3 text-sm border border-gray-300 rounded-md bg-white text-gray-900 font-mono tabular-nums"
                    />
                  </div>

                  {loadingSlots ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">Nenhum horario disponivel nesta data.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.startAt}
                          onClick={() => pickSlot(slot)}
                          className="h-10 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-md hover:border-teal-500 hover:bg-teal-50 font-mono tabular-nums transition-colors"
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
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  &larr; Voltar
                </button>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{selectedService?.name}</p>
                    <p className="text-xs text-gray-500">
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">Seu nome</label>
                      <input
                        value={clientForm.name}
                        onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
                        required
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                      <input
                        value={clientForm.phone}
                        onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))}
                        required
                        placeholder="(11) 99999-9999"
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">E-mail (opcional)</label>
                      <input
                        type="email"
                        value={clientForm.email}
                        onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={booking}
                      className="w-full h-10 bg-teal-600 text-white font-medium text-sm rounded-md hover:bg-teal-700 disabled:opacity-50"
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

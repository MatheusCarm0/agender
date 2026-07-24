'use client';

import { useState, useEffect, useRef } from 'react';
import CardPaymentForm from './card-payment-form';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Service { id: string; name: string; durationMin: number; price: number }
interface Professional { id: string; name: string; bio: string | null; avatarUrl: string | null; services: Service[] }
interface Business { id: string; slug: string; name: string; timezone: string; logoUrl?: string; coverUrl?: string; acceptingBookings?: boolean; bookingPaymentPolicy?: 'none' | 'deposit' | 'full'; depositPercent?: number | null; mpPublicKey?: string | null; professionals: Professional[] }
interface Customization {
  theme: { palette: string; colors: { background: string; surface: string; primary: string; text: string }; font: string; background: { type: string; value: string; gradient?: { from: string; to: string; direction: string } }; logoUrl?: string; coverUrl?: string; buttonStyle: string; layout: string; overlayOpacity?: number; backgroundEffect?: string; containerStyle?: string };
  links: { label: string; url: string; icon?: string; thumbnailUrl?: string; style?: string; type?: 'link' | 'heading' | 'divider' | 'text' | 'spacer' }[];
  socials: { instagram?: string; whatsapp?: string; facebook?: string; tiktok?: string };
  headline: string | null; about: string | null; welcomeMsg?: string | null;
  address?: { street?: string; city?: string; state?: string; zip?: string } | null;
  gallery?: string[]; showHours?: boolean; faviconUrl?: string | null;
}
interface WorkingHour { weekday: number; startTime: string; endTime: string }
interface Slot { startAt: string; endAt: string }

type Step = 'home' | 'select' | 'slots' | 'form' | 'payment' | 'done';

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

function btnRadius(style?: string): string {
  if (style === 'pill') return '999px';
  if (style === 'square') return '4px';
  return '8px';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function bgStyle(bg: Customization['theme']['background'], overlayOpacity?: number): React.CSSProperties {
  if (bg.type === 'gradient' && bg.gradient) {
    return { background: `linear-gradient(${bg.gradient.direction}, ${bg.gradient.from}, ${bg.gradient.to})` };
  }
  if (bg.type === 'image' && bg.value) {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,${overlayOpacity ?? 0}), rgba(0,0,0,${overlayOpacity ?? 0})), url(${bg.value})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
    };
  }
  return { backgroundColor: bg.value || '#f9fafb' };
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STEP_ORDER: Step[] = ['home', 'select', 'slots', 'form', 'payment', 'done'];

function getOpenStatus(workingHours: WorkingHour[], timezone: string): { isOpen: boolean; label: string } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    const dayName = parts.find((p) => p.type === 'weekday')?.value || '';
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDay = dayMap[dayName] ?? now.getDay();
    const currentTime = `${hour}:${minute}`;

    const todayHours = workingHours.filter((wh) => wh.weekday === currentDay);
    for (const wh of todayHours) {
      if (currentTime >= wh.startTime && currentTime < wh.endTime) {
        return { isOpen: true, label: `Aberto · Fecha às ${wh.endTime}` };
      }
    }

    for (let offset = 0; offset < 7; offset++) {
      const nextDay = (currentDay + offset) % 7;
      const nextHours = workingHours.filter((wh) => wh.weekday === nextDay);
      if (nextHours.length > 0) {
        if (offset === 0 && nextHours.some((wh) => currentTime < wh.startTime)) {
          const next = nextHours.find((wh) => currentTime < wh.startTime)!;
          return { isOpen: false, label: `Fechado · Abre às ${next.startTime}` };
        }
        if (offset > 0) {
          const dayLabel = offset === 1 ? 'amanhã' : DAY_NAMES[nextDay];
          return { isOpen: false, label: `Fechado · Abre ${dayLabel} às ${nextHours[0].startTime}` };
        }
      }
    }
    return { isOpen: false, label: 'Fechado' };
  } catch {
    return { isOpen: false, label: '' };
  }
}

function StepIndicator({ current, primary }: { current: 'select' | 'slots' | 'form'; primary: string }) {
  const steps = [
    { key: 'select', label: 'Escolher' },
    { key: 'slots', label: 'Horário' },
    { key: 'form', label: 'Confirmar' },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-0 w-full mb-5">
      {steps.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center ">
              <div className="flex items-center w-full">
                {i > 0 && <div className="flex-1 h-0.5 transition-colors" style={{ backgroundColor: isDone || isActive ? primary : `${primary}25` }} />}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all"
                  style={{
                    backgroundColor: isDone || isActive ? primary : 'transparent',
                    color: isDone || isActive ? '#fff' : `${primary}80`,
                    border: `2px solid ${isDone || isActive ? primary : `${primary}30`}`,
                  }}>
                  {isDone ? (
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                  ) : i + 1}
                </div>
                {i < steps.length - 1 && <div className="flex-1 h-0.5 transition-colors" style={{ backgroundColor: isDone ? primary : `${primary}25` }} />}
              </div>
              <span className="text-[11px] mt-1.5 font-medium" style={{ color: isActive ? primary : `${primary}60` }}>{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BookingClient({ business, customization, workingHours }: { business: Business; customization?: Customization | null; workingHours?: WorkingHour[] }) {
  const [step, setStep] = useState<Step>('home');
  const [prevStep, setPrevStep] = useState<Step>('home');
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', marketingOptIn: false });
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<{ valid: boolean; discountAmount?: number; total?: number; message: string } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Pagamento no agendamento (quando o negócio exige)
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [payDue, setPayDue] = useState(0);
  const [payInfo, setPayInfo] = useState<{ status: string; pixQrCode?: string | null; pixQrCodeBase64?: string | null; amount: number; expiresAt?: string | null } | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [payMethod, setPayMethod] = useState<'pix' | 'card'>('pix');
  const [copied, setCopied] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Relógio do countdown do PIX — só roda enquanto há cobrança pendente com prazo.
  useEffect(() => {
    if (!payInfo?.expiresAt || payInfo.status !== 'pending') return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [payInfo?.expiresAt, payInfo?.status]);

  const payRemainingSec = payInfo?.expiresAt
    ? Math.max(0, Math.floor((new Date(payInfo.expiresAt).getTime() - nowTs) / 1000))
    : null;

  function formatCountdown(totalSec: number): string {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function startPixPayment() {
    if (!appointmentId) return;
    setPayLoading(true); setPayError('');
    try {
      const res = await fetch(`${API_URL}/public/v1/${business.slug}/appointments/${appointmentId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'pix' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Erro ao gerar o pagamento');
      }
      const data = await res.json();
      if (data.alreadyPaid) { stopPolling(); navigate('done'); return; }
      setPayInfo(data.payment);
      startStatusPolling();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Erro ao gerar o pagamento');
    }
    setPayLoading(false);
  }

  function startStatusPolling() {
    stopPolling();
    pollRef.current = setInterval(checkPaymentStatus, 4000);
  }

  async function checkPaymentStatus() {
    if (!appointmentId) return;
    try {
      const res = await fetch(`${API_URL}/public/v1/${business.slug}/appointments/${appointmentId}/pay/status`);
      if (!res.ok) return;
      const data = await res.json();
      setPayInfo((prev) => (prev ? { ...prev, status: data.status } : data));
      if (data.status === 'confirmed') { stopPolling(); navigate('done'); }
      if (data.status === 'expired' || data.status === 'failed') { stopPolling(); }
    } catch {
      // silencioso; próxima iteração tenta de novo
    }
  }

  function copyPixCode() {
    if (!payInfo?.pixQrCode) return;
    navigator.clipboard?.writeText(payInfo.pixQrCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

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
  const address = customization?.address;
  const gallery = customization?.gallery;
  const showHours = customization?.showHours;
  const hasAddress = address && Object.values(address).some(Boolean);
  const hasSocials = socials && Object.values(socials).some(Boolean);
  const hasLinks = links && links.length > 0 && links.some((l) => l.label);
  const hoursByDay = (workingHours || []).reduce<Record<number, WorkingHour[]>>((acc, wh) => { (acc[wh.weekday] ??= []).push(wh); return acc; }, {});
  const openStatus = workingHours && workingHours.length > 0 ? getOpenStatus(workingHours, business.timezone) : null;
  const bgTheme = customization?.theme?.background;
  const overlayOpacity = customization?.theme?.overlayOpacity;
  const backgroundEffect = customization?.theme?.backgroundEffect || 'none';
  const containerStyle = customization?.theme?.containerStyle || 'solid';

  // Totais do agendamento (cupom aplicado) e cobrança online esperada.
  const appliedDiscount = couponStatus?.valid ? couponStatus.discountAmount ?? 0 : 0;
  const bookingTotal = selectedService ? Math.max(0, selectedService.price - appliedDiscount) : 0;
  const paymentPolicy = business.bookingPaymentPolicy || 'none';
  const expectedCharge =
    paymentPolicy === 'full'
      ? bookingTotal
      : paymentPolicy === 'deposit'
      ? Math.round(bookingTotal * ((business.depositPercent ?? 0) / 100) * 100) / 100
      : 0;

  function navigate(to: Step) {
    setPrevStep(step);
    setStep(to);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectProfessional(p: Professional) { setSelectedProf(p); setSelectedService(null); }

  function selectService(s: Service) {
    setSelectedService(s);
    // Desconto validado vale para um serviço específico — revalidar ao trocar.
    setCouponStatus(null);
    navigate('slots');
    const d = new Date();
    // Data local, não UTC — ver generateDates.
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(today);
    loadSlots(today, selectedProf!.id, s.id);
  }

  async function loadSlots(date: string, profId?: string, svcId?: string) {
    const pId = profId || selectedProf?.id;
    const sId = svcId || selectedService?.id;
    if (!pId || !sId) return;
    setLoadingSlots(true); setError('');
    try {
      const res = await fetch(`${API_URL}/public/v1/${business.slug}/availability?professionalId=${pId}&serviceId=${sId}&dateFrom=${date}&dateTo=${date}`);
      if (!res.ok) throw new Error('Erro ao buscar horários');
      setSlots(await res.json());
    } catch { setSlots([]); }
    setLoadingSlots(false);
  }

  function changeDate(date: string) { setSelectedDate(date); setSelectedSlot(null); loadSlots(date); }
  function pickSlot(slot: Slot) { setSelectedSlot(slot); navigate('form'); }

  async function validateCoupon() {
    if (!couponCode.trim() || !selectedProf || !selectedService) return;
    setValidatingCoupon(true);
    try {
      const res = await fetch(`${API_URL}/public/v1/${business.slug}/coupons/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          professionalId: selectedProf.id,
          serviceId: selectedService.id,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCouponStatus({ valid: false, message: body.message || 'Cupom inválido ou expirado' });
      } else {
        setCouponStatus({
          valid: true,
          discountAmount: body.discountAmount,
          total: body.total,
          message: `Cupom ${body.code} aplicado: −${formatCurrency(body.discountAmount)}`,
        });
      }
    } catch {
      setCouponStatus({ valid: false, message: 'Não foi possível validar o cupom. Tente de novo.' });
    }
    setValidatingCoupon(false);
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProf || !selectedService || !selectedSlot) return;
    const phone = clientForm.phone.replace(/\D/g, '');
    if (phone.length < 10) { setError('Telefone deve ter pelo menos 10 dígitos'); return; }
    setBooking(true); setError('');
    const idempotencyKey = crypto.randomUUID();
    try {
      const res = await fetch(`${API_URL}/public/v1/${business.slug}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          professionalId: selectedProf.id, serviceId: selectedService.id,
          startAt: selectedSlot.startAt, clientName: clientForm.name,
          clientPhone: phone,
          ...(clientForm.email ? { clientEmail: clientForm.email } : {}),
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
          ...(clientForm.marketingOptIn ? { marketingOptIn: true } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Erro ao agendar');
      }
      const created = await res.json();
      if (created.paymentRequired && created.payment) {
        setAppointmentId(created.id);
        setPayDue(created.payment.amount);
        setPayInfo(null);
        navigate('payment');
      } else {
        navigate('done');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar');
    }
    setBooking(false);
  }

  function goHome() {
    stopPolling();
    navigate('home');
    setSelectedProf(null); setSelectedService(null); setSelectedSlot(null);
    setClientForm({ name: '', phone: '', email: '', marketingOptIn: false }); setError('');
    setCouponCode(''); setCouponStatus(null);
    setAppointmentId(null); setPayInfo(null); setPayDue(0); setPayError(''); setPayMethod('pix');
  }

  function generateDates(): { date: string; label: string; dayName: string; isToday: boolean }[] {
    const dates: { date: string; label: string; dayName: string; isToday: boolean }[] = [];
    const today = new Date();
    // Data LOCAL (não toISOString/UTC): à noite o dia UTC já virou e a data
    // enviada à API ficaria um dia à frente do rótulo mostrado.
    const localDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        date: localDateStr(d),
        label: d.getDate().toString(),
        dayName: DAY_NAMES[d.getDay()],
        isToday: i === 0,
      });
    }
    return dates;
  }

  function generateCalendarLink(): string {
    if (!selectedSlot || !selectedService || !selectedProf) return '';
    const start = new Date(selectedSlot.startAt);
    const end = new Date(selectedSlot.endAt);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = encodeURIComponent(`${selectedService.name} - ${business.name}`);
    const details = encodeURIComponent(`Com ${selectedProf.name}`);
    const location = hasAddress ? encodeURIComponent([address!.street, address!.city, address!.state].filter(Boolean).join(', ')) : '';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  }

  const addressStr = hasAddress ? [address!.street, [address!.city, address!.state].filter(Boolean).join(' - '), address!.zip].filter(Boolean).join(', ') : '';
  const mapsUrl = hasAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressStr)}` : '';

  const slideDirection = STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(prevStep) ? 'left' : 'right';

  return (
    <div
      className={`min-h-screen flex flex-col items-center relative ${backgroundEffect === 'dots' ? 'bg-effect-dots' : backgroundEffect === 'grid' ? 'bg-effect-grid' : backgroundEffect === 'noise' ? 'bg-effect-noise' : backgroundEffect === 'animated-gradient' ? 'bg-effect-animated-gradient' : ''}`}
      style={{ ...(bgTheme ? bgStyle(bgTheme, overlayOpacity) : { backgroundColor: bg }), color: text, fontFamily: fontFamily(customization?.theme?.font || 'inter') }}
    >
      {/* Cover */}
      {coverUrl && bgTheme?.type !== 'image' && (
        <div className="w-full h-44 sm:h-52 bg-cover bg-center" style={{ backgroundImage: `url(${coverUrl})` }} />
      )}

      {/* Profile header */}
      <div className={`flex flex-col items-center text-center w-full max-w-[680px] px-6 ${coverUrl && bgTheme?.type !== 'image' ? '-mt-12' : 'mt-10'}`}>
        <div className="stagger-item avatar-ring">
          {logoUrl ? (
            <img src={logoUrl} alt={business.name} className="w-24 h-24 rounded-full object-cover border-4 shadow-md" style={{ borderColor: surface }} />
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 shadow-md" style={{ backgroundColor: primary, borderColor: surface }}>
              {headline[0]?.toUpperCase() || 'N'}
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold mt-4 stagger-item">{headline}</h1>
        {about && <p className="text-sm mt-1 max-w-sm stagger-item" style={{ opacity: 0.65 }}>{about}</p>}

        {/* Open/closed status */}
        {showHours && openStatus && openStatus.label && (
          <button type="button" onClick={() => setHoursExpanded(!hoursExpanded)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer stagger-item"
            style={{ backgroundColor: openStatus.isOpen ? '#16A34A20' : '#DC262620', color: openStatus.isOpen ? '#16A34A' : '#DC2626' }}
            aria-label={hoursExpanded ? 'Ocultar horários' : 'Ver horários'}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
            {openStatus.label}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${hoursExpanded ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
          </button>
        )}

        {/* Expanded hours */}
        {hoursExpanded && workingHours && workingHours.length > 0 && (
          <div className="mt-2 p-3 rounded-lg text-xs w-full max-w-xs" style={{ backgroundColor: `${surface}`, border: `1px solid ${text}12` }}>
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const hours = hoursByDay[day];
              return (
                <div key={day} className="flex justify-between py-0.5">
                  <span style={{ opacity: 0.6 }}>{DAY_NAMES[day]}</span>
                  <span style={{ opacity: hours ? 0.8 : 0.4 }}>{hours ? hours.map((h) => `${h.startTime} - ${h.endTime}`).join(', ') : 'Fechado'}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Social icons */}
        {hasSocials && (
          <div className="flex gap-3 mt-3 stagger-item">
            {socials!.instagram && (
              <a href={`https://instagram.com/${socials!.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-10 h-10 rounded-full flex items-center justify-center social-icon" style={{ backgroundColor: `${text}10`, opacity: 0.7 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            )}
            {socials!.whatsapp && (
              <a href={`https://wa.me/${socials!.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                className="w-10 h-10 rounded-full flex items-center justify-center social-icon" style={{ backgroundColor: `${text}10`, opacity: 0.7 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
            {socials!.facebook && (
              <a href={socials!.facebook.startsWith('http') ? socials!.facebook : `https://facebook.com/${socials!.facebook}`} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="w-10 h-10 rounded-full flex items-center justify-center social-icon" style={{ backgroundColor: `${text}10`, opacity: 0.7 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {socials!.tiktok && (
              <a href={`https://tiktok.com/@${socials!.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                className="w-10 h-10 rounded-full flex items-center justify-center social-icon" style={{ backgroundColor: `${text}10`, opacity: 0.7 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Content area with transitions */}
      <div ref={contentRef} className={`w-full max-w-[680px] px-6 pb-12 mt-6 flex flex-col items-center ${containerStyle === 'glass' ? 'container-glass rounded-2xl mx-4 py-6' : containerStyle === 'frosted' ? 'container-frosted rounded-3xl mx-4 py-8' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
        <style>{`
          @keyframes slideInLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes slideInRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
          .step-animate { animation: ${slideDirection === 'left' ? 'slideInLeft' : 'slideInRight'} 0.2s ease-out; }
          @keyframes checkDraw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
          @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .check-animate { animation: scaleIn 0.3s ease-out; }
          .check-animate path { stroke-dasharray: 24; animation: checkDraw 0.4s ease-out 0.2s both; }

          @keyframes staggerFadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .stagger-item {
            opacity: 0;
            animation: staggerFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
          .stagger-item:nth-child(1) { animation-delay: 0.05s; }
          .stagger-item:nth-child(2) { animation-delay: 0.12s; }
          .stagger-item:nth-child(3) { animation-delay: 0.19s; }
          .stagger-item:nth-child(4) { animation-delay: 0.26s; }
          .stagger-item:nth-child(5) { animation-delay: 0.33s; }
          .stagger-item:nth-child(6) { animation-delay: 0.40s; }
          .stagger-item:nth-child(7) { animation-delay: 0.47s; }
          .stagger-item:nth-child(8) { animation-delay: 0.54s; }
          .stagger-item:nth-child(9) { animation-delay: 0.61s; }
          .stagger-item:nth-child(10) { animation-delay: 0.68s; }

          .link-btn {
            transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease;
          }
          .link-btn:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 8px 25px -5px rgba(0,0,0,0.15);
          }
          .link-btn:active {
            transform: translateY(0) scale(0.98);
            box-shadow: none;
          }

          .cta-btn {
            transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, filter 0.2s ease;
          }
          .cta-btn:hover {
            transform: translateY(-2px) scale(1.03);
            box-shadow: 0 12px 30px -8px var(--pub-primary-glow, rgba(0,0,0,0.25));
            filter: brightness(1.08);
          }
          .cta-btn:active {
            transform: translateY(0) scale(0.97);
            box-shadow: none;
          }

          .social-icon {
            transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s ease;
          }
          .social-icon:hover {
            transform: translateY(-3px) scale(1.15);
          }

          .avatar-ring {
            position: relative;
          }
          .avatar-ring::before {
            content: '';
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            border: 2px solid ${primary}40;
            animation: ringPulse 3s ease-in-out infinite;
          }
          @keyframes ringPulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.04); }
          }

          .gallery-item {
            transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
          }
          .gallery-item:hover {
            transform: scale(1.06);
            box-shadow: 0 8px 20px -4px rgba(0,0,0,0.2);
            z-index: 2;
          }

          .bg-effect-dots {
            background-image: radial-gradient(circle, ${primary}18 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .bg-effect-grid {
            background-image: linear-gradient(${text}08 1px, transparent 1px), linear-gradient(90deg, ${text}08 1px, transparent 1px);
            background-size: 40px 40px;
          }
          .bg-effect-noise {
            position: relative;
          }
          .bg-effect-noise::after {
            content: '';
            position: absolute;
            inset: 0;
            opacity: 0.035;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
            background-repeat: repeat;
            background-size: 256px 256px;
            pointer-events: none;
            z-index: 0;
          }
          @keyframes meshGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .bg-effect-animated-gradient {
            background-size: 400% 400%;
            animation: meshGradient 12s ease infinite;
          }

          .container-glass {
            background: ${surface}cc;
            backdrop-filter: blur(20px) saturate(1.4);
            -webkit-backdrop-filter: blur(20px) saturate(1.4);
            border: 1px solid ${surface}40;
            box-shadow: 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 ${surface}60;
          }
          .container-frosted {
            background: ${surface}99;
            backdrop-filter: blur(40px) saturate(1.6);
            -webkit-backdrop-filter: blur(40px) saturate(1.6);
            border: 1px solid ${surface}30;
            box-shadow: 0 16px 48px rgba(0,0,0,0.12);
          }

          @media (prefers-reduced-motion: reduce) {
            .step-animate, .check-animate, .check-animate path,
            .stagger-item, .link-btn, .cta-btn, .social-icon, .gallery-item { animation: none !important; transition: none !important; }
            .stagger-item { opacity: 1; }
            .avatar-ring::before { animation: none; }
            .bg-effect-animated-gradient { animation: none; }
          }
        `}</style>

        {/* HOME */}
        {step === 'home' && (
          <div className="w-full max-w-md space-y-3 step-animate">
            {customization?.welcomeMsg && (
              <p className="text-center text-xs px-4 py-2 rounded-full mb-1 stagger-item" style={{ backgroundColor: `${primary}15`, color: primary }}>{customization.welcomeMsg}</p>
            )}
            {business.acceptingBookings === false ? (
              <div className="text-center py-4 px-4 rounded-lg stagger-item" style={{ backgroundColor: `${text}06`, border: `1px solid ${text}12`, borderRadius: radius }}>
                <p className="text-sm font-medium" style={{ color: text }}>Agendamento temporariamente indisponível</p>
                <p className="text-xs mt-1" style={{ opacity: 0.5 }}>Este negócio não está aceitando novos agendamentos no momento.</p>
              </div>
            ) : (
              <button onClick={() => navigate('select')} className="w-full py-3.5 text-sm font-semibold text-white shadow-sm cta-btn stagger-item" style={{ backgroundColor: primary, borderRadius: radius, ['--pub-primary-glow' as string]: `${primary}50` }}>
                Agendar horário
              </button>
            )}

            <a href={`/${business.slug}/conta`}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-medium transition-opacity hover:opacity-80 stagger-item"
              style={{ color: text, opacity: 0.6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              Já tem agendamento? Ver meus agendamentos
            </a>

            {hasLinks && links!.filter((l) => l.label || l.type === 'divider' || l.type === 'spacer').map((link, i) => {
              const blockType = link.type || 'link';
              if (blockType === 'heading') {
                return <h3 key={i} className="text-base font-bold pt-3 pb-1 stagger-item" style={{ color: text }}>{link.label}</h3>;
              }
              if (blockType === 'divider') {
                return <div key={i} className="w-full py-1 stagger-item"><div style={{ borderTop: `1px solid ${text}20` }} /></div>;
              }
              if (blockType === 'text') {
                return <p key={i} className="text-sm px-1 stagger-item" style={{ color: text, opacity: 0.7 }}>{link.label}</p>;
              }
              if (blockType === 'spacer') {
                return <div key={i} className="h-4 stagger-item" />;
              }
              const linkStyle = link.style || 'fill';
              const linkStyles: React.CSSProperties = linkStyle === 'outline'
                ? { backgroundColor: 'transparent', borderColor: `${text}30`, color: text, borderWidth: '2px' }
                : linkStyle === 'soft'
                ? { backgroundColor: `${primary}12`, borderColor: 'transparent', color: primary }
                : linkStyle === 'glass'
                ? { backgroundColor: `${surface}80`, borderColor: `${surface}40`, color: text, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: `0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 ${surface}60` }
                : { backgroundColor: surface, borderColor: `${text}15`, color: text };
              return (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center w-full py-3 px-4 text-sm font-medium border link-btn stagger-item"
                  style={{ ...linkStyles, borderRadius: radius, borderStyle: 'solid', gap: '0.75rem' }}>
                  {link.thumbnailUrl && (
                    <img src={link.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  {link.icon && !link.thumbnailUrl && (
                    <span className="text-lg shrink-0">{link.icon}</span>
                  )}
                  <span className="flex-1 text-center">{link.label}</span>
                </a>
              );
            })}

            {/* Gallery with lightbox */}
            {gallery && gallery.length > 0 && (
              <div className="pt-3 stagger-item">
                <div className="grid grid-cols-3 gap-1.5 rounded-lg overflow-hidden">
                  {gallery.slice(0, 6).map((url, i) => (
                    <button key={i} type="button" onClick={() => setLightboxIndex(i)} className="aspect-square cursor-pointer gallery-item relative overflow-hidden rounded">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Address with maps link */}
            {hasAddress && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 pt-2 text-xs no-underline transition-opacity hover:opacity-80 stagger-item" style={{ color: text, opacity: 0.6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <span className="underline">{addressStr}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            )}
          </div>
        )}

        {/* SELECT */}
        {step === 'select' && (
          <div className="w-full max-w-md space-y-4 step-animate">
            <button onClick={goHome} className="text-sm flex items-center gap-1 transition-opacity hover:opacity-70" style={{ opacity: 0.5 }} aria-label="Voltar ao início">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7-7 7 7 7" /></svg>
              Voltar
            </button>
            <StepIndicator current="select" primary={primary} />

            {business.professionals.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ opacity: 0.5 }}>Nenhum profissional disponível no momento.</p>
            ) : (
              <>
                <div>
                  <h2 className="text-sm font-medium mb-3" style={{ opacity: 0.7 }}>Escolha o profissional</h2>
                  <div className="space-y-2">
                    {business.professionals.map((p) => {
                      const hasServices = p.services.length > 0;
                      return (
                        <button key={p.id} onClick={() => hasServices && selectProfessional(p)} disabled={!hasServices}
                          className={`w-full text-left p-4 border transition-all ${hasServices ? 'hover:scale-[1.01]' : 'cursor-not-allowed'}`}
                          style={{ backgroundColor: surface, borderColor: selectedProf?.id === p.id ? primary : `${text}12`, borderRadius: radius, opacity: hasServices ? 1 : 0.55, ...(selectedProf?.id === p.id ? { boxShadow: `0 0 0 1px ${primary}` } : {}) }}>
                          <div className="flex items-center gap-3">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: primary }}>{p.name[0]?.toUpperCase()}</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{p.name}</p>
                              {p.bio && <p className="text-xs mt-0.5 truncate" style={{ opacity: 0.5 }}>{p.bio}</p>}
                              <p className="text-[11px] mt-0.5" style={{ opacity: 0.4 }}>
                                {hasServices
                                  ? `${p.services.length} ${p.services.length === 1 ? 'serviço' : 'serviços'} · a partir de ${formatCurrency(Math.min(...p.services.map((s) => s.price)))}`
                                  : 'Sem serviços disponíveis no momento'}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedProf && selectedProf.services.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium mb-3" style={{ opacity: 0.7 }}>Escolha o serviço</h2>
                    <div className={layout === 'cards' ? 'grid gap-2 grid-cols-2' : 'space-y-2'}>
                      {selectedProf.services.map((s) => (
                        <button key={s.id} onClick={() => selectService(s)}
                          className={`w-full text-left p-4 border transition-all hover:scale-[1.01] ${layout === 'cards' ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}
                          style={{ backgroundColor: surface, borderColor: `${text}12`, borderRadius: radius }}>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs mt-0.5" style={{ opacity: 0.5 }}>{s.durationMin} min</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums" style={{ color: primary, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(s.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* SLOTS */}
        {step === 'slots' && (
          <div className="w-full max-w-md space-y-4 step-animate">
            <button onClick={() => navigate('select')} className="text-sm flex items-center gap-1 transition-opacity hover:opacity-70" style={{ opacity: 0.5 }} aria-label="Voltar para seleção">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7-7 7 7 7" /></svg>
              Voltar
            </button>
            <StepIndicator current="slots" primary={primary} />

            <div className="border p-5" style={{ backgroundColor: surface, borderColor: `${text}12`, borderRadius: radius }}>
              <div className="mb-4">
                <p className="font-medium text-sm">{selectedService?.name}</p>
                <p className="text-xs" style={{ opacity: 0.5 }}>com {selectedProf?.name} · {selectedService?.durationMin} min · {selectedService ? formatCurrency(selectedService.price) : ''}</p>
              </div>

              {/* Date strip */}
              <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                {generateDates().map((d) => (
                  <button key={d.date} type="button" onClick={() => changeDate(d.date)}
                    className="flex flex-col items-center min-w-[52px] py-2 px-1.5 rounded-lg text-xs transition-all shrink-0"
                    style={{
                      backgroundColor: selectedDate === d.date ? primary : `${text}06`,
                      color: selectedDate === d.date ? '#fff' : text,
                      border: `1px solid ${selectedDate === d.date ? primary : `${text}10`}`,
                    }}>
                    <span className="font-medium" style={{ opacity: selectedDate === d.date ? 1 : 0.5 }}>{d.dayName}</span>
                    <span className="text-lg font-semibold mt-0.5">{d.label}</span>
                    {d.isToday && <span className="text-[9px] mt-0.5" style={{ opacity: 0.7 }}>Hoje</span>}
                  </button>
                ))}
              </div>

              {loadingSlots ? (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-11 rounded-lg animate-pulse" style={{ backgroundColor: `${text}08` }} />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ opacity: 0.5 }}>Nenhum horário disponível nesta data.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {slots.map((slot) => (
                    <button key={slot.startAt} onClick={() => pickSlot(slot)}
                      className="h-11 text-sm font-medium border tabular-nums transition-all hover:scale-[1.03]"
                      style={{ backgroundColor: `${text}04`, borderColor: `${text}15`, color: text, borderRadius: radius, fontVariantNumeric: 'tabular-nums', minWidth: '44px', minHeight: '44px' }}>
                      {new Date(slot.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <div className="w-full max-w-md space-y-4 step-animate">
            <button onClick={() => navigate('slots')} className="text-sm flex items-center gap-1 transition-opacity hover:opacity-70" style={{ opacity: 0.5 }} aria-label="Voltar para horários">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7-7 7 7 7" /></svg>
              Voltar
            </button>
            <StepIndicator current="form" primary={primary} />

            {/* Booking summary card */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: `${primary}08`, border: `1px solid ${primary}20` }}>
              <p className="text-xs font-medium mb-2" style={{ color: primary }}>Resumo do agendamento</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span style={{ opacity: 0.7 }}>Serviço</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ opacity: 0.7 }}>Profissional</span>
                  <span className="font-medium">{selectedProf?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ opacity: 0.7 }}>Duração</span>
                  <span className="font-medium">{selectedService?.durationMin} min</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ opacity: 0.7 }}>Data e hora</span>
                  <span className="font-medium">
                    {selectedSlot && new Date(selectedSlot.startAt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between">
                    <span style={{ opacity: 0.7 }}>Desconto ({couponStatus?.valid ? couponCode.toUpperCase() : ''})</span>
                    <span className="font-medium" style={{ color: '#16a34a' }}>−{formatCurrency(appliedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 mt-1" style={{ borderTop: `1px solid ${primary}15` }}>
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold" style={{ color: primary }}>{formatCurrency(bookingTotal)}</span>
                </div>
              </div>
              {paymentPolicy !== 'none' && expectedCharge > 0 && (
                <p className="text-xs mt-3 px-3 py-2 rounded-lg flex items-start gap-1.5" style={{ backgroundColor: `${primary}12`, color: primary }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                  <span>
                    {paymentPolicy === 'full'
                      ? `Para confirmar, você paga ${formatCurrency(expectedCharge)} por PIX na próxima etapa.`
                      : `Para confirmar, você paga um sinal de ${formatCurrency(expectedCharge)} por PIX na próxima etapa. O restante é pago no local.`}
                  </span>
                </p>
              )}
            </div>

            <div className="border p-5" style={{ backgroundColor: surface, borderColor: `${text}12`, borderRadius: radius }}>
              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Seu nome</label>
                  <input value={clientForm.name} onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} required
                    className="w-full h-11 px-3 text-sm border focus:outline-none focus:ring-2" style={{ backgroundColor: surface, borderColor: `${text}20`, color: text, borderRadius: radius, ['--tw-ring-color' as string]: `${primary}40` }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Telefone</label>
                  <input value={clientForm.phone} onChange={(e) => setClientForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))} required placeholder="(11) 99999-9999" inputMode="numeric"
                    className="w-full h-11 px-3 text-sm border focus:outline-none focus:ring-2" style={{ backgroundColor: surface, borderColor: `${text}20`, color: text, borderRadius: radius, ['--tw-ring-color' as string]: `${primary}40` }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>E-mail (opcional)</label>
                  <input type="email" value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full h-11 px-3 text-sm border focus:outline-none focus:ring-2" style={{ backgroundColor: surface, borderColor: `${text}20`, color: text, borderRadius: radius, ['--tw-ring-color' as string]: `${primary}40` }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Cupom de desconto (opcional)</label>
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }} placeholder="CODIGO10"
                      className="flex-1 h-11 px-3 text-sm border focus:outline-none uppercase tracking-wider" style={{ backgroundColor: surface, borderColor: `${text}20`, color: text, borderRadius: radius, fontFamily: 'monospace' }} />
                    <button type="button" onClick={validateCoupon} disabled={!couponCode.trim() || validatingCoupon}
                      className="h-11 px-4 text-sm font-medium border disabled:opacity-40" style={{ borderColor: `${text}20`, color: text, borderRadius: radius }}>
                      {validatingCoupon ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  {couponStatus && (
                    <p className="text-xs mt-1.5 px-2 py-1 rounded" style={{ backgroundColor: couponStatus.valid ? '#f0fdf4' : '#fef2f2', color: couponStatus.valid ? '#16a34a' : '#dc2626' }}>
                      {couponStatus.message}
                    </p>
                  )}
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientForm.marketingOptIn}
                    onChange={(e) => setClientForm((f) => ({ ...f, marketingOptIn: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded accent-current"
                    style={{ accentColor: primary }}
                  />
                  <span className="text-xs" style={{ opacity: 0.6 }}>
                    Aceito receber promoções e novidades por WhatsApp ou e-mail
                  </span>
                </label>
                {error && <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>{error}</p>}
                <button type="submit" disabled={booking}
                  className="w-full h-12 font-semibold text-sm text-white disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: primary, borderRadius: radius }}>
                  {booking ? 'Agendando...' : 'Confirmar agendamento'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PAYMENT */}
        {step === 'payment' && (
          <div className="w-full max-w-md space-y-4 step-animate">
            <div className="border p-6" style={{ backgroundColor: surface, borderColor: `${text}12`, borderRadius: radius }}>
              <div className="text-center mb-5">
                <p className="text-xs font-medium" style={{ color: primary }}>Falta pouco</p>
                <h2 className="text-lg font-bold mt-1">
                  {paymentPolicy === 'deposit' ? 'Pague o sinal para confirmar' : 'Pague para confirmar'}
                </h2>
                <p className="text-sm mt-1" style={{ opacity: 0.6 }}>
                  Seu horário fica reservado enquanto o pagamento não expira.
                </p>
                <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: primary, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(payDue)}
                </p>
                {paymentPolicy === 'deposit' && bookingTotal > payDue && (
                  <p className="text-xs mt-1" style={{ opacity: 0.55 }}>
                    O restante ({formatCurrency(bookingTotal - payDue)}) você paga no local.
                  </p>
                )}
              </div>

              {!payInfo && (
                <div className="space-y-4">
                  {business.mpPublicKey && (
                    <div className="flex gap-2 p-1 rounded-lg" style={{ backgroundColor: `${text}08` }}>
                      {([['pix', 'PIX'], ['card', 'Cartão']] as const).map(([m, label]) => (
                        <button key={m} type="button" onClick={() => { setPayMethod(m); setPayError(''); }}
                          className="flex-1 py-2 text-sm font-medium transition-all"
                          style={{
                            backgroundColor: payMethod === m ? surface : 'transparent',
                            color: payMethod === m ? primary : text,
                            opacity: payMethod === m ? 1 : 0.55,
                            borderRadius: radius,
                            boxShadow: payMethod === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {payMethod === 'pix' ? (
                    <button
                      type="button"
                      onClick={startPixPayment}
                      disabled={payLoading}
                      className="w-full h-12 font-semibold text-sm text-white disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: primary, borderRadius: radius }}
                    >
                      {payLoading ? 'Gerando PIX...' : 'Pagar com PIX'}
                    </button>
                  ) : (
                    appointmentId && business.mpPublicKey && (
                      <CardPaymentForm
                        slug={business.slug}
                        appointmentId={appointmentId}
                        publicKey={business.mpPublicKey}
                        theme={{ primary, text, surface, radius }}
                        onConfirmed={() => { stopPolling(); navigate('done'); }}
                        onPending={() => { setPayError('Pagamento em análise. Você receberá a confirmação em instantes.'); }}
                      />
                    )
                  )}
                </div>
              )}

              {payInfo && (payInfo.status === 'pending') && (
                <div className="space-y-4">
                  {payInfo.pixQrCodeBase64 && (
                    <div className="flex justify-center">
                      <img
                        src={`data:image/png;base64,${payInfo.pixQrCodeBase64}`}
                        alt="QR Code PIX"
                        className="w-52 h-52 rounded-lg border"
                        style={{ borderColor: `${text}12` }}
                      />
                    </div>
                  )}
                  {payInfo.pixQrCode && (
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>PIX copia e cola</label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={payInfo.pixQrCode}
                          className="flex-1 h-10 px-3 text-xs border truncate"
                          style={{ backgroundColor: `${text}04`, borderColor: `${text}15`, color: text, borderRadius: radius, fontFamily: 'monospace' }}
                        />
                        <button
                          type="button"
                          onClick={copyPixCode}
                          className="h-10 px-4 text-sm font-medium border shrink-0"
                          style={{ borderColor: `${text}20`, color: text, borderRadius: radius }}
                        >
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-sm" style={{ opacity: 0.6 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                    Aguardando confirmação do pagamento...
                  </div>
                  {payRemainingSec !== null && payRemainingSec > 0 && (
                    <p className="text-xs text-center tabular-nums" style={{ opacity: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                      Este código PIX expira em {formatCountdown(payRemainingSec)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={checkPaymentStatus}
                    className="w-full py-2.5 text-sm font-medium border transition-all hover:scale-[1.01]"
                    style={{ borderColor: `${text}15`, color: text, borderRadius: radius }}
                  >
                    Já paguei, verificar
                  </button>
                </div>
              )}

              {payInfo && (payInfo.status === 'expired' || payInfo.status === 'failed') && (
                <div className="text-center space-y-3">
                  <p className="text-sm px-3 py-2 rounded" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                    O pagamento não foi concluído a tempo e a reserva foi liberada.
                  </p>
                  <button onClick={goHome} className="w-full py-3 text-sm font-medium" style={{ color: primary }}>
                    Tentar de novo
                  </button>
                </div>
              )}

              {payError && (
                <p className="text-xs mt-3 px-3 py-2 rounded" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>{payError}</p>
              )}

              {(!payInfo || payInfo.status === 'pending') && (
                <div className="text-center mt-4 pt-4" style={{ borderTop: `1px solid ${text}10` }}>
                  <button onClick={goHome} className="text-xs transition-opacity hover:opacity-80" style={{ opacity: 0.5, color: text }}>
                    Desistir e voltar ao início
                  </button>
                  <p className="text-[10px] mt-1" style={{ opacity: 0.35 }}>
                    Reservas não pagas são liberadas automaticamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="w-full max-w-md space-y-4 step-animate">
            <div className="border p-8 text-center" style={{ backgroundColor: surface, borderColor: `${text}12`, borderRadius: radius }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 check-animate" style={{ backgroundColor: `${primary}15` }}>
                <svg width="32" height="32" fill="none" stroke={primary} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Agendamento confirmado!</h2>

              <div className="text-sm space-y-1 mb-6" style={{ opacity: 0.7 }}>
                <p className="font-medium">{selectedService?.name}</p>
                <p>com {selectedProf?.name} · {selectedService?.durationMin} min</p>
                <p>{selectedSlot && new Date(selectedSlot.startAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                <p className="font-semibold text-base mt-2" style={{ color: primary }}>{formatCurrency(bookingTotal)}</p>
                {payDue > 0 && (
                  <p className="text-xs" style={{ opacity: 0.6 }}>
                    {payDue >= bookingTotal
                      ? `Pagamento de ${formatCurrency(payDue)} confirmado.`
                      : `Sinal de ${formatCurrency(payDue)} pago · restante no local.`}
                  </p>
                )}
              </div>

              {hasAddress && (
                <div className="text-xs mb-4 p-3 rounded-lg" style={{ backgroundColor: `${text}05` }}>
                  <p className="font-medium mb-0.5" style={{ opacity: 0.6 }}>Endereço</p>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary }} className="underline">{addressStr}</a>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <a href={generateCalendarLink()} target="_blank" rel="noopener noreferrer"
                  className="w-full py-3 text-sm font-medium border flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  style={{ borderColor: `${text}15`, color: text, borderRadius: radius }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  Adicionar ao calendário
                </a>

                {socials?.whatsapp && (
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Agendei ${selectedService?.name} na ${business.name}! ${selectedSlot ? new Date(selectedSlot.startAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full py-3 text-sm font-medium border flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    style={{ borderColor: `${text}15`, color: text, borderRadius: radius }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Compartilhar no WhatsApp
                  </a>
                )}

                <button onClick={goHome} className="w-full py-3 text-sm font-medium transition-all hover:scale-[1.02]" style={{ color: primary }}>
                  Agendar outro horário
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gallery lightbox */}
      {lightboxIndex !== null && gallery && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxIndex(null)}>
          <button type="button" onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xl hover:bg-white/20" aria-label="Fechar">×</button>
          {lightboxIndex > 0 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }} className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20" aria-label="Anterior">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          {lightboxIndex < gallery.length - 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }} className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20" aria-label="Próxima">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
          <img src={gallery[lightboxIndex]} alt={`Foto ${lightboxIndex + 1}`} className="max-w-full max-h-[85vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* WhatsApp FAB */}
      {socials?.whatsapp && (
        <a href={`https://wa.me/${socials.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-40"
          style={{ backgroundColor: '#25D366' }} aria-label="Falar no WhatsApp">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      )}

      {/* Footer badge */}
      <footer className="w-full mt-auto pt-8 pb-6 flex justify-center">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium no-underline transition-all hover:scale-105"
          style={{
            backgroundColor: `${text}08`,
            color: text,
            opacity: 0.5,
            border: `1px solid ${text}06`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Crie sua página com Agender
        </a>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { LpOnboardingShell } from '@/components/onboarding/lp-shell';
import { Reveal } from '@/components/landing/reveal';
import { Sparkle } from '@/components/landing/decor';

type StepKey = 'welcome' | 'photo' | 'hours' | 'tour' | 'done';

const FLOW: Record<string, StepKey[]> = {
  professional: ['welcome', 'photo', 'hours', 'done'],
  receptionist: ['welcome', 'tour', 'done'],
  admin: ['welcome', 'tour', 'done'],
};

function firstName(name: string) {
  return name.split(' ').filter(Boolean)[0] || name;
}

function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="lp-btn lp-btn-primary" style={{ fontSize: 15, padding: '0.8rem 1.6rem', ...props.style }} />;
}
function SkipBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lp-text-muted)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--lp-font-display)', ...props.style }}
    />
  );
}

/* Aro-ícone gradiente (claymorphism) reutilizado nas telas */
function IconRing({ children, size = 74, pulse = false }: { children: React.ReactNode; size?: number; pulse?: boolean }) {
  return (
    <span
      className={pulse ? 'lp-anim-pulse lp-demo-check' : undefined}
      style={{ display: 'inline-grid', placeItems: 'center', width: size, height: size, borderRadius: 999, background: 'linear-gradient(145deg, var(--lp-mint), var(--lp-teal-deep))', color: '#fff', boxShadow: 'inset 0 2px 6px rgba(255,255,255,.45), var(--lp-shadow-teal)' }}
    >
      {children}
    </span>
  );
}

function WelcomeStep({ name, businessName, role, onNext }: { name: string; businessName: string; role: string; onNext: () => void }) {
  const lead: Record<string, string> = {
    professional: 'Você agora faz parte da equipe. Vamos deixar sua agenda pronta em menos de um minuto.',
    receptionist: 'Você vai cuidar dos agendamentos e dos clientes. Veja rapidamente o que dá pra fazer por aqui.',
    admin: 'Você tem acesso de gestão. Veja rapidamente o que dá pra fazer por aqui.',
  };
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <Sparkle top={-8} left="28%" size={22} color="#fbbf24" className="lp-anim-float-lg" />
      <Sparkle top={8} right="26%" size={16} color="#5eead4" className="lp-anim-drift" />
      <div style={{ marginBottom: 18 }}>
        <IconRing>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </IconRing>
      </div>
      <h1 className="lp-display" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', marginBottom: 10 }}>
        Bem-vindo, <span className="lp-grad-text">{firstName(name)}</span>!
      </h1>
      <p style={{ color: 'var(--lp-text-muted)', fontSize: 15, margin: '0 0 4px' }}>
        Você entrou na equipe de <span style={{ color: 'var(--lp-text-strong)', fontWeight: 600 }}>{businessName}</span>.
      </p>
      <p style={{ color: 'var(--lp-text-muted)', fontSize: 15, margin: '0 auto 26px', maxWidth: 400, lineHeight: 1.55 }}>{lead[role] ?? lead.admin}</p>
      <PrimaryBtn onClick={onNext} style={{ padding: '0.9rem 2rem' }}>Começar</PrimaryBtn>
    </div>
  );
}

function PhotoStep({ token, currentName, onNext, onSkip }: { token: string; currentName: string; onNext: () => void; onSkip: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Selecione um arquivo de imagem.'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('Imagem deve ter no máximo 5MB.'); return; }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSave() {
    if (!file) { onNext(); return; }
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (!res.ok) throw new Error('upload');
      const data = await res.json();
      await api('/professionals/me', { method: 'PATCH', token, body: JSON.stringify({ avatarUrl: data.url }) });
      onNext();
    } catch {
      setError('Erro ao enviar a foto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const initials = currentName.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 className="lp-display" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.6rem)', marginBottom: 6 }}>Sua foto de perfil</h2>
        <p style={{ color: 'var(--lp-text-muted)', fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>Ela aparece na página de agendamento, para o cliente saber quem vai atender.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          onClick={() => document.getElementById('avatar-input')?.click()}
          style={{ position: 'relative', width: 116, height: 116, borderRadius: 999, overflow: 'hidden', border: '3px solid #fff', cursor: 'pointer', boxShadow: 'var(--lp-shadow-teal)', padding: 0 }}
          aria-label="Escolher foto"
        >
          {preview ? (
            <img src={preview} alt="Prévia da foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 700, fontFamily: 'var(--lp-font-display)', background: 'linear-gradient(145deg, var(--lp-mint), var(--lp-teal-deep))', color: '#fff' }}>
              {initials}
            </span>
          )}
        </button>
        <button type="button" onClick={() => document.getElementById('avatar-input')?.click()} className="lp-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--lp-font-display)', fontSize: 14 }}>
          {preview ? 'Trocar foto' : 'Escolher foto'}
        </button>
        <input id="avatar-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] || null)} />
      </div>

      {error && <p className="lp-alert lp-alert-error" style={{ marginTop: 14, textAlign: 'center' }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 26 }}>
        <SkipBtn onClick={onSkip}>Pular por agora</SkipBtn>
        <PrimaryBtn onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.55 : 1 }}>{saving ? 'Enviando...' : 'Continuar'}</PrimaryBtn>
      </div>
    </div>
  );
}

function HoursStep({ token, onNext, onSkip }: { token: string; onNext: () => void; onSkip: () => void }) {
  const [days, setDays] = useState([
    { weekday: 1, enabled: true, start: '09:00', end: '18:00' },
    { weekday: 2, enabled: true, start: '09:00', end: '18:00' },
    { weekday: 3, enabled: true, start: '09:00', end: '18:00' },
    { weekday: 4, enabled: true, start: '09:00', end: '18:00' },
    { weekday: 5, enabled: true, start: '09:00', end: '18:00' },
    { weekday: 6, enabled: false, start: '09:00', end: '13:00' },
    { weekday: 0, enabled: false, start: '', end: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const entries = days.filter((d) => d.enabled && d.start && d.end).map((d) => ({ weekday: d.weekday, startTime: d.start, endTime: d.end }));
      await api('/working-hours/me/bulk', { method: 'POST', token, body: JSON.stringify({ entries }) });
      onNext();
    } catch {
      setError('Erro ao salvar horários.');
    } finally {
      setLoading(false);
    }
  }

  const timeInput: React.CSSProperties = {
    height: 36, padding: '0 8px', fontSize: 14, borderRadius: 12, border: '1px solid var(--lp-border)',
    background: '#fff', color: 'var(--lp-text-strong)', fontFamily: 'var(--lp-font-display)', width: 92,
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 className="lp-display" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.6rem)', marginBottom: 6 }}>Seus horários de atendimento</h2>
        <p style={{ color: 'var(--lp-text-muted)', fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>Quando você atende? Isso define os horários que os clientes podem agendar com você.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {days.map((day, i) => (
          <div key={day.weekday} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, width: 108, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) => { const u = [...days]; u[i] = { ...u[i], enabled: e.target.checked, start: e.target.checked && !u[i].start ? '09:00' : u[i].start, end: e.target.checked && !u[i].end ? '18:00' : u[i].end }; setDays(u); }}
                style={{ accentColor: 'var(--lp-teal)', width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14, color: 'var(--lp-text-strong)', fontWeight: day.enabled ? 600 : 400 }}>{dayNames[day.weekday]}</span>
            </label>
            {day.enabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="time" value={day.start} onChange={(e) => { const u = [...days]; u[i] = { ...u[i], start: e.target.value }; setDays(u); }} style={timeInput} />
                <span style={{ color: 'var(--lp-text-muted)', fontSize: 14 }}>às</span>
                <input type="time" value={day.end} onChange={(e) => { const u = [...days]; u[i] = { ...u[i], end: e.target.value }; setDays(u); }} style={timeInput} />
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="lp-alert lp-alert-error" style={{ marginTop: 12 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <SkipBtn onClick={onSkip}>Pular por agora</SkipBtn>
        <PrimaryBtn onClick={handleSubmit} disabled={loading} style={{ opacity: loading ? 0.55 : 1 }}>{loading ? 'Salvando...' : 'Continuar'}</PrimaryBtn>
      </div>
    </div>
  );
}

function TourStep({ role, onNext }: { role: string; onNext: () => void }) {
  const items: Record<string, { title: string; desc: string; tone: string; icon: React.ReactNode }[]> = {
    receptionist: [
      { title: 'Agenda de todos', tone: 'linear-gradient(145deg,#2dd4bf,#0f766e)', desc: 'Crie, confirme e remarque agendamentos de qualquer profissional.', icon: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /> },
      { title: 'Clientes', tone: 'linear-gradient(145deg,#c4b5fd,#7c3aed)', desc: 'Cadastre novos clientes e consulte o histórico de cada um.', icon: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></> },
      { title: 'Serviços e horários', tone: 'linear-gradient(145deg,#fde68a,#f59e0b)', desc: 'Mantenha o catálogo e os horários de atendimento em dia.', icon: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></> },
    ],
    admin: [
      { title: 'Equipe e acessos', tone: 'linear-gradient(145deg,#2dd4bf,#0f766e)', desc: 'Convide profissionais e recepção, defina papéis e revogue acessos.', icon: <><circle cx="9" cy="7" r="4" /><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M22 21v-2a4 4 0 00-3-3.87" /></> },
      { title: 'Financeiro e relatórios', tone: 'linear-gradient(145deg,#c4b5fd,#7c3aed)', desc: 'Acompanhe faturamento, comissões e o desempenho do negócio.', icon: <><path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 100 4h4v-4z" /></> },
      { title: 'Agenda e catálogo', tone: 'linear-gradient(145deg,#fde68a,#f59e0b)', desc: 'Gerencie agendamentos de todos, serviços, horários e campanhas.', icon: <><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /></> },
    ],
  };
  const list = items[role] ?? items.admin;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 className="lp-display" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.6rem)', marginBottom: 6 }}>O que você pode fazer</h2>
        <p style={{ color: 'var(--lp-text-muted)', fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>Um resumo rápido do seu acesso. Tudo isso fica no menu à esquerda do painel.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((item, i) => (
          <Reveal key={item.title} delay={80 + i * 90} className="lp-card lp-card-hover" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 16, borderRadius: 18 }}>
            <span style={{ flex: 'none', display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 13, background: item.tone, color: '#fff', boxShadow: 'inset 0 2px 4px rgba(255,255,255,.4), var(--lp-shadow-sm)' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{item.icon}</svg>
            </span>
            <div>
              <p style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 600, fontSize: 15, color: 'var(--lp-text-strong)', margin: 0 }}>{item.title}</p>
              <p style={{ fontSize: 13, color: 'var(--lp-text-muted)', margin: '3px 0 0', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 26 }}>
        <PrimaryBtn onClick={onNext}>Continuar</PrimaryBtn>
      </div>
    </div>
  );
}

function DoneStep({ role, onFinish, finishing }: { role: string; onFinish: () => void; finishing: boolean }) {
  const msg: Record<string, string> = {
    professional: 'Sua agenda já está pronta. Abra o painel para ver seus próximos agendamentos.',
    receptionist: 'Tudo pronto. Abra o painel para começar a organizar a agenda.',
    admin: 'Tudo pronto. Abra o painel para gerenciar o negócio.',
  };
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <Sparkle top={-6} left="27%" size={22} color="#fbbf24" className="lp-anim-float-lg" />
      <Sparkle top={12} right="25%" size={16} color="#5eead4" className="lp-anim-drift" />
      <div style={{ marginBottom: 18 }}>
        <IconRing pulse>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </IconRing>
      </div>
      <h2 className="lp-display" style={{ fontSize: 'clamp(1.5rem, 3.4vw, 1.9rem)', marginBottom: 8 }}>
        Tudo <span className="lp-grad-text">certo!</span>
      </h2>
      <p style={{ color: 'var(--lp-text-muted)', fontSize: 15, margin: '0 auto 26px', maxWidth: 380, lineHeight: 1.55 }}>{msg[role] ?? msg.admin}</p>
      <PrimaryBtn onClick={onFinish} disabled={finishing} style={{ padding: '0.9rem 2rem', opacity: finishing ? 0.55 : 1 }}>{finishing ? 'Abrindo...' : 'Ir para o painel'}</PrimaryBtn>
    </div>
  );
}

export default function WelcomePage() {
  const { user, token, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const role = user?.role ?? 'receptionist';
  const steps = useMemo(() => FLOW[role] ?? FLOW.receptionist, [role]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'owner' || user.onboardedAt) { router.replace('/admin'); }
  }, [authLoading, user, router]);

  async function finish() {
    setFinishing(true);
    try {
      await api('/onboarding/me/complete', { method: 'POST', token: token! });
    } catch { /* segue para o painel de qualquer forma */ }
    await refreshUser();
    router.replace('/admin');
  }

  function next() {
    if (index >= steps.length - 1) return;
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  if (authLoading || !user || user.role === 'owner' || user.onboardedAt) {
    return (
      <div className="lp lp-mesh" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 34, height: 34, border: '3px solid var(--lp-mint-soft)', borderTopColor: 'var(--lp-teal-deep)', borderRadius: '999px', animation: 'lp-spin-slow .8s linear infinite' }} />
      </div>
    );
  }

  const current = steps[index];
  const showProgress = steps.length > 2 && current !== 'welcome' && current !== 'done';

  return (
    <LpOnboardingShell>
      {showProgress && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
          {steps.slice(1, -1).map((s, i) => {
            const stepIdx = i + 1;
            return (
              <div
                key={s}
                style={{
                  height: 6, flex: 1, borderRadius: 999, transition: 'background .3s ease',
                  background: stepIdx <= index ? 'linear-gradient(90deg, var(--lp-teal-bright), var(--lp-teal-deep))' : 'var(--lp-cream-2)',
                  boxShadow: stepIdx <= index ? '0 4px 12px -4px rgba(13,148,136,.6)' : 'none',
                }}
              />
            );
          })}
        </div>
      )}

      <Reveal key={current} delay={40}>
        {current === 'welcome' && <WelcomeStep name={user.name} businessName={user.business.name} role={role} onNext={next} />}
        {current === 'photo' && <PhotoStep token={token!} currentName={user.name} onNext={next} onSkip={next} />}
        {current === 'hours' && <HoursStep token={token!} onNext={next} onSkip={next} />}
        {current === 'tour' && <TourStep role={role} onNext={next} />}
        {current === 'done' && <DoneStep role={role} onFinish={finish} finishing={finishing} />}
      </Reveal>
    </LpOnboardingShell>
  );
}

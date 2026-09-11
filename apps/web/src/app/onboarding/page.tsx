'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { parseDecimalInput } from '@/lib/format';
import { LpOnboardingShell } from '@/components/onboarding/lp-shell';
import { Reveal } from '@/components/landing/reveal';
import { Sparkle } from '@/components/landing/decor';

const STEPS = [
  { id: 2, label: 'Logo' },
  { id: 3, label: 'Serviço' },
  { id: 4, label: 'Horários' },
  { id: 5, label: 'Equipe' },
];

/* Botões e helpers reaproveitados de landing.css (.lp) */
function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="lp-btn lp-btn-primary" style={{ fontSize: 15, padding: '0.8rem 1.5rem', ...props.style }} />;
}
function SkipBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lp-text-muted)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--lp-font-display)', ...props.style }}
    />
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 className="lp-display" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.6rem)', marginBottom: 6 }}>{title}</h2>
      <p style={{ color: 'var(--lp-text-muted)', fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

function ProgressBar({ current }: { current: number }) {
  const index = STEPS.findIndex((s) => s.id === current);
  const step = STEPS[index];
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
        <span className="lp-eyebrow" style={{ fontSize: '0.66rem' }}>Passo {index + 1} de {STEPS.length}</span>
        <span style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 600, fontSize: 13, color: 'var(--lp-teal-deep)' }}>{step?.label}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }} role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            style={{
              height: 6,
              flex: 1,
              borderRadius: 999,
              transition: 'background .3s ease',
              background: i <= index ? 'linear-gradient(90deg, var(--lp-teal-bright), var(--lp-teal-deep))' : 'var(--lp-cream-2)',
              boxShadow: i <= index ? '0 4px 12px -4px rgba(13,148,136,.6)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StepLogo({ token, onComplete, onSkip }: { token: string; onComplete: () => void; onSkip: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function handleFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Selecione um arquivo de imagem.'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('Imagem deve ter no máximo 5MB.'); return; }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (!res.ok) throw new Error('Falha no upload');
      const data = await res.json();
      await api('/business', { method: 'PATCH', token, body: JSON.stringify({ logoUrl: data.url }) });
      onComplete();
    } catch {
      setError('Erro ao enviar a logo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <StepHeader title="Adicione sua logo" subtitle="Ela aparece na sua página de agendamento e no painel." />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById('logo-input')?.click()}
        style={{
          border: '2px dashed var(--lp-border-teal)',
          borderRadius: 20,
          padding: '2.2rem 1rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(240,253,250,.5)',
          transition: 'border-color .2s ease, background .2s ease',
        }}
      >
        {preview ? (
          <img src={preview} alt="Preview" style={{ margin: '0 auto', width: 96, height: 96, objectFit: 'contain', borderRadius: 16 }} />
        ) : (
          <>
            <span style={{ display: 'inline-grid', placeItems: 'center', width: 56, height: 56, borderRadius: 18, marginBottom: 12, background: 'linear-gradient(145deg, var(--lp-mint), var(--lp-teal-deep))', color: '#fff', boxShadow: 'inset 0 2px 5px rgba(255,255,255,.4), var(--lp-shadow-sm)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <p style={{ fontSize: 14.5, color: 'var(--lp-text)', fontWeight: 600, margin: 0 }}>Arraste ou clique para selecionar</p>
            <p style={{ fontSize: 12.5, color: 'var(--lp-text-muted)', marginTop: 4 }}>PNG, JPG ou WebP. Máx. 5MB.</p>
          </>
        )}
        <input id="logo-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] || null)} />
      </div>

      {error && <p className="lp-alert lp-alert-error" style={{ marginTop: 12 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <SkipBtn onClick={onSkip}>Pular por agora</SkipBtn>
        <PrimaryBtn onClick={handleUpload} disabled={!file || uploading} style={{ opacity: !file || uploading ? 0.55 : 1 }}>
          {uploading ? 'Enviando...' : 'Continuar'}
        </PrimaryBtn>
      </div>
    </div>
  );
}

function StepService({ token, onComplete, onSkip }: { token: string; onComplete: () => void; onSkip: () => void }) {
  const [form, setForm] = useState({ name: '', durationMin: '30', price: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await api<{ id: string }>('/services', {
        method: 'POST', token,
        body: JSON.stringify({ name: form.name, durationMin: Number(form.durationMin), price: parseDecimalInput(form.price) }),
      });
      try {
        const professionals = await api<{ id: string }[]>('/professionals', { token });
        await Promise.all(
          professionals.map((p) =>
            api(`/services/${created.id}/professionals`, { method: 'POST', token, body: JSON.stringify({ professionalId: p.id }) }),
          ),
        );
      } catch { /* vínculo recuperável depois; não trava o wizard */ }
      onComplete();
    } catch {
      setError('Erro ao criar o serviço.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <StepHeader title="Crie seu primeiro serviço" subtitle="O que você oferece? Você pode adicionar mais depois." />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="lp-label">Nome do serviço</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="lp-input" placeholder="Corte de cabelo" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="lp-label">Duração (min)</label>
            <input type="number" value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))} required min="5" className="lp-input" />
          </div>
          <div>
            <label className="lp-label">Preço (R$)</label>
            <input type="text" inputMode="decimal" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required className="lp-input" placeholder="35,00" />
          </div>
        </div>

        {error && <p className="lp-alert lp-alert-error">{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <SkipBtn type="button" onClick={onSkip}>Pular por agora</SkipBtn>
          <PrimaryBtn type="submit" disabled={loading} style={{ opacity: loading ? 0.55 : 1 }}>{loading ? 'Salvando...' : 'Continuar'}</PrimaryBtn>
        </div>
      </form>
    </div>
  );
}

function StepWorkingHours({ token, onComplete, onSkip }: { token: string; onComplete: () => void; onSkip: () => void }) {
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
      const entries = days.filter((d) => d.enabled).map((d) => ({ weekday: d.weekday, startTime: d.start, endTime: d.end }));
      await api('/working-hours/bulk', { method: 'POST', token, body: JSON.stringify({ entries }) });
      onComplete();
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
      <StepHeader title="Defina seus horários" subtitle="Quando você atende? Edite ou desmarque os dias." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {days.map((day, i) => (
          <div key={day.weekday} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, width: 108, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) => { const u = [...days]; u[i] = { ...u[i], enabled: e.target.checked }; setDays(u); }}
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

function StepTeam({ token, onComplete, onSkip }: { token: string; onComplete: () => void; onSkip: () => void }) {
  const [invites, setInvites] = useState([{ email: '', role: 'professional' as string }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addRow() { setInvites((prev) => [...prev, { email: '', role: 'professional' }]); }

  async function handleSubmit() {
    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) { onSkip(); return; }
    setLoading(true);
    setError('');
    try {
      for (const inv of validInvites) {
        await api('/staff/invites', { method: 'POST', token, body: JSON.stringify({ email: inv.email, role: inv.role }) });
      }
      onComplete();
    } catch {
      setError('Erro ao enviar convites.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <StepHeader title="Convide sua equipe" subtitle="Adicione quem trabalha com você. Eles receberão um convite por e-mail." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {invites.map((inv, i) => (
          <div key={i} style={{ display: 'flex', gap: 10 }}>
            <input
              type="email" value={inv.email}
              onChange={(e) => { const u = [...invites]; u[i] = { ...u[i], email: e.target.value }; setInvites(u); }}
              className="lp-input" placeholder="email@exemplo.com" style={{ flex: 1 }}
            />
            <select
              value={inv.role}
              onChange={(e) => { const u = [...invites]; u[i] = { ...u[i], role: e.target.value }; setInvites(u); }}
              className="lp-input" style={{ width: 150, flex: 'none' }}
            >
              <option value="professional">Profissional</option>
              <option value="admin">Administrador</option>
              <option value="receptionist">Recepção</option>
            </select>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="lp-link" style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--lp-font-display)', fontSize: 14 }}>
        + Adicionar outro
      </button>

      {error && <p className="lp-alert lp-alert-error" style={{ marginTop: 12 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <SkipBtn onClick={onSkip}>Pular por agora</SkipBtn>
        <PrimaryBtn onClick={handleSubmit} disabled={loading} style={{ opacity: loading ? 0.55 : 1 }}>{loading ? 'Enviando...' : 'Continuar'}</PrimaryBtn>
      </div>
    </div>
  );
}

function StepLinkReady({ slug, onComplete }: { slug: string; onComplete: () => void }) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/${slug}`;

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <Sparkle top={-6} left="26%" size={22} color="#fbbf24" className="lp-anim-float-lg" />
      <Sparkle top={10} right="24%" size={16} color="#5eead4" className="lp-anim-drift" />

      <span
        className="lp-anim-pulse lp-demo-check"
        style={{ display: 'inline-grid', placeItems: 'center', width: 74, height: 74, borderRadius: 999, margin: '0 auto 18px', background: 'linear-gradient(145deg, var(--lp-mint), var(--lp-teal-deep))', color: '#fff', boxShadow: 'inset 0 2px 6px rgba(255,255,255,.45), var(--lp-shadow-teal)' }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>

      <h2 className="lp-display" style={{ fontSize: 'clamp(1.5rem, 3.4vw, 1.9rem)', marginBottom: 8 }}>
        Sua página está <span className="lp-grad-text">pronta!</span>
      </h2>
      <p style={{ color: 'var(--lp-text-muted)', fontSize: 15, margin: '0 auto 24px', maxWidth: 380 }}>
        Compartilhe este link com seus clientes para que eles agendem.
      </p>

      <div className="lp-glass" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '10px 10px 10px 16px', borderRadius: 999, maxWidth: 420, margin: '0 auto', border: '1px solid var(--lp-border-teal)' }}>
        <span style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 600, fontSize: 14, color: 'var(--lp-text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</span>
        <button onClick={copyLink} className="lp-btn lp-btn-primary" style={{ flex: 'none', fontSize: 13, padding: '0.55rem 1.1rem' }}>
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>

      <div style={{ marginTop: 28 }}>
        <PrimaryBtn onClick={onComplete} style={{ fontSize: 15, padding: '0.85rem 1.8rem' }}>Ir para o painel</PrimaryBtn>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { token, user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const status = await api<{ onboardingStep: number; completed: boolean }>('/onboarding/status', { token });
      if (status.completed || status.onboardingStep > 6) { router.replace('/admin'); return; }
      setCurrentStep(Math.max(status.onboardingStep, 2));
    } catch {
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return; }
    fetchStatus();
  }, [authLoading, user, fetchStatus, router]);

  async function advance(action: 'complete' | 'skip') {
    if (!token || currentStep === null) return;
    try {
      const res = await api<{ onboardingStep: number; completed: boolean }>('/onboarding/step', {
        method: 'PATCH', token, body: JSON.stringify({ step: currentStep, action }),
      });
      if (res.completed || res.onboardingStep > 7) { await refreshUser(); router.replace('/admin'); }
      else setCurrentStep(res.onboardingStep);
    } catch {
      setCurrentStep((currentStep || 2) + 1);
    }
  }

  const handleComplete = () => advance('complete');
  const handleSkip = () => advance('skip');

  async function handleFinish() {
    if (token && currentStep !== null) {
      try {
        await api('/onboarding/step', { method: 'PATCH', token, body: JSON.stringify({ step: currentStep, action: 'complete' }) });
      } catch { /* segue para o painel */ }
    }
    await refreshUser();
    router.replace('/admin');
  }

  if (authLoading || loading || currentStep === null) {
    return (
      <div className="lp lp-mesh" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 34, height: 34, border: '3px solid var(--lp-mint-soft)', borderTopColor: 'var(--lp-teal-deep)', borderRadius: '999px', animation: 'lp-spin-slow .8s linear infinite' }} />
      </div>
    );
  }

  return (
    <LpOnboardingShell>
      {currentStep < 6 && (
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p className="lp-eyebrow" style={{ marginBottom: 6 }}>Configuração inicial</p>
          <h1 className="lp-display" style={{ fontSize: 'clamp(1.5rem, 3.6vw, 2rem)' }}>
            Vamos preparar a <span className="lp-grad-text">{user!.business.name}</span>
          </h1>
          <p style={{ color: 'var(--lp-text-muted)', fontSize: 14.5, marginTop: 6 }}>Alguns passos rápidos. Pule o que quiser e ajuste depois.</p>
        </div>
      )}

      {currentStep < 6 && <ProgressBar current={currentStep} />}

      <Reveal key={currentStep} delay={40}>
        {currentStep === 2 && <StepLogo token={token!} onComplete={handleComplete} onSkip={handleSkip} />}
        {currentStep === 3 && <StepService token={token!} onComplete={handleComplete} onSkip={handleSkip} />}
        {currentStep === 4 && <StepWorkingHours token={token!} onComplete={handleComplete} onSkip={handleSkip} />}
        {currentStep === 5 && <StepTeam token={token!} onComplete={handleComplete} onSkip={handleSkip} />}
        {currentStep === 6 && <StepLinkReady slug={user!.business.slug} onComplete={handleFinish} />}
      </Reveal>
    </LpOnboardingShell>
  );
}

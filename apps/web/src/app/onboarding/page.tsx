'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { AgenderLogo } from '@/components/logo';

const STEPS = [
  { id: 2, label: 'Logo' },
  { id: 3, label: 'Serviço' },
  { id: 4, label: 'Horários' },
  { id: 5, label: 'Equipe' },
  { id: 6, label: 'Link pronto' },
];

function ProgressBar({ current }: { current: number }) {
  const index = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors shrink-0 ${
              i < index
                ? 'bg-primary-default'
                : i === index
                ? 'bg-primary-default ring-4 ring-primary-default/20'
                : 'bg-border-strong'
            }`}
          />
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${
                i < index ? 'bg-primary-default' : 'bg-border-default'
              }`}
            />
          )}
        </div>
      ))}
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
    if (!f.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Imagem deve ter no máximo 5MB.');
      return;
    }
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      if (!res.ok) throw new Error('Falha no upload');
      const data = await res.json();

      await api('/business', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ logoUrl: data.url }),
      });
      onComplete();
    } catch {
      setError('Erro ao enviar a logo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-strong mb-1">Adicione sua logo</h2>
      <p className="text-sm text-text-muted mb-6">Ela aparece na sua página de agendamento e no painel.</p>

      <div
        className="border-2 border-dashed border-border-strong rounded-[var(--radius-md)] p-8 text-center hover:border-primary-default transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById('logo-input')?.click()}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="mx-auto w-24 h-24 object-contain rounded-[var(--radius-md)]" />
        ) : (
          <>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-text-subtle">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-text-muted">Arraste ou clique para selecionar</p>
            <p className="text-xs text-text-subtle mt-1">PNG, JPG ou SVG. Máx. 5MB.</p>
          </>
        )}
        <input
          id="logo-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>

      {error && <p className="text-xs text-danger-text mt-2">{error}</p>}

      <div className="flex justify-between mt-6">
        <button onClick={onSkip} className="h-9 px-4 text-sm text-text-default hover:bg-surface-subtle rounded-[var(--radius-sm)]">
          Pular por agora
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
        >
          {uploading ? 'Enviando...' : 'Continuar'}
        </button>
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
        method: 'POST',
        token,
        body: JSON.stringify({
          name: form.name,
          durationMin: Number(form.durationMin),
          price: Number(form.price),
        }),
      });
      // Vincula o serviço aos profissionais existentes (no onboarding, o
      // profissional do dono). Sem o vínculo a página pública nasce sem
      // nenhum serviço agendável.
      try {
        const professionals = await api<{ id: string }[]>('/professionals', { token });
        await Promise.all(
          professionals.map((p) =>
            api(`/services/${created.id}/professionals`, {
              method: 'POST',
              token,
              body: JSON.stringify({ professionalId: p.id }),
            }),
          ),
        );
      } catch {
        // Vínculo é recuperável depois na tela de Serviços; não trava o wizard.
      }
      onComplete();
    } catch {
      setError('Erro ao criar o serviço.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20";

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-strong mb-1">Crie seu primeiro serviço</h2>
      <p className="text-sm text-text-muted mb-6">O que você oferece? Você pode adicionar mais depois.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Nome do serviço</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className={inputClass}
            placeholder="Corte de cabelo"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Duração (min)</label>
            <input
              type="number"
              value={form.durationMin}
              onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
              required
              min="5"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Preço (R$)</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              min="0"
              step="0.01"
              className={inputClass}
              placeholder="35.00"
            />
          </div>
        </div>

        {error && <p className="text-xs text-danger-text">{error}</p>}

        <div className="flex justify-between pt-2">
          <button type="button" onClick={onSkip} className="h-9 px-4 text-sm text-text-default hover:bg-surface-subtle rounded-[var(--radius-sm)]">
            Pular por agora
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Continuar'}
          </button>
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
      const entries = days.filter((d) => d.enabled).map((d) => ({
        weekday: d.weekday,
        startTime: d.start,
        endTime: d.end,
      }));
      await api('/working-hours/bulk', {
        method: 'POST',
        token,
        body: JSON.stringify({ entries }),
      });
      onComplete();
    } catch {
      setError('Erro ao salvar horários.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "h-8 px-2 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none font-[family-name:var(--font-geist-mono)] tabular-nums w-20";

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-strong mb-1">Defina seus horários</h2>
      <p className="text-sm text-text-muted mb-6">Quando você atende? Edite ou desmarque os dias.</p>

      <div className="space-y-2">
        {days.map((day, i) => (
          <div key={day.weekday} className="flex items-center gap-3 py-1.5">
            <label className="flex items-center gap-2 w-24 cursor-pointer">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) => {
                  const updated = [...days];
                  updated[i] = { ...updated[i], enabled: e.target.checked };
                  setDays(updated);
                }}
                className="accent-[var(--color-primary-default)]"
              />
              <span className="text-sm text-text-default">{dayNames[day.weekday]}</span>
            </label>
            {day.enabled && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={day.start}
                  onChange={(e) => {
                    const updated = [...days];
                    updated[i] = { ...updated[i], start: e.target.value };
                    setDays(updated);
                  }}
                  className={inputClass}
                />
                <span className="text-text-muted text-sm">às</span>
                <input
                  type="time"
                  value={day.end}
                  onChange={(e) => {
                    const updated = [...days];
                    updated[i] = { ...updated[i], end: e.target.value };
                    setDays(updated);
                  }}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-danger-text mt-3">{error}</p>}

      <div className="flex justify-between mt-6">
        <button onClick={onSkip} className="h-9 px-4 text-sm text-text-default hover:bg-surface-subtle rounded-[var(--radius-sm)]">
          Pular por agora
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}

function StepTeam({ token, onComplete, onSkip }: { token: string; onComplete: () => void; onSkip: () => void }) {
  const [invites, setInvites] = useState([{ email: '', role: 'professional' as string }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addRow() {
    setInvites((prev) => [...prev, { email: '', role: 'professional' }]);
  }

  async function handleSubmit() {
    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) {
      onSkip();
      return;
    }
    setLoading(true);
    setError('');
    try {
      for (const inv of validInvites) {
        await api('/staff/invites', {
          method: 'POST',
          token,
          body: JSON.stringify({ email: inv.email, role: inv.role }),
        });
      }
      onComplete();
    } catch {
      setError('Erro ao enviar convites.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20";

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-strong mb-1">Convide sua equipe</h2>
      <p className="text-sm text-text-muted mb-6">Adicione quem trabalha com você. Eles receberão um e-mail de convite.</p>

      <div className="space-y-3">
        {invites.map((inv, i) => (
          <div key={i} className="flex gap-3">
            <input
              type="email"
              value={inv.email}
              onChange={(e) => {
                const updated = [...invites];
                updated[i] = { ...updated[i], email: e.target.value };
                setInvites(updated);
              }}
              className={inputClass}
              placeholder="email@exemplo.com"
            />
            <select
              value={inv.role}
              onChange={(e) => {
                const updated = [...invites];
                updated[i] = { ...updated[i], role: e.target.value };
                setInvites(updated);
              }}
              className="h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong"
            >
              <option value="professional">Profissional</option>
              <option value="admin">Administrador</option>
              <option value="receptionist">Recepção</option>
            </select>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="mt-3 text-sm text-primary-default hover:text-primary-hover font-medium">
        + Adicionar outro
      </button>

      {error && <p className="text-xs text-danger-text mt-3">{error}</p>}

      <div className="flex justify-between mt-6">
        <button onClick={onSkip} className="h-9 px-4 text-sm text-text-default hover:bg-surface-subtle rounded-[var(--radius-sm)]">
          Pular por agora
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Continuar'}
        </button>
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
    <div className="text-center">
      <div className="w-16 h-16 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-fg">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-text-strong mb-1">Sua página está pronta!</h2>
      <p className="text-sm text-text-muted mb-6">Compartilhe este link com seus clientes para que eles agendem.</p>

      <div className="flex items-center gap-2 justify-center bg-surface-subtle border border-border-default rounded-[var(--radius-md)] px-4 py-3 max-w-md mx-auto">
        <span className="text-sm font-[family-name:var(--font-geist-mono)] text-text-strong truncate">{publicUrl}</span>
        <button
          onClick={copyLink}
          className="shrink-0 h-8 px-3 text-xs font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover"
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>

      <button
        onClick={onComplete}
        className="mt-8 h-9 px-6 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
      >
        Ir para o painel
      </button>
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
      if (status.completed || status.onboardingStep > 6) {
        router.replace('/admin');
        return;
      }
      setCurrentStep(Math.max(status.onboardingStep, 2));
    } catch {
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    fetchStatus();
  }, [authLoading, user, fetchStatus, router]);

  async function advance(action: 'complete' | 'skip') {
    if (!token || currentStep === null) return;
    try {
      const res = await api<{ onboardingStep: number; completed: boolean }>('/onboarding/step', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ step: currentStep, action }),
      });
      if (res.completed || res.onboardingStep > 7) {
        await refreshUser();
        router.replace('/admin');
      } else {
        setCurrentStep(res.onboardingStep);
      }
    } catch {
      setCurrentStep((currentStep || 2) + 1);
    }
  }

  function handleComplete() {
    advance('complete');
  }

  function handleSkip() {
    advance('skip');
  }

  async function handleFinish() {
    if (token && currentStep !== null) {
      try {
        await api('/onboarding/step', {
          method: 'PATCH',
          token,
          body: JSON.stringify({ step: currentStep, action: 'complete' }),
        });
      } catch {
        // continue to panel
      }
    }
    await refreshUser();
    router.replace('/admin');
  }

  if (authLoading || loading || currentStep === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-app">
        <div className="w-8 h-8 border-2 border-primary-default border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <AgenderLogo />
        </div>

        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-elevation-1)]">
          <ProgressBar current={currentStep} />

          {currentStep === 2 && <StepLogo token={token!} onComplete={handleComplete} onSkip={handleSkip} />}
          {currentStep === 3 && <StepService token={token!} onComplete={handleComplete} onSkip={handleSkip} />}
          {currentStep === 4 && <StepWorkingHours token={token!} onComplete={handleComplete} onSkip={handleSkip} />}
          {currentStep === 5 && <StepTeam token={token!} onComplete={handleComplete} onSkip={handleSkip} />}
          {currentStep === 6 && <StepLinkReady slug={user!.business.slug} onComplete={handleFinish} />}
        </div>
      </div>
    </div>
  );
}

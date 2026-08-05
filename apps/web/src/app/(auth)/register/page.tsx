'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { AuthShell } from '@/components/landing/auth-shell';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const passwordLength = form.password.length;
  const passwordStrength = passwordLength === 0 ? null : passwordLength < 8 ? 'fraca' : passwordLength < 12 ? 'média' : 'forte';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Criar negócio"
      subtitle="Configure seu negócio e comece a receber agendamentos."
      maxWidth={460}
      footer={
        <>
          Já tem uma conta?{' '}
          <Link href="/login" className="lp-link">Entrar</Link>
          <br />
          <Link href="/faq" className="lp-link" style={{ color: 'var(--lp-text-subtle)', fontWeight: 500 }}>Perguntas frequentes</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <legend className="lp-eyebrow" style={{ marginBottom: 4 }}>Seu negócio</legend>
          <div>
            <label htmlFor="reg-biz" className="lp-label">Nome do negócio</label>
            <input id="reg-biz" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} required minLength={2} className="lp-input" placeholder="Barbearia Juninho" />
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <legend className="lp-eyebrow" style={{ marginBottom: 4 }}>Sua conta</legend>
          <div>
            <label htmlFor="reg-name" className="lp-label">Seu nome</label>
            <input id="reg-name" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} required minLength={2} className="lp-input" placeholder="Juninho" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="reg-email" className="lp-label">E-mail</label>
            <input id="reg-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required className="lp-input" placeholder="seu@email.com" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="reg-pass" className="lp-label">Senha</label>
            <input id="reg-pass" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} className="lp-input" placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            {passwordStrength && (
              <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--lp-cream-2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, transition: 'all .25s ease', width: passwordStrength === 'fraca' ? '33%' : passwordStrength === 'média' ? '66%' : '100%', background: passwordStrength === 'fraca' ? '#dc2626' : passwordStrength === 'média' ? '#d97706' : '#16a34a' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: passwordStrength === 'fraca' ? '#b91c1c' : passwordStrength === 'média' ? '#b45309' : '#15803d' }}>
                  {passwordStrength === 'fraca' ? 'Fraca' : passwordStrength === 'média' ? 'Média' : 'Forte'}
                </span>
              </div>
            )}
          </div>
        </fieldset>

        {error && (
          <p className="lp-alert lp-alert-error" role="alert">{error}</p>
        )}
        <button type="submit" disabled={loading} className="lp-btn lp-btn-primary" style={{ width: '100%', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Criando...' : 'Criar e entrar'}
        </button>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--lp-text-subtle)', textAlign: 'center' }}>
          Ao criar a conta, você concorda com os{' '}
          <Link href="/termos" className="lp-link" style={{ color: 'var(--lp-text-muted)', fontWeight: 500 }}>Termos de Uso</Link>{' '}
          e a{' '}
          <Link href="/privacidade" className="lp-link" style={{ color: 'var(--lp-text-muted)', fontWeight: 500 }}>Política de Privacidade</Link>.
        </p>
      </form>
    </AuthShell>
  );
}

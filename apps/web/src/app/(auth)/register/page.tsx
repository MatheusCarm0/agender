'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { AgenderLogo } from '@/components/logo';

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

  const inputClass = "w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20";

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app px-4 py-8">
      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-elevation-1)]">
        <div className="flex justify-center pb-6">
          <AgenderLogo  />
        </div>
        <h1 className="text-2xl font-semibold text-text-strong mb-1">Criar negócio</h1>
        <p className="text-xs text-text-muted mb-6">Configure seu negócio e comece a receber agendamentos.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Grupo: Negócio */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-2">Seu negócio</legend>
            <div>
              <label htmlFor="reg-biz" className="block text-xs font-medium text-text-muted mb-1">Nome do negócio</label>
              <input
                id="reg-biz"
                value={form.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                required
                minLength={2}
                className={inputClass}
                placeholder="Barbearia Juninho"
              />
            </div>
          </fieldset>

          {/* Grupo: Conta */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-2">Sua conta</legend>
            <div>
              <label htmlFor="reg-name" className="block text-xs font-medium text-text-muted mb-1">Seu nome</label>
              <input
                id="reg-name"
                value={form.ownerName}
                onChange={(e) => set('ownerName', e.target.value)}
                required
                minLength={2}
                className={inputClass}
                placeholder="Juninho"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-text-muted mb-1">E-mail</label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                className={inputClass}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="reg-pass" className="block text-xs font-medium text-text-muted mb-1">Senha</label>
              <input
                id="reg-pass"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                minLength={8}
                className={inputClass}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              {passwordStrength && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-surface-subtle overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength === 'fraca' ? 'w-1/3 bg-danger-fg' :
                        passwordStrength === 'média' ? 'w-2/3 bg-warning-fg' :
                        'w-full bg-success-fg'
                      }`}
                    />
                  </div>
                  <span className={`text-[11px] font-medium ${
                    passwordStrength === 'fraca' ? 'text-danger-text' :
                    passwordStrength === 'média' ? 'text-warning-text' :
                    'text-success-text'
                  }`}>
                    {passwordStrength === 'fraca' ? 'Fraca' : passwordStrength === 'média' ? 'Média' : 'Forte'}
                  </span>
                </div>
              )}
            </div>
          </fieldset>

          {error && (
            <p className="text-xs text-danger-text bg-danger-bg px-3 py-2 rounded-[var(--radius-sm)]" role="alert">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-primary-default text-primary-fg font-medium text-sm rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Criando...' : 'Criar e entrar'}
          </button>
        </form>
        <p className="mt-3 text-[11px] text-text-subtle text-center leading-relaxed">
          Ao criar a conta, você concorda com os{' '}
          <Link href="/termos" className="underline hover:text-text-muted">Termos de Uso</Link>{' '}
          e a{' '}
          <Link href="/privacidade" className="underline hover:text-text-muted">Política de Privacidade</Link>.
        </p>
        <p className="mt-4 text-xs text-text-muted text-center">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary-default hover:text-primary-hover font-medium">
            Entrar
          </Link>
        </p>
        <p className="mt-2 text-xs text-text-subtle text-center">
          <Link href="/faq" className="hover:text-text-muted">Perguntas frequentes</Link>
        </p>
      </div>
    </div>
  );
}

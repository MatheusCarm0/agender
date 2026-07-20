'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AgenderLogo } from '@/components/logo';

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; name: string; email: string; role: string };
        business: { id: string; slug: string; name: string };
      }>(`/staff/invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify({ name, password }),
      });
      localStorage.setItem('auth_token', res.accessToken);
      localStorage.setItem('refresh_token', res.refreshToken);
      setSuccess(true);
      setTimeout(() => { window.location.href = '/admin'; }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Convite inválido ou expirado');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-app px-4">
        <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-elevation-1)] text-center">
          <div className="flex justify-center pb-6">
            <AgenderLogo size="lg" />
          </div>
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#F0FDF4] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-text-strong mb-2">Conta criada</h1>
          <p className="text-sm text-text-muted">Redirecionando para o painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app px-4">
      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-elevation-1)]">
        <div className="flex justify-center pb-8">
          <AgenderLogo size="lg" />
        </div>
        <h1 className="text-2xl font-semibold text-text-strong mb-1">Aceitar convite</h1>
        <p className="text-xs text-text-muted mb-6">Defina seu nome e senha para acessar o painel.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-name" className="block text-xs font-medium text-text-muted mb-1">Nome</label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label htmlFor="invite-password" className="block text-xs font-medium text-text-muted mb-1">Senha</label>
            <div className="relative">
              <input
                id="invite-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full h-9 px-3 pr-10 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-default transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[var(--radius-sm)]">
              <p className="text-xs text-[#B91C1C]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 text-sm font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Criar conta e acessar'}
          </button>
        </form>
      </div>
    </div>
  );
}

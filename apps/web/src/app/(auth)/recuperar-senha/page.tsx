'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AgenderLogo } from '@/components/logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ message: string; token?: string }>('/auth/password-reset/start', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res.token) setDevToken(res.token);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app px-4">
      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-elevation-1)]">
        <div className="flex justify-center pb-8">
          <AgenderLogo />
        </div>
        <h1 className="text-2xl font-semibold text-text-strong mb-1">Recuperar senha</h1>
        <p className="text-xs text-text-muted mb-6">
          Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
        </p>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-success-text bg-success-bg px-3 py-3 rounded-[var(--radius-sm)]">
              Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique sua caixa de entrada.
            </p>
            {devToken && (
              <p className="text-xs text-text-muted bg-surface-subtle px-3 py-2 rounded-[var(--radius-sm)]">
                Ambiente de teste — abra o link:{' '}
                <Link href={`/redefinir-senha?token=${devToken}`} className="text-primary-default font-medium break-all">
                  /redefinir-senha
                </Link>
              </p>
            )}
            <Link
              href="/login"
              className="block text-center w-full h-9 leading-9 bg-primary-default text-primary-fg font-medium text-sm rounded-[var(--radius-sm)] hover:bg-primary-hover"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-medium text-text-muted mb-1">E-mail</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20"
                placeholder="seu@email.com"
              />
            </div>
            {error && (
              <p className="text-xs text-danger-text bg-danger-bg px-3 py-2 rounded-[var(--radius-sm)]" role="alert">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-primary-default text-primary-fg font-medium text-sm rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-text-muted text-center">
          Lembrou a senha?{' '}
          <Link href="/login" className="text-primary-default hover:text-primary-hover font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

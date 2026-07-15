'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app px-4">
      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-elevation-1)]">
        <h1 className="text-2xl font-semibold text-text-strong mb-6">Entrar</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-xs text-danger-text bg-danger-bg px-3 py-2 rounded-[var(--radius-sm)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-primary-default text-primary-fg font-medium text-sm rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="mt-4 text-xs text-text-muted text-center">
          Ainda não tem conta?{' '}
          <Link href="/register" className="text-primary-default hover:text-primary-hover">
            Criar negócio
          </Link>
        </p>
      </div>
    </div>
  );
}

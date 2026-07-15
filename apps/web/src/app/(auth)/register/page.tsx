'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app px-4">
      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-elevation-1)]">
        <h1 className="text-2xl font-semibold text-text-strong mb-6">Criar negócio</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Nome do negócio</label>
            <input
              value={form.businessName}
              onChange={(e) => set('businessName', e.target.value)}
              required
              minLength={2}
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              placeholder="Barbearia Juninho"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Seu nome</label>
            <input
              value={form.ownerName}
              onChange={(e) => set('ownerName', e.target.value)}
              required
              minLength={2}
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              placeholder="Juninho"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={8}
              className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              placeholder="Mínimo 8 caracteres"
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
            {loading ? 'Criando...' : 'Criar e entrar'}
          </button>
        </form>
        <p className="mt-4 text-xs text-text-muted text-center">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary-default hover:text-primary-hover">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

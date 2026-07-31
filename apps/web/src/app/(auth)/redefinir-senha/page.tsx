'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AgenderLogo } from '@/components/logo';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <h1 className="text-2xl font-semibold text-text-strong mb-1">Link inválido</h1>
        <p className="text-sm text-text-muted mb-6">
          Este link de redefinição está incompleto. Solicite um novo link de recuperação.
        </p>
        <Link
          href="/recuperar-senha"
          className="block text-center w-full h-9 leading-9 bg-primary-default text-primary-fg font-medium text-sm rounded-[var(--radius-sm)] hover:bg-primary-hover"
        >
          Recuperar senha
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <h1 className="text-2xl font-semibold text-text-strong mb-1">Senha redefinida</h1>
        <p className="text-sm text-text-muted mb-6">
          Sua senha foi atualizada. Você já pode entrar com a nova senha.
        </p>
        <Link
          href="/login"
          className="block text-center w-full h-9 leading-9 bg-primary-default text-primary-fg font-medium text-sm rounded-[var(--radius-sm)] hover:bg-primary-hover"
        >
          Entrar
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-text-strong mb-1">Criar nova senha</h1>
      <p className="text-xs text-text-muted mb-6">Escolha uma senha com pelo menos 8 caracteres.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-xs font-medium text-text-muted mb-1">Nova senha</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            autoFocus
            className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-xs font-medium text-text-muted mb-1">Confirmar senha</label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20"
            placeholder="Repita a senha"
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
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app px-4">
      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-elevation-1)]">
        <div className="flex justify-center pb-8">
          <AgenderLogo />
        </div>
        <Suspense fallback={<p className="text-sm text-text-muted text-center">Carregando…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AuthShell } from '@/components/landing/auth-shell';

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="lp-display" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.1rem)', textAlign: 'center', marginBottom: 8 }}>{title}</h1>
      <p style={{ textAlign: 'center', color: 'var(--lp-text-muted)', fontSize: 15, margin: '0 0 24px' }}>{subtitle}</p>
    </>
  );
}

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
        <Heading title="Link inválido" subtitle="Este link de redefinição está incompleto. Solicite um novo link de recuperação." />
        <Link href="/recuperar-senha" className="lp-btn lp-btn-primary" style={{ width: '100%' }}>
          Recuperar senha
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <Heading title="Senha redefinida" subtitle="Sua senha foi atualizada. Você já pode entrar com a nova senha." />
        <Link href="/login" className="lp-btn lp-btn-primary" style={{ width: '100%' }}>
          Entrar
        </Link>
      </>
    );
  }

  return (
    <>
      <Heading title="Criar nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres." />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="new-password" className="lp-label">Nova senha</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            autoFocus
            className="lp-input"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="lp-label">Confirmar senha</label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="lp-input"
            placeholder="Repita a senha"
          />
        </div>
        {error && (
          <p className="lp-alert lp-alert-error" role="alert">{error}</p>
        )}
        <button type="submit" disabled={loading} className="lp-btn lp-btn-primary" style={{ width: '100%', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<p style={{ textAlign: 'center', color: 'var(--lp-text-muted)', fontSize: 15 }}>Carregando…</p>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}

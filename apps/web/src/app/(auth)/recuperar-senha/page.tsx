'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthShell } from '@/components/landing/auth-shell';

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
    <AuthShell
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha."
      footer={
        <>
          Lembrou a senha?{' '}
          <Link href="/login" className="lp-link">Entrar</Link>
        </>
      }
    >
      {sent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="lp-alert lp-alert-ok">
            Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique sua caixa de entrada.
          </p>
          {devToken && (
            <p className="lp-alert" style={{ background: 'var(--lp-cream-2)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-muted)' }}>
              Ambiente de teste. Abra o link:{' '}
              <Link href={`/redefinir-senha?token=${devToken}`} className="lp-link" style={{ wordBreak: 'break-all' }}>
                /redefinir-senha
              </Link>
            </p>
          )}
          <Link href="/login" className="lp-btn lp-btn-primary" style={{ width: '100%' }}>
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="reset-email" className="lp-label">E-mail</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="lp-input"
              placeholder="seu@email.com"
            />
          </div>
          {error && (
            <p className="lp-alert lp-alert-error" role="alert">{error}</p>
          )}
          <button type="submit" disabled={loading} className="lp-btn lp-btn-primary" style={{ width: '100%', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';

type FeedbackKind = 'bug' | 'idea' | 'other';

const KIND_OPTIONS: { value: FeedbackKind; label: string }[] = [
  { value: 'bug', label: 'Problema' },
  { value: 'idea', label: 'Ideia' },
  { value: 'other', label: 'Outro' },
];

function IconMegaphone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
    </svg>
  );
}

/**
 * Canal de feedback dos beta testers: botão na sidebar do admin que abre um
 * modal simples e envia para POST /feedback (o time recebe por e-mail).
 */
export function FeedbackWidget() {
  const { token } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast('Conte um pouco mais para a gente conseguir ajudar.', 'error');
      return;
    }
    setSending(true);
    try {
      await api('/feedback', {
        token,
        method: 'POST',
        body: JSON.stringify({ message: trimmed, kind, url: pathname }),
      });
      setMessage('');
      setOpen(false);
      toast('Recebemos seu feedback. Obrigado por ajudar a melhorar a Agender!');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível enviar agora.', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] text-text-muted hover:text-text-strong hover:bg-surface-subtle transition-colors"
      >
        <IconMegaphone />
        Reportar problema
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/45" />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="relative bg-surface-card rounded-[var(--radius-lg)] shadow-[var(--shadow-elevation-3)] p-6 w-full max-w-[480px] mx-4 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="feedback-title" className="text-base font-semibold text-text-strong mb-1">
              Reportar problema ou sugestão
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Vai direto para o time da Agender. Quanto mais detalhe, mais rápido conseguimos agir.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2" role="radiogroup" aria-label="Tipo de feedback">
                {KIND_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={kind === opt.value}
                    onClick={() => setKind(opt.value)}
                    className={`h-8 px-3 text-xs font-medium rounded-[var(--radius-pill)] border transition-colors ${
                      kind === opt.value
                        ? 'bg-primary-tint-bg text-primary-tint-text border-primary-default'
                        : 'bg-surface-card text-text-muted border-border-strong hover:bg-surface-subtle'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="feedback-message" className="block text-xs font-medium text-text-muted mb-1">
                  O que aconteceu?
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="Descreva o problema ou a ideia. Se for um erro, conte o que você estava tentando fazer."
                  className="w-full px-3 py-2 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong resize-none focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={sending}
                  className="h-9 px-4 text-sm font-medium border border-border-strong text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="h-9 px-4 text-sm font-medium bg-primary-default text-primary-fg rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
                >
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

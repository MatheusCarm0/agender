'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    const delay = type === 'error' ? 6000 : 4000;
    setTimeout(() => dismiss(id), delay);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
        role="status"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 pl-4 pr-2 py-3 rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-3)] text-sm font-medium animate-[slideIn_0.2s_ease-out] ${
              t.type === 'success'
                ? 'bg-success-bg text-success-text border border-success-fg/20'
                : t.type === 'error'
                  ? 'bg-danger-bg text-danger-text border border-danger-fg/20'
                  : 'bg-surface-card text-text-strong border border-border-default'
            }`}
            role={t.type === 'error' ? 'alert' : undefined}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
                t.type === 'success'
                  ? 'hover:bg-success-fg/10 text-success-text'
                  : t.type === 'error'
                    ? 'hover:bg-danger-fg/10 text-danger-text'
                    : 'hover:bg-surface-subtle text-text-muted'
              }`}
              aria-label="Fechar notificação"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

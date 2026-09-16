// Wrapper seguro para o Microsoft Clarity (custom events + tags de segmentação).
// No-op quando o Clarity não carregou (env desligada, bloqueador de anúncios,
// SSR). O script do Clarity é injetado em app/layout.tsx.
type ClarityFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

/**
 * Dispara um custom event no Clarity e, opcionalmente, tags de segmentação
 * (viram filtros/segmentos no painel). Nunca lança — analytics não pode
 * quebrar a página.
 */
export function track(
  event: string,
  tags?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') return;
  const clarity = window.clarity;
  if (typeof clarity !== 'function') return;
  try {
    clarity('event', event);
    if (tags) {
      for (const [key, value] of Object.entries(tags)) {
        clarity('set', key, String(value));
      }
    }
  } catch {
    /* silencioso */
  }
}

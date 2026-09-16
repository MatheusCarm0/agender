// Wrapper seguro para o Microsoft Clarity (custom events + tags de segmentação).
// No-op quando o Clarity não carregou (env desligada, bloqueador de anúncios,
// SSR). O script do Clarity é injetado em app/layout.tsx.
type ClarityFn = (...args: unknown[]) => void;
type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn;
    fbq?: FbqFn;
  }
}

/**
 * Dispara um evento PADRÃO do Meta Pixel (Lead, CompleteRegistration, etc.) —
 * é isso que o Gerenciador de Anúncios usa para otimizar por CONVERSÃO em vez
 * de por clique. No-op quando o Pixel não carregou (env desligada, bloqueador).
 */
export function trackMeta(
  standardEvent: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  const fbq = window.fbq;
  if (typeof fbq !== 'function') return;
  try {
    fbq('track', standardEvent, params);
  } catch {
    /* silencioso */
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

'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/**
 * Instrumentação da landing para o Clarity (renderiza null). Captura:
 * - landing_view (chegada);
 * - landing_scroll_25/50/75/90 (profundidade de scroll, uma vez cada);
 * - cta_click (qualquer link para /register, via delegação — não precisa
 *   tocar em cada botão), com o texto e o href do CTA como tags.
 */
export function LandingAnalytics() {
  useEffect(() => {
    track('landing_view');

    const marks = [25, 50, 75, 90];
    const fired = new Set<number>();
    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return;
      const pct = Math.round((doc.scrollTop / scrollable) * 100);
      for (const m of marks) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          track(`landing_scroll_${m}`);
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (href === '/register' || href.startsWith('/register')) {
        track('cta_click', {
          cta_text: (anchor.textContent || '').trim().slice(0, 40),
          cta_href: href,
        });
      }
    }
    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}

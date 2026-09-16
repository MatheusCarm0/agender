'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Dispara PageView do Meta Pixel nas navegações client-side do Next (o script
 * base já dispara o PageView inicial no load). Renderiza null.
 */
export function MetaPixelRouteViews() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      // O PageView inicial já foi disparado pelo snippet base no layout.
      first.current = false;
      return;
    }
    if (typeof window === 'undefined') return;
    const fbq = window.fbq;
    if (typeof fbq === 'function') {
      try {
        fbq('track', 'PageView');
      } catch {
        /* silencioso */
      }
    }
  }, [pathname]);

  return null;
}

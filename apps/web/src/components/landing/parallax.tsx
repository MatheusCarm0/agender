'use client';

import { useEffect, useRef } from 'react';

/**
 * Inclina a cena conforme o mouse (efeito 3D vivo). Seta as vars --lp-mx/--lp-my
 * no elemento .lp-parallax filho. Sem efeito em toque / prefers-reduced-motion.
 */
export function Parallax({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const target = host.querySelector<HTMLElement>('.lp-parallax') ?? host;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    function onMove(e: MouseEvent) {
      const r = host!.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function tick() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      target.style.setProperty('--lp-mx', cx.toFixed(3));
      target.style.setProperty('--lp-my', cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    }
    function onLeave() {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    }

    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseleave', onLeave);
    return () => {
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={hostRef} className={`lp-stage ${className}`} style={style}>
      {children}
    </div>
  );
}

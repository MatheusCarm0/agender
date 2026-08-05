'use client';

import { useEffect, useRef, useState } from 'react';

/** Revela o conteúdo ao entrar na viewport (respeita prefers-reduced-motion). */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'span';
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      className={`lp-reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ animationDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </Comp>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AgenderLogo } from '@/components/logo';

const LINKS = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#exemplos', label: 'Exemplos' },
  { href: '#precos', label: 'Preços' },
  { href: '#faq', label: 'FAQ' },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'background .25s ease, box-shadow .25s ease, border-color .25s ease',
        background: scrolled ? 'rgba(250,250,249,.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--lp-border)' : 'transparent'}`,
      }}
    >
      <nav
        className="lp-container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}
      >
        <Link href="/" aria-label="Início do Agender" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <AgenderLogo color="light" width={132} height={40} />
        </Link>

        {/* links desktop */}
        <ul
          className="lp-nav-links"
          style={{ display: 'flex', gap: 30, listStyle: 'none', margin: 0, padding: 0 }}
        >
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                style={{
                  fontFamily: 'var(--lp-font-display)',
                  fontWeight: 500,
                  fontSize: 15,
                  color: 'var(--lp-text)',
                  textDecoration: 'none',
                }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTAs desktop */}
        <div className="lp-nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" className="lp-btn lp-btn-ghost" style={{ padding: '0.7rem 1.15rem', fontSize: 15 }}>
            Entrar
          </Link>
          <Link href="/register" className="lp-btn lp-btn-primary" style={{ padding: '0.7rem 1.3rem', fontSize: 15 }}>
            Começar grátis
          </Link>
        </div>

        {/* botão mobile */}
        <button
          type="button"
          className="lp-nav-burger"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'none',
            width: 44,
            height: 44,
            borderRadius: 14,
            border: '1px solid var(--lp-border)',
            background: 'rgba(255,255,255,.7)',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {/* painel mobile */}
      {open && (
        <div
          className="lp-mobile-panel"
          style={{
            position: 'fixed',
            inset: '72px 0 0 0',
            zIndex: 49,
            background: 'rgba(250,250,249,.98)',
            backdropFilter: 'blur(8px)',
            padding: '1.5rem 1.25rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                fontFamily: 'var(--lp-font-display)',
                fontWeight: 600,
                fontSize: 22,
                color: 'var(--lp-text-strong)',
                textDecoration: 'none',
                padding: '14px 8px',
                borderBottom: '1px solid var(--lp-border)',
              }}
            >
              {l.label}
            </a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <Link href="/register" onClick={() => setOpen(false)} className="lp-btn lp-btn-primary" style={{ width: '100%' }}>
              Começar grátis
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="lp-btn lp-btn-ghost" style={{ width: '100%' }}>
              Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

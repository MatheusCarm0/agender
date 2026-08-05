import Link from 'next/link';

import '@/app/landing.css';
import { AgenderLogo } from '@/components/logo';
import { Blob, Halo } from '@/components/landing/decor';

/**
 * Casca das telas de autenticação no visual da landing (mesh + blobs + card
 * premium). Envolve o formulário; a lógica fica em cada página.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  maxWidth = 440,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      className="lp lp-mesh lp-grain"
      style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '2.5rem 1.25rem', position: 'relative', overflow: 'hidden' }}
    >
      <Halo color="rgba(94,234,212,.55)" size={520} top={-180} left={-140} />
      <Halo color="rgba(139,92,246,.32)" size={440} bottom={-180} right={-140} />
      <Blob variant="teal" size={240} top="6%" left="4%" style={{ opacity: 0.38, filter: 'blur(34px)' }} />
      <Blob variant="amber" size={180} bottom="8%" right="6%" style={{ opacity: 0.3, filter: 'blur(32px)' }} />

      <div
        className="lp-glass"
        style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth, padding: 'clamp(1.75rem, 4vw, 2.6rem)', borderRadius: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Link href="/" aria-label="Agender — início" style={{ display: 'inline-flex' }}>
            <AgenderLogo width={132} height={40} />
          </Link>
        </div>

        {title && (
          <h1 className="lp-display" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.1rem)', marginBottom: subtitle ? 8 : 20, textAlign: 'center' }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{ textAlign: 'center', color: 'var(--lp-text-muted)', fontSize: 15, margin: '0 0 24px' }}>{subtitle}</p>
        )}

        {children}

        {footer && (
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--lp-text-muted)' }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

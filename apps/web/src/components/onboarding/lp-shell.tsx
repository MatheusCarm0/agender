'use client';

import '@/app/landing.css';
import { AgenderLogo } from '@/components/logo';
import { Blob, Halo, Orb, Sparkle } from '@/components/landing/decor';

/**
 * Casca das telas de onboarding no visual da MARCA (landing): fundo mesh,
 * halos que pulsam, blobs orgânicos, orbes 3D em deriva e um cartão de vidro.
 * Não segue estilo-admin.md — o onboarding é a porta de entrada do produto,
 * como login/registro. Respeita prefers-reduced-motion (definido em landing.css).
 */
export function LpOnboardingShell({
  children,
  maxWidth = 560,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      className="lp lp-mesh lp-grain"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2.5rem 1.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* halos que respiram */}
      <Halo color="rgba(94,234,212,.55)" size={560} top={-200} left={-170} />
      <Halo color="rgba(139,92,246,.30)" size={460} bottom={-200} right={-170} />

      {/* blobs orgânicos */}
      <Blob variant="teal" size={250} top="7%" left="2%" style={{ opacity: 0.34, filter: 'blur(38px)' }} />
      <Blob variant="amber" size={180} bottom="9%" right="4%" style={{ opacity: 0.28, filter: 'blur(34px)' }} />

      {/* orbes 3D em deriva (profundidades diferentes) */}
      <span style={{ position: 'absolute', top: '13%', right: '11%', zIndex: 1 }} aria-hidden="true">
        <Orb from="#c4b5fd" to="#7c3aed" size={44} className="lp-anim-drift" />
      </span>
      <span style={{ position: 'absolute', bottom: '15%', left: '9%', zIndex: 1 }} aria-hidden="true">
        <Orb from="#5eead4" to="#0d9488" size={30} className="lp-anim-drift-rev" />
      </span>
      <span style={{ position: 'absolute', top: '72%', right: '16%', zIndex: 1 }} aria-hidden="true">
        <Orb from="#fde68a" to="#f59e0b" size={22} className="lp-anim-float-lg" />
      </span>
      <Sparkle top="18%" left="15%" size={24} color="#fef08a" className="lp-anim-float-lg" />
      <Sparkle bottom="22%" right="10%" size={18} color="#5eead4" className="lp-anim-drift" />

      <div
        className="lp-glass lp-reveal is-in"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth,
          padding: 'clamp(1.6rem, 4vw, 2.6rem)',
          borderRadius: 28,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <AgenderLogo width={128} height={38} />
        </div>
        {children}
      </div>
    </div>
  );
}

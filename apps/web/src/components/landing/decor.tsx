/* Primitivos decorativos artísticos (CSS/SVG puro, sem assets externos).
   Blobs, orbes claymorphism, faíscas e a composição do hero. */

import { IconTile } from './icons';

type CSSLen = number | string;
const px = (v: CSSLen) => (typeof v === 'number' ? `${v}px` : v);

export function Blob({
  variant = 'teal',
  size = 240,
  top,
  left,
  right,
  bottom,
  className = '',
  style,
}: {
  variant?: 'teal' | 'violet' | 'amber' | 'coral';
  size?: CSSLen;
  top?: CSSLen;
  left?: CSSLen;
  right?: CSSLen;
  bottom?: CSSLen;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`lp-blob lp-blob-${variant} lp-anim-blob ${className}`}
      style={{
        width: px(size),
        height: px(size),
        top: top !== undefined ? px(top) : undefined,
        left: left !== undefined ? px(left) : undefined,
        right: right !== undefined ? px(right) : undefined,
        bottom: bottom !== undefined ? px(bottom) : undefined,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function Halo({
  color,
  size = 420,
  top,
  left,
  right,
  bottom,
  opacity = 0.5,
}: {
  color: string;
  size?: CSSLen;
  top?: CSSLen;
  left?: CSSLen;
  right?: CSSLen;
  bottom?: CSSLen;
  opacity?: number;
}) {
  return (
    <span
      className="lp-halo"
      style={{
        width: px(size),
        height: px(size),
        background: color,
        opacity,
        top: top !== undefined ? px(top) : undefined,
        left: left !== undefined ? px(left) : undefined,
        right: right !== undefined ? px(right) : undefined,
        bottom: bottom !== undefined ? px(bottom) : undefined,
      }}
      aria-hidden="true"
    />
  );
}

export function Orb({
  from,
  to,
  size = 60,
  top,
  left,
  right,
  bottom,
  className = '',
}: {
  from: string;
  to: string;
  size?: CSSLen;
  top?: CSSLen;
  left?: CSSLen;
  right?: CSSLen;
  bottom?: CSSLen;
  className?: string;
}) {
  return (
    <span
      className={`lp-orb ${className}`}
      style={{
        width: px(size),
        height: px(size),
        background: `radial-gradient(circle at 32% 28%, ${from}, ${to})`,
        top: top !== undefined ? px(top) : undefined,
        left: left !== undefined ? px(left) : undefined,
        right: right !== undefined ? px(right) : undefined,
        bottom: bottom !== undefined ? px(bottom) : undefined,
      }}
      aria-hidden="true"
    />
  );
}

export function Sparkle({
  size = 22,
  color = '#fbbf24',
  top,
  left,
  right,
  bottom,
  className = '',
}: {
  size?: CSSLen;
  color?: string;
  top?: CSSLen;
  left?: CSSLen;
  right?: CSSLen;
  bottom?: CSSLen;
  className?: string;
}) {
  return (
    <svg
      className={className}
      style={{
        position: 'absolute',
        top: top !== undefined ? px(top) : undefined,
        left: left !== undefined ? px(left) : undefined,
        right: right !== undefined ? px(right) : undefined,
        bottom: bottom !== undefined ? px(bottom) : undefined,
      }}
      width={px(size)}
      height={px(size)}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
    >
      <path d="M12 0c.7 5 2.3 6.6 7 7.3-4.7.7-6.3 2.3-7 7.3-.7-5-2.3-6.6-7-7.3 4.7-.7 6.3-2.3 7-7.3Z" />
    </svg>
  );
}

/* Composição artística do hero: cena 3D com cartão de agendamento vivo,
   orbes em deriva, halos que pulsam. Inclina com o mouse (Parallax). */
export function HeroArt() {
  return (
    <div
      className="lp-heroart lp-parallax"
      style={{ position: 'relative', width: '100%', maxWidth: 500, marginInline: 'auto', aspectRatio: '1 / 1' }}
    >
      {/* halos que pulsam */}
      <span className="lp-halo lp-anim-glow" style={{ width: '70%', height: '70%', top: '6%', left: '14%', background: 'radial-gradient(circle,#5eead4,#0d9488)', opacity: 0.5 }} aria-hidden="true" />
      <span className="lp-halo lp-anim-glow" style={{ width: '55%', height: '55%', top: '-6%', right: '-4%', background: '#8b5cf6', opacity: 0.4, animationDelay: '1.5s' }} aria-hidden="true" />
      <span className="lp-halo lp-anim-glow" style={{ width: '45%', height: '45%', bottom: '-2%', left: '-8%', background: '#fbbf24', opacity: 0.4, animationDelay: '2.6s' }} aria-hidden="true" />

      {/* blob orgânico de fundo */}
      <Blob variant="teal" size="80%" top="11%" left="10%" style={{ opacity: 0.95, transform: 'translateZ(-40px)' }} />

      {/* orbes em deriva (profundidades diferentes) */}
      <span style={{ position: 'absolute', top: '-6%', left: '24%', transform: 'translateZ(60px)' }}>
        <Orb from="#c4b5fd" to="#7c3aed" size={64} className="lp-anim-drift" />
      </span>
      <span style={{ position: 'absolute', bottom: '8%', right: '2%', transform: 'translateZ(110px)' }}>
        <Orb from="#fde68a" to="#f59e0b" size={48} className="lp-anim-float-lg" />
      </span>
      <span style={{ position: 'absolute', top: '44%', right: '-5%', transform: 'translateZ(60px)' }}>
        <Orb from="#5eead4" to="#0d9488" size={38} className="lp-anim-drift-rev" />
      </span>
      <span style={{ position: 'absolute', bottom: '30%', left: '-2%', transform: 'translateZ(40px)' }}>
        <Orb from="#67e8f9" to="#0891b2" size={26} className="lp-anim-drift" />
      </span>

      <Sparkle top="12%" right="18%" size={30} color="#fff" className="lp-anim-float-lg" />
      <Sparkle bottom="18%" left="4%" size={22} color="#fef08a" className="lp-anim-drift" />

      {/* cartão central de agendamento (pop 3D + flutua) */}
      <div style={{ position: 'absolute', top: '21%', left: '13%', width: '74%', transform: 'translateZ(38px)', transformStyle: 'preserve-3d' }}>
        <div className="lp-glass lp-anim-float-lg" style={{ padding: '18px', borderRadius: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(145deg,#2dd4bf,#0f766e)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 700,
                fontFamily: 'var(--lp-font-display)',
                boxShadow: 'inset 0 2px 5px rgba(255,255,255,.4)',
              }}
            >
              J
            </span>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, color: 'var(--lp-text-strong)', fontSize: 15 }}>Corte + Barba</div>
              <div style={{ fontSize: 12.5, color: 'var(--lp-text-muted)' }}>com Juninho · 45 min</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
            {['13:30', '14:00', '14:30', '15:00'].map((t, i) => (
              <span
                key={t}
                className={i === 1 ? 'lp-anim-slot' : undefined}
                style={{
                  position: 'relative',
                  textAlign: 'center',
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: '9px 0',
                  borderRadius: 12,
                  fontFamily: 'var(--lp-font-display)',
                  color: i === 1 ? '#fff' : 'var(--lp-teal-deep)',
                  background: i === 1 ? 'linear-gradient(135deg,#14b8a6,#0f766e)' : 'var(--lp-mint-tint)',
                  border: i === 1 ? 'none' : '1px solid var(--lp-border-teal)',
                  boxShadow: i === 1 ? '0 8px 18px -6px rgba(13,148,136,.6)' : 'none',
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div
            className="lp-anim-shimmer"
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px',
              borderRadius: 14,
              backgroundImage: 'linear-gradient(110deg,#0f766e 0%,#14b8a6 40%,#5eead4 50%,#14b8a6 60%,#0f766e 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13.5,
              fontFamily: 'var(--lp-font-display)',
              boxShadow: '0 14px 26px -10px rgba(13,148,136,.7)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 4.5 4.5L19 7" />
            </svg>
            Agendado!
          </div>
        </div>
      </div>

      {/* chip flutuante "lembrete" */}
      <div style={{ position: 'absolute', bottom: '6%', right: '-6%', transform: 'translateZ(56px)' }}>
        <div
          className="lp-glass lp-anim-drift-rev"
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px 9px 9px', borderRadius: 999 }}
        >
          <IconTile name="bell" tone="amber" size={32} />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lp-text-strong)' }}>Lembrete enviado</div>
            <div style={{ fontSize: 10.5, color: 'var(--lp-text-muted)' }}>E-mail · 24h antes</div>
          </div>
        </div>
      </div>

      {/* chip flutuante "R$" */}
      <div style={{ position: 'absolute', top: '6%', left: '-2%', transform: 'translateZ(48px)' }}>
        <div
          className="lp-glass lp-anim-drift"
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px 9px 9px', borderRadius: 999 }}
        >
          <IconTile name="card" tone="violet" size={32} />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lp-text-strong)' }}>Pago no PIX</div>
            <div style={{ fontSize: 10.5, color: 'var(--lp-text-muted)' }}>R$ 70,00</div>
          </div>
        </div>
      </div>
    </div>
  );
}

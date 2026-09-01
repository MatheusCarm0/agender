import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import './landing.css';
import adminAgendaShot from '@/images/landing/admin-agenda.png';
import publicRealShot from '@/images/landing/public-real.png';
import { SiteNav } from '@/components/landing/site-nav';
import { Reveal } from '@/components/landing/reveal';
import { Faq } from '@/components/landing/faq';
import { Parallax } from '@/components/landing/parallax';
import { VisualConflict, VisualReminder, VisualPayment } from '@/components/landing/feature-visuals';
import { HeroArt, Blob, Halo, Orb, Sparkle } from '@/components/landing/decor';
import { IconTile } from '@/components/landing/icons';
import { AgenderLogo } from '@/components/logo';

export const metadata: Metadata = {
  title: 'Agender — Agendamento online lindo e no automático',
  description:
    'Página de agendamento personalizada, lembretes automáticos que acabam com o no-show e pagamento no PIX. Monte sua agenda online em minutos. Teste 7 dias grátis.',
  keywords: [
    'agendamento online',
    'agenda para barbearia',
    'agenda para salão',
    'software de agendamento',
    'link de agendamento',
    'reduzir no-show',
  ],
  openGraph: {
    title: 'Agender — Agendamento online lindo e no automático',
    description:
      'Página de agendamento personalizada, lembretes automáticos e pagamento no PIX. Teste 7 dias grátis, sem cartão.',
    type: 'website',
    locale: 'pt_BR',
  },
};

/* ----------------------------- Dados ----------------------------- */

const STEPS = [
  {
    title: 'Monte sua agenda',
    text: 'Cadastre serviços, profissionais e horários de trabalho. Um assistente guia você em poucos minutos.',
  },
  {
    title: 'Compartilhe seu link',
    text: 'Coloque na bio do Instagram, no WhatsApp e no Google. O cliente abre e marca — sem app, sem login.',
  },
  {
    title: 'Receba agendamentos',
    text: 'Os clientes marcam sozinhos, 24 horas por dia. Você só aparece na hora de atender.',
  },
];

const SEGMENTS = [
  'Barbearias',
  'Salões de beleza',
  'Clínicas de estética',
  'Estúdios de tatuagem',
  'Nail designers',
  'Personal trainers',
  'Consultórios',
  'Studios de pilates',
  'Massoterapia',
  'Depilação',
];

const PLANS = [
  {
    tier: 'basico',
    label: 'Básico',
    price: 'R$ 49,90',
    tagline: 'Pra começar a organizar de vez.',
    features: [
      'Agendamento online ilimitado',
      'Página pública personalizada',
      'Até 3 profissionais ativos',
      'Lembretes de agendamento',
      'Relatório financeiro',
    ],
    highlight: false,
  },
  {
    tier: 'profissional',
    label: 'Profissional',
    price: 'R$ 99,90',
    tagline: 'Pra cobrar e crescer com controle.',
    features: [
      'Tudo do Básico',
      'Até 10 profissionais ativos',
      'Cobrança no agendamento (PIX)',
      'Cupons de desconto',
    ],
    highlight: true,
  },
  {
    tier: 'pro',
    label: 'Pro',
    price: 'R$ 199,90',
    tagline: 'Pra escalar sem limite.',
    features: [
      'Tudo do Profissional',
      'Profissionais ilimitados',
      'Campanhas de disparo',
      'Clube fidelidade',
    ],
    highlight: false,
  },
];

/* --------------------------- Utilidades -------------------------- */

function Section({
  id,
  children,
  style,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <section id={id} className={className} style={{ position: 'relative', padding: 'clamp(4.5rem, 9vw, 8rem) 0', ...style }}>
      {children}
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  lead,
  center = true,
  dark = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <Reveal>
      <div style={{ maxWidth: 720, marginInline: center ? 'auto' : undefined, textAlign: center ? 'center' : 'left' }}>
        <span className="lp-eyebrow" style={{ color: dark ? 'var(--lp-mint)' : undefined }}>
          {eyebrow}
        </span>
        <h2 className="lp-display lp-h2" style={{ marginTop: 14, marginBottom: 0, color: dark ? '#fff' : undefined }}>
          {title}
        </h2>
        {lead && (
          <p
            className="lp-lead"
            style={{ marginTop: 18, marginBottom: 0, color: dark ? 'rgba(255,255,255,.72)' : 'var(--lp-text-muted)' }}
          >
            {lead}
          </p>
        )}
      </div>
    </Reveal>
  );
}

function Check() {
  return (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0,
        width: 22,
        height: 22,
        borderRadius: 999,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--lp-mint-tint)',
        color: 'var(--lp-teal-deep)',
        marginTop: 1,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 4.5 4.5L19 7" />
      </svg>
    </span>
  );
}

/* Moldura de navegador (slot para print real do painel) */
function BrowserShot() {
  return (
    <div className="lp-browser">
      <div className="lp-browser-bar">
        <span className="lp-browser-dot" style={{ background: '#ff5f57' }} />
        <span className="lp-browser-dot" style={{ background: '#febc2e' }} />
        <span className="lp-browser-dot" style={{ background: '#28c840' }} />
        <span
          style={{
            marginLeft: 10,
            flex: 1,
            maxWidth: 320,
            height: 22,
            borderRadius: 999,
            background: '#fff',
            border: '1px solid var(--lp-border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            fontSize: 11,
            color: 'var(--lp-text-subtle, #a8a29e)',
          }}
        >
          agender.app/admin
        </span>
      </div>
      <div style={{ position: 'relative', aspectRatio: '16 / 10' }}>
        <Image
          src={adminAgendaShot}
          alt="Painel do Agender mostrando a agenda do dia com os horários dos profissionais"
          fill
          unoptimized
          sizes="(max-width: 980px) 90vw, 820px"
          style={{ objectFit: 'cover', objectPosition: 'top left' }}
        />
      </div>
    </div>
  );
}

/* Moldura de celular com o print REAL da página pública do Studio Aurora */
function PhoneShot() {
  return (
    <div className="lp-phone" style={{ width: 236 }}>
      <span className="lp-phone-notch" />
      <div className="lp-phone-screen">
        <Image
          src={publicRealShot}
          alt="Página pública real de agendamento do Studio Aurora, feita no Agender"
          fill
          unoptimized
          sizes="240px"
          style={{ objectFit: 'cover', objectPosition: 'top' }}
        />
      </div>
    </div>
  );
}

/* ----------------------------- Página ---------------------------- */

export default function LandingPage() {
  return (
    <div className="lp">
      <SiteNav />

      {/* ============================= HERO ============================= */}
      <section className="lp-grain" style={{ position: 'relative', overflow: 'hidden', paddingBottom: 'clamp(3rem, 6vw, 6rem)' }}>
        {/* fundo decorativo */}
        <div className="lp-dotgrid" style={{ position: 'absolute', inset: 0, opacity: 0.6, maskImage: 'radial-gradient(80% 60% at 50% 0%, #000, transparent)' }} aria-hidden="true" />
        <Halo color="rgba(94,234,212,.6)" size={620} top={-180} left={-140} />
        <Halo color="rgba(139,92,246,.4)" size={520} top={-80} right={-160} />

        <div
          className="lp-container"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(2rem, 5vw, 4rem)',
            alignItems: 'center',
            paddingTop: 'clamp(2rem, 5vw, 4.5rem)',
          }}
        >
          {/* coluna texto */}
          <div style={{ maxWidth: 560, position: 'relative', zIndex: 3 }}>

            <Reveal delay={60}>
              <h1 className="lp-display lp-h1" style={{ marginTop: 22, marginBottom: 0, position: 'relative', zIndex: 3 }}>
                O jeito <span className="lp-grad-anim">bonito e simples</span> de lotar <span className="lp-mark">sua agenda</span>.
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="lp-lead" style={{ marginTop: 22, color: 'var(--lp-text-muted)', maxWidth: 540 }}>
                Página de agendamento personalizada, lembretes automáticos que acabam com o no-show e pagamento no
                PIX — tudo em um link só que você põe na bio.
              </p>
            </Reveal>

            <Reveal delay={180}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 30 }}>
                <Link href="/register" className="lp-btn lp-btn-primary" style={{ fontSize: 17, padding: '1.05rem 1.9rem' }}>
                  Começar grátis
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <a href="#exemplos" className="lp-btn lp-btn-ghost" style={{ fontSize: 17, padding: '1.05rem 1.7rem' }}>
                  Ver por dentro
                </a>
              </div>
            </Reveal>
          </div>

          {/* coluna arte */}
          <Reveal delay={160}>
            <Parallax>
              <HeroArt />
            </Parallax>
          </Reveal>
        </div>
      </section>

      {/* ========================== RECURSOS ========================== */}
      <Section id="recursos" className="lp-grain">
        <Blob variant="violet" size={200} top={5} right="2%" style={{ opacity: 0.12, filter: 'blur(36px)' }} />
        <Blob variant="teal" size={160} bottom={0} left="-3%" style={{ opacity: 0.1, filter: 'blur(36px)' }} />
        <div className="lp-container" style={{ position: 'relative' }}>
          <div style={{ maxWidth: 780 }}>
            <Reveal>
              <span className="lp-eyebrow">Por dentro do produto</span>
              <h2 className="lp-display lp-h2" style={{ marginTop: 14, marginBottom: 0 }}>
                O trabalho chato, <span className="lp-mark lp-mark-violet">no automático</span>.
              </h2>
            </Reveal>
          </div>

          <div style={{ marginTop: 'clamp(3rem, 6vw, 5rem)', display: 'flex', flexDirection: 'column', gap: 'clamp(3.5rem, 7vw, 7rem)' }}>
            {/* Spotlight 1 — anti-conflito */}
            <Reveal>
              <div className="lp-spot">
                <div className="lp-spot-text">
                  <span style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 700, color: 'var(--lp-teal)', fontSize: 15 }}>Núcleo</span>
                  <h3 className="lp-display" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', margin: '10px 0 14px' }}>Agenda que <span className="lp-grad-anim">nunca dá encontro</span>.</h3>
                  <p style={{ margin: 0, color: 'var(--lp-text-muted)', fontSize: 'clamp(1rem,1.5vw,1.15rem)', lineHeight: 1.65, maxWidth: 460 }}>
                    Trava de horário de verdade: dois clientes jamais caem no mesmo slot — nem quando todo mundo marca no mesmo minuto. Adeus, dor de cabeça no balcão.
                  </p>
                </div>
                <div className="lp-spot-visual"><VisualConflict /></div>
              </div>
            </Reveal>

            {/* Spotlight 2 — lembretes (invertido) */}
            <Reveal>
              <div className="lp-spot lp-spot-rev">
                <div className="lp-spot-text">
                  <span style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 700, color: 'var(--lp-teal)', fontSize: 15 }}>Retenção</span>
                  <h3 className="lp-display" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', margin: '10px 0 14px' }}>Lembretes que <span className="lp-grad-anim">trazem o cliente</span>.</h3>
                  <p style={{ margin: 0, color: 'var(--lp-text-muted)', fontSize: 'clamp(1rem,1.5vw,1.15rem)', lineHeight: 1.65, maxWidth: 460 }}>
                    WhatsApp e e-mail automáticos antes do horário. O cliente lembra, confirma e aparece — e você não digita uma mensagem sequer.
                  </p>
                </div>
                <div className="lp-spot-visual"><VisualReminder /></div>
              </div>
            </Reveal>

            {/* Spotlight 3 — pagamento/financeiro */}
            <Reveal>
              <div className="lp-spot">
                <div className="lp-spot-text">
                  <span style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 700, color: 'var(--lp-teal)', fontSize: 15 }}>Dinheiro</span>
                  <h3 className="lp-display" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', margin: '10px 0 14px' }}>Receba antes, no PIX. <span className="lp-grad-anim">E veja tudo</span>.</h3>
                  <p style={{ margin: 0, color: 'var(--lp-text-muted)', fontSize: 'clamp(1rem,1.5vw,1.15rem)', lineHeight: 1.65, maxWidth: 460 }}>
                    Cobre no ato do agendamento e reduza o furo de agenda. Depois, um financeiro que você entende de bater o olho — receita, faltas e desempenho por profissional.
                  </p>
                </div>
                <div className="lp-spot-visual"><VisualPayment /></div>
              </div>
            </Reveal>
          </div>

          {/* Tira "e ainda" — sem cards */}
          <Reveal>
            <div style={{ marginTop: 'clamp(3.5rem, 7vw, 6rem)', paddingTop: 'clamp(2rem,4vw,3rem)', borderTop: '1px solid var(--lp-border)' }}>
              <div className="lp-more">
                {[
                  { icon: 'palette' as const, tone: 'violet', t: 'Página com a sua cara', d: 'Cores, fonte e logo do seu jeito.' },
                  { icon: 'ticket' as const, tone: 'amber', t: 'Cupons de desconto', d: 'Promoções que puxam movimento.' },
                  { icon: 'heart' as const, tone: 'coral', t: 'Clube de fidelidade', d: 'Faça o cliente voltar sempre.' },
                  { icon: 'users' as const, tone: 'teal', t: 'Equipe & permissões', d: 'Cada um vê a agenda certa.' },
                ].map((m) => (
                  <div key={m.t} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <IconTile name={m.icon} tone={m.tone as never} size={44} />
                    <div style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 700, fontSize: 16, color: 'var(--lp-text-strong)' }}>{m.t}</div>
                    <p style={{ margin: 0, color: 'var(--lp-text-muted)', fontSize: 14, lineHeight: 1.5 }}>{m.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ======================= COMO FUNCIONA ======================== */}
      <Section id="como-funciona" style={{ background: 'linear-gradient(160deg, var(--lp-ink), var(--lp-ink-2))', overflow: 'hidden' }}>
        <Orb from="#5eead4" to="#0d9488" size={90} top="12%" left="6%" className="lp-anim-float" />
        <Orb from="#c4b5fd" to="#7c3aed" size={64} bottom="14%" right="8%" className="lp-anim-float-sm" />
        <Sparkle top="18%" right="16%" size={24} color="#5eead4" className="lp-anim-float-sm" />
        <Halo color="rgba(13,148,136,.5)" size={520} bottom={-200} left="30%" opacity={0.4} />

        <div className="lp-container" style={{ position: 'relative' }}>
          <SectionHead
            dark
            eyebrow="Simples assim"
            title="Do zero à agenda cheia em 3 passos"
            lead="Sem migração complicada, sem manual de 40 páginas. Você entende hoje e já usa hoje."
          />
          <div
            style={{
              marginTop: 'clamp(2.5rem, 5vw, 4rem)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 22,
            }}
          >
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div
                  className="lp-glass"
                  style={{ padding: '30px 26px', height: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)' }}
                >
                  <h3 className="lp-display lp-h3" style={{ marginTop: 8, marginBottom: 8, color: '#fff' }}>
                    {s.title}
                  </h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,.7)', fontSize: 15.5, lineHeight: 1.62 }}>{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ====================== STATEMENT (impacto) =================== */}
      <section
        className="lp-grain lp-grain-strong"
        style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(4.5rem, 9vw, 7.5rem) 0', background: 'linear-gradient(125deg,#0f766e 0%,#14b8a6 55%,#0d9488 100%)' }}
      >
        <span style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 80% at 15% 10%, rgba(94,234,212,.5), transparent 60%), radial-gradient(50% 70% at 95% 90%, rgba(139,92,246,.35), transparent 60%)' }} aria-hidden="true" />
        <span style={{ position: 'absolute', top: '14%', right: '10%' }}>
          <Orb from="#fde68a" to="#f59e0b" size={54} className="lp-anim-float-lg" />
        </span>
        <span style={{ position: 'absolute', bottom: '16%', left: '8%' }}>
          <Orb from="#c4b5fd" to="#7c3aed" size={40} className="lp-anim-drift" />
        </span>

        <div className="lp-container" style={{ position: 'relative', textAlign: 'center' }}>
          <Reveal>
            <h2 className="lp-display lp-display-xl" style={{ color: '#fff', marginBottom: 0, textShadow: '0 8px 30px rgba(6,40,35,.25)' }}>
              Chega de <span style={{ fontStyle: 'italic', opacity: 0.92 }}>“tem horário?”</span><br />no zap o dia inteiro.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{ color: 'rgba(255,255,255,.9)', fontSize: 'clamp(1.05rem, 1.9vw, 1.42rem)', maxWidth: 660, margin: '24px auto 0', lineHeight: 1.55 }}>
              O Agender atende, confirma e lembra por você — 24 horas por dia, sem você tocar no celular.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
              {['Agenda aberta 24h', 'Zero WhatsApp manual', 'Menos no-show', 'Pago no PIX'].map((t) => (
                <span key={t} style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 600, fontSize: 14.5, color: '#fff', padding: '9px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,.4)', background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(6px)' }}>
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========================== EXEMPLOS ========================== */}
      <section
        id="exemplos"
        className="lp-mesh-dark lp-grain lp-grain-strong"
        style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(4.5rem, 9vw, 8rem) 0' }}
      >
        <span className="lp-glow-ring lp-anim-glow" style={{ position: 'absolute', width: 540, height: 540, top: '6%', left: '32%', background: 'radial-gradient(circle,#14b8a6,transparent 70%)' }} aria-hidden="true" />
        <span className="lp-glow-ring" style={{ position: 'absolute', width: 420, height: 420, bottom: '-8%', right: '4%', background: 'radial-gradient(circle,#8b5cf6,transparent 70%)', opacity: 0.4 }} aria-hidden="true" />

        <div className="lp-container" style={{ position: 'relative' }}>
          <Reveal>
            <div style={{ maxWidth: 700 }}>
              <span className="lp-eyebrow" style={{ color: 'var(--lp-mint)' }}>Veja por dentro</span>
              <h2 className="lp-display lp-h2" style={{ color: '#fff', marginTop: 14, marginBottom: 0 }}>
                Não é bonito só por fora. <span className="lp-grad-anim">É por dentro</span> também.
              </h2>
              <p className="lp-lead" style={{ color: 'rgba(255,255,255,.72)', marginTop: 16, maxWidth: 560 }}>
                O painel que organiza o seu dia e a página que faz o cliente marcar em segundos — com o capricho que o seu negócio merece.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <Parallax>
              <div className="lp-parallax lp-showcase-stage">
                {/* janela do navegador — print real */}
                <div className="lp-sc-window lp-window-3d">
                  <BrowserShot />
                </div>

                {/* celular — print REAL da página pública */}
                <div className="lp-sc-phone lp-anim-float-lg" style={{ transform: 'translateZ(40px)' }}>
                  <PhoneShot />
                </div>

                {/* KPI flutuante (rebuild nítido) */}
                <div className="lp-sc-kpi lp-ui-card lp-anim-float-lg" style={{ transform: 'translateZ(70px)', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--lp-text-muted)' }}>Receita hoje</span>
                    <IconTile name="chart" tone="lime" size={26} />
                  </div>
                  <div className="lp-display" style={{ fontSize: 30, marginTop: 8, color: 'var(--lp-text-strong)' }}>R$ 1.190,00</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12.5, color: '#16a34a', fontWeight: 700 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l6-6 4 4 6-7M17 7h3v3" /></svg>
                    +18% vs. ontem
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 32, marginTop: 12 }}>
                    {[42, 60, 48, 74, 58, 88, 70].map((h, i) => (
                      <span key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, background: 'linear-gradient(180deg,#2dd4bf,#0f766e)', opacity: i === 5 ? 1 : 0.55 }} />
                    ))}
                  </div>
                </div>

                {/* card de agendamento flutuante (rebuild nítido) */}
                <div className="lp-sc-appt lp-ui-card lp-anim-drift" style={{ transform: 'translateZ(88px)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(145deg,#2dd4bf,#0f766e)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontFamily: 'var(--lp-font-display)' }}>M</span>
                    <div style={{ lineHeight: 1.25, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--lp-text-strong)' }}>Novo agendamento</div>
                      <div style={{ fontSize: 12, color: 'var(--lp-text-muted)' }}>Corte + Barba · hoje 14:00</div>
                    </div>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg>
                    </span>
                  </div>
                </div>

                {/* toast flutuante */}
                <div className="lp-sc-toast lp-anim-drift-rev" style={{ transform: 'translateZ(52px)' }}>
                  <div className="lp-glass" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 15px 9px 9px', borderRadius: 999, background: 'rgba(255,255,255,.92)' }}>
                    <IconTile name="bell" tone="amber" size={30} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--lp-text-strong)' }}>Lembrete enviado ✓</span>
                  </div>
                </div>
              </div>
            </Parallax>
          </Reveal>

          <Reveal delay={120}>
            <div style={{ display: 'flex', gap: 12, marginTop: 44, flexWrap: 'wrap' }}>
              <span className="lp-pill"><IconTile name="chart" tone="lime" size={22} /> Financeiro & agenda do dia</span>
              <span className="lp-pill"><IconTile name="palette" tone="violet" size={22} /> Página personalizável</span>
              <span className="lp-pill"><IconTile name="users" tone="teal" size={22} /> Vários profissionais</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ PREÇOS ========================== */}
      <Section id="precos">
        <Halo color="rgba(139,92,246,.22)" size={420} top={40} right={-120} opacity={0.5} />
        <div className="lp-container" style={{ position: 'relative' }}>
          <SectionHead
            eyebrow="Planos"
            title={<>Comece grátis. <span className="lp-grad-text">Escale quando quiser</span>.</>}
            lead="7 dias com tudo liberado pra você conhecer. Depois, escolha o plano que combina com o tamanho do seu negócio."
          />

          <div
            style={{
              marginTop: 'clamp(2.5rem, 5vw, 4rem)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 22,
              alignItems: 'stretch',
              maxWidth: 1040,
              marginInline: 'auto',
            }}
          >
            {PLANS.map((p, i) => (
              <Reveal key={p.tier} delay={i * 90}>
                <article
                  className="lp-card"
                  style={{
                    position: 'relative',
                    padding: '30px 28px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 26,
                    borderColor: p.highlight ? 'transparent' : undefined,
                    background: p.highlight ? 'linear-gradient(165deg, var(--lp-ink), var(--lp-ink-2))' : undefined,
                    boxShadow: p.highlight ? 'var(--lp-shadow-lg)' : undefined,
                    transform: p.highlight ? 'translateY(-8px)' : undefined,
                  }}
                >
                  {p.highlight && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 18,
                        right: 18,
                        fontFamily: 'var(--lp-font-display)',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#062621',
                        background: 'var(--lp-mint)',
                        padding: '5px 11px',
                        borderRadius: 999,
                      }}
                    >
                      Mais popular
                    </span>
                  )}
                  <h3 className="lp-display" style={{ fontSize: 21, marginBottom: 4, color: p.highlight ? '#fff' : undefined }}>
                    {p.label}
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, color: p.highlight ? 'rgba(255,255,255,.65)' : 'var(--lp-text-muted)' }}>{p.tagline}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 18 }}>
                    <span className="lp-display" style={{ fontSize: 40, color: p.highlight ? '#fff' : 'var(--lp-text-strong)' }}>{p.price}</span>
                    <span style={{ fontSize: 14, color: p.highlight ? 'rgba(255,255,255,.6)' : 'var(--lp-text-muted)' }}>/mês</span>
                  </div>

                  <Link
                    href="/register"
                    className={p.highlight ? 'lp-btn lp-btn-dark' : 'lp-btn lp-btn-primary'}
                    style={{ width: '100%', marginTop: 22 }}
                  >
                    Começar grátis
                  </Link>

                  <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {p.features.map((feat) => (
                      <li key={feat} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14.5, color: p.highlight ? 'rgba(255,255,255,.82)' : 'var(--lp-text)' }}>
                        <Check />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 26, fontSize: 13, color: 'var(--lp-text-muted)' }}>
            Cobrança recorrente e segura via Mercado Pago. Troque ou cancele o plano a qualquer momento.
          </p>
        </div>
      </Section>

      {/* ============================= FAQ ============================ */}
      <Section id="faq" style={{ background: 'var(--lp-cream-2)' }}>
        <div className="lp-container" style={{ position: 'relative' }}>
          <SectionHead eyebrow="Dúvidas" title="Perguntas frequentes" lead="Se ficar alguma dúvida, é só falar com a gente." />
          <div style={{ marginTop: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
            <Faq />
          </div>
        </div>
      </Section>

      {/* ============================= CTA ============================ */}
      <Section style={{ paddingBottom: 'clamp(3rem,6vw,5rem)' }}>
        <div className="lp-container">
          <Reveal>
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 'var(--lp-radius-xl)',
                padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)',
                background: 'linear-gradient(150deg, var(--lp-teal-deep), var(--lp-ink) 85%)',
                textAlign: 'center',
              }}
            >
              <Halo color="rgba(94,234,212,.5)" size={420} top={-160} left="50%" opacity={0.5} />
              <Orb from="#fde68a" to="#f59e0b" size={56} top="18%" left="12%" className="lp-anim-float" />
              <Orb from="#c4b5fd" to="#7c3aed" size={44} bottom="18%" right="14%" className="lp-anim-float-sm" />
              <Sparkle top="22%" right="24%" size={26} color="#5eead4" className="lp-anim-float-sm" />

              <div style={{ position: 'relative', maxWidth: 640, marginInline: 'auto' }}>
                <h2 className="lp-display lp-h2" style={{ color: '#fff', marginBottom: 16 }}>
                  Sua agenda cheia começa hoje.
                </h2>
                <p style={{ color: 'rgba(255,255,255,.78)', fontSize: 'clamp(1rem,1.6vw,1.2rem)', marginBottom: 30 }}>
                  Teste 7 dias grátis com tudo liberado. Sem cartão, sem compromisso.
                </p>
                <Link href="/register" className="lp-btn lp-btn-dark" style={{ fontSize: 17, padding: '1.1rem 2.1rem' }}>
                  Criar minha agenda grátis
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* =========================== RODAPÉ =========================== */}
      <footer style={{ background: 'var(--lp-ink)', color: 'rgba(255,255,255,.7)', paddingTop: 'clamp(3rem,5vw,4.5rem)', paddingBottom: '2.5rem' }}>
        <div className="lp-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ maxWidth: 300 }}>
              <AgenderLogo color="dark" width={140} height={42} />
              <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.6)' }}>
                Agendamento online lindo e no automático para quem trabalha com hora marcada.
              </p>
            </div>
            <FooterCol
              title="Produto"
              links={[
                { label: 'Recursos', href: '#recursos' },
                { label: 'Como funciona', href: '#como-funciona' },
                { label: 'Exemplos', href: '#exemplos' },
                { label: 'Preços', href: '#precos' },
              ]}
            />
            <FooterCol
              title="Conta"
              links={[
                { label: 'Entrar', href: '/login' },
                { label: 'Criar conta grátis', href: '/register' },
                { label: 'Perguntas frequentes', href: '/faq' },
              ]}
            />
            <FooterCol
              title="Legal"
              links={[
                { label: 'Termos de uso', href: '/termos' },
                { label: 'Privacidade', href: '/privacidade' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
            <span>© {new Date().getFullYear()} Agender. Todos os direitos reservados.</span>
            <span>Feito no Brasil com carinho.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 600, fontSize: 14, color: '#fff', margin: '0 0 14px', letterSpacing: '.02em' }}>
        {title}
      </h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', textDecoration: 'none' }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

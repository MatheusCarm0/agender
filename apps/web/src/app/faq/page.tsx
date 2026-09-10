import Link from 'next/link';

import '../landing.css';
import { AgenderLogo } from '@/components/logo';
import { Halo } from '@/components/landing/decor';

export const metadata = {
  title: 'Perguntas frequentes — Agender',
  description: 'Dúvidas comuns sobre a plataforma de agendamento Agender.',
};

interface QA {
  q: string;
  a: React.ReactNode;
}

interface Section {
  title: string;
  items: QA[];
}

const SECTIONS: Section[] = [
  {
    title: 'Começando',
    items: [
      {
        q: 'O que é a Agender?',
        a: 'Uma plataforma de agendamento online para negócios de serviço por horário (barbearias, salões, clínicas, estúdios). Você cadastra sua equipe, serviços e horários, e ganha uma página pública onde seus clientes marcam horário sozinhos.',
      },
      {
        q: 'Como meu cliente agenda?',
        a: 'Pelo seu link personalizado (ex.: agender.app/seu-negocio). Ele escolhe profissional, serviço e um horário livre, informa nome e telefone e confirma. Não precisa criar conta nem senha.',
      },
      {
        q: 'Preciso instalar alguma coisa?',
        a: 'Não. Tudo funciona pelo navegador, no computador ou no celular.',
      },
    ],
  },
  {
    title: 'Planos e teste grátis',
    items: [
      {
        q: 'Tem período de teste?',
        a: 'Sim. Você começa com um período de teste gratuito para experimentar a plataforma. Antes de acabar, avisamos por e-mail para você escolher um plano e continuar sem interrupção.',
      },
      {
        q: 'Como funciona a cobrança do plano?',
        a: 'A assinatura é mensal e recorrente, processada com segurança pelo Mercado Pago. Você pode trocar de plano ou cancelar quando quiser — o acesso segue até o fim do ciclo já pago.',
      },
      {
        q: 'O que acontece se o pagamento falhar?',
        a: 'Você entra num período de tolerância antes de qualquer suspensão. Seus dados e agendamentos continuam preservados; basta regularizar o pagamento para voltar ao normal.',
      },
    ],
  },
  {
    title: 'Pagamentos e recebimento',
    items: [
      {
        q: 'Posso cobrar do cliente no momento do agendamento?',
        a: 'Sim, se ativar essa opção. Você pode exigir o valor cheio ou um depósito (uma porcentagem) para reduzir faltas. O horário fica reservado e só é confirmado após o pagamento.',
      },
      {
        q: 'Como recebo esse dinheiro?',
        a: 'No painel de Recebimento você cadastra seus dados (CPF/CNPJ e chave PIX) e acompanha o saldo. O saque fica disponível quando sua conta de recebimento está ativa.',
      },
      {
        q: 'A plataforma cobra comissão sobre os agendamentos?',
        a: 'Não cobramos comissão sobre o valor do agendamento. Atenção: o gateway de pagamento (Mercado Pago) desconta a taxa de processamento dele sobre cada transação — por isso o painel sempre mostra o valor líquido estimado, nunca só o bruto.',
      },
    ],
  },
  {
    title: 'Notificações',
    items: [
      {
        q: 'Meus clientes recebem lembrete?',
        a: 'Sim. A plataforma envia confirmação e lembrete do agendamento por e-mail, o que ajuda a reduzir faltas.',
      },
    ],
  },
  {
    title: 'Equipe e privacidade',
    items: [
      {
        q: 'Posso dar acesso para minha equipe?',
        a: 'Sim. Você convida profissionais e recepção com papéis diferentes: cada profissional vê a própria agenda; o dono e o admin veem tudo.',
      },
      {
        q: 'E os dados dos meus clientes? (LGPD)',
        a: (
          <>
            Os dados dos seus clientes ficam isolados no seu negócio — nenhum outro negócio os
            acessa. Sobre esses dados, <strong>você é o Controlador</strong> e a plataforma é a{' '}
            <strong>Operadora</strong> (tratamos os dados a seu pedido). Isso significa que você
            deve ter base legal para usá-los e informar seus clientes. Os detalhes estão nos{' '}
            <Link href="/termos">Termos de Uso</Link> e na{' '}
            <Link href="/privacidade">Política de Privacidade</Link>.
          </>
        ),
      },
    ],
  },
  {
    title: 'Suporte',
    items: [
      {
        q: 'Como reporto um problema ou dou uma sugestão?',
        a: (
          <>
            Estamos em fase de testes e seu retorno é muito bem-vindo. Use o botão{' '}
            <strong>“Reportar problema”</strong> dentro do painel, ou escreva para{' '}
            <a href="mailto:suporte@agender.app">suporte@agender.app</a>.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="lp" style={{ minHeight: '100vh', background: 'var(--lp-cream)' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(250,250,249,.82)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--lp-border)',
        }}
      >
        <nav className="lp-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <Link href="/" aria-label="Agender — início" style={{ display: 'inline-flex' }}>
            <AgenderLogo width={132} height={40} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/login" className="lp-btn lp-btn-ghost" style={{ padding: '0.7rem 1.15rem', fontSize: 15 }}>Entrar</Link>
            <Link href="/register" className="lp-btn lp-btn-primary" style={{ padding: '0.7rem 1.3rem', fontSize: 15 }}>Começar grátis</Link>
          </div>
        </nav>
      </header>

      {/* Conteúdo */}
      <section className="lp-grain" style={{ position: 'relative', overflow: 'hidden', paddingTop: 'clamp(3rem, 6vw, 5rem)', paddingBottom: 'clamp(4rem, 8vw, 7rem)' }}>
        <Halo color="rgba(94,234,212,.5)" size={520} top={-200} left="30%" />
        <Halo color="rgba(139,92,246,.28)" size={380} top={-80} right={-120} />

        <div className="lp-container" style={{ position: 'relative', maxWidth: 820 }}>
          <span className="lp-eyebrow">Central de ajuda</span>
          <h1 className="lp-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', marginTop: 12, marginBottom: 14 }}>
            Perguntas frequentes
          </h1>
          <p className="lp-lead" style={{ color: 'var(--lp-text-muted)', margin: 0, maxWidth: 620 }}>
            As dúvidas mais comuns sobre a Agender. Não achou o que procurava? Fale com a gente em{' '}
            <a href="mailto:suporte@agender.app" className="lp-link">suporte@agender.app</a>.
          </p>

          <div style={{ marginTop: 'clamp(2.5rem, 5vw, 3.5rem)', display: 'flex', flexDirection: 'column', gap: 'clamp(2rem, 4vw, 3rem)' }}>
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="lp-eyebrow" style={{ marginBottom: 14 }}>{section.title}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {section.items.map((item) => (
                    <details key={item.q} className="lp-faq-item">
                      <summary>
                        {item.q}
                        <span className="lp-faq-chev" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </summary>
                      <div className="lp-faq-answer">{item.a}</div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <footer style={{ marginTop: 'clamp(3rem, 6vw, 4.5rem)', paddingTop: 24, borderTop: '1px solid var(--lp-border)', display: 'flex', flexWrap: 'wrap', gap: '8px 24px', alignItems: 'center', fontSize: 13, color: 'var(--lp-text-subtle)' }}>
            <Link href="/termos" className="lp-link" style={{ color: 'var(--lp-text-muted)', fontWeight: 500 }}>Termos de Uso</Link>
            <Link href="/privacidade" className="lp-link" style={{ color: 'var(--lp-text-muted)', fontWeight: 500 }}>Política de Privacidade</Link>
            <span style={{ marginLeft: 'auto' }}>© {new Date().getFullYear()} Agender · Plataforma de agendamento online.</span>
          </footer>
        </div>
      </section>
    </div>
  );
}

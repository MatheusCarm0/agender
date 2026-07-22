import Link from 'next/link';
import { AgenderLogo } from '@/components/logo';

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
        a: 'Sim. A plataforma envia confirmação e lembrete do agendamento por e-mail e/ou WhatsApp (conforme o plano e a configuração), o que ajuda a reduzir faltas.',
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
            deve ter base legal para usá-los e informar seus clientes. Os detalhes estão nos
            Termos de Uso e na Política de Privacidade.
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
            <a
              href="mailto:suporte@agender.app"
              className="text-primary-default hover:text-primary-hover font-medium"
            >
              suporte@agender.app
            </a>
            .
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-surface-app">
      <header className="border-b border-border-default bg-surface-card">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" aria-label="Agender">
            <AgenderLogo size="md" />
          </Link>
          <Link
            href="/login"
            className="text-sm text-primary-default hover:text-primary-hover font-medium"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold text-text-strong">Perguntas frequentes</h1>
        <p className="text-sm text-text-muted mt-2">
          As dúvidas mais comuns sobre a Agender. Não achou o que procurava? Fale com a gente em{' '}
          <a
            href="mailto:suporte@agender.app"
            className="text-primary-default hover:text-primary-hover font-medium"
          >
            suporte@agender.app
          </a>
          .
        </p>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-subtle mb-3">
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <details
                    key={item.q}
                    className="group bg-surface-card border border-border-default rounded-[var(--radius-md)] overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none text-sm font-medium text-text-strong hover:bg-surface-subtle">
                      {item.q}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-text-subtle transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </summary>
                    <div className="px-4 pb-4 pt-0 text-sm text-text-muted leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 pt-6 border-t border-border-default text-xs text-text-subtle">
          © {new Date().getFullYear()} Agender · Plataforma de agendamento online.
        </footer>
      </main>
    </div>
  );
}

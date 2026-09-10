'use client';

import { useState } from 'react';

const ITEMS = [
  {
    q: 'Preciso de cartão de crédito para testar?',
    a: 'Não. Você cria a conta e usa 7 dias com a experiência completa (equivalente ao plano Pro), sem cadastrar cartão. Só escolhe um plano se decidir continuar.',
  },
  {
    q: 'Meus clientes precisam instalar aplicativo ou criar login?',
    a: 'Não. O cliente final abre o seu link personalizado, escolhe profissional, serviço e horário livre, e pronto. Sem app, sem senha.',
  },
  {
    q: 'Como funciona o lembrete que reduz o no-show?',
    a: 'A cada agendamento, o sistema dispara lembretes automáticos por e-mail antes do horário — reduzindo faltas sem você precisar mandar mensagem manualmente.',
  },
  {
    q: 'Consigo receber pagamento na hora de agendar?',
    a: 'Sim, nos planos Profissional e Pro. O cliente paga via PIX no momento do agendamento e você acompanha tudo no relatório financeiro.',
  },
  {
    q: 'Dá para ter vários profissionais e cada um com sua agenda?',
    a: 'Sim. Cada profissional enxerga a própria agenda; o dono e a recepção enxergam tudo. O limite de profissionais varia conforme o plano.',
  },
  {
    q: 'Posso personalizar a página pública com a cara do meu negócio?',
    a: 'Totalmente. Cores, fonte, fundo e logo são configuráveis por negócio — a página do cliente fica com a identidade da sua marca, não com a nossa.',
  },
];

export function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 780, marginInline: 'auto' }}>
      {ITEMS.map((item, i) => {
        const open = openIdx === i;
        return (
          <div
            key={item.q}
            className="lp-card"
            style={{ borderRadius: 20, overflow: 'hidden', borderColor: open ? 'var(--lp-border-teal)' : undefined }}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '20px 22px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--lp-font-display)',
                fontWeight: 600,
                fontSize: 17,
                color: 'var(--lp-text-strong)',
              }}
            >
              {item.q}
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  background: open ? 'linear-gradient(135deg,#14b8a6,#0f766e)' : 'var(--lp-mint-tint)',
                  color: open ? '#fff' : 'var(--lp-teal-deep)',
                  transition: 'transform .25s ease, background .25s ease',
                  transform: open ? 'rotate(45deg)' : 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            <div
              style={{
                display: 'grid',
                gridTemplateRows: open ? '1fr' : '0fr',
                transition: 'grid-template-rows .28s ease',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <p style={{ margin: 0, padding: '0 22px 22px', color: 'var(--lp-text-muted)', fontSize: 15.5, lineHeight: 1.65 }}>
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

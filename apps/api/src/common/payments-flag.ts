/**
 * Kill-switch global de cobrança online no agendamento.
 *
 * Enquanto split/marketplace e payout real são checkpoint de produção (ver
 * docs/pagamentos.md), a cobrança online do agendamento fica DESLIGADA por
 * padrão no beta — o dinheiro cairia na conta única da plataforma sem caminho
 * de repasse ao negócio. As telas de recebimento/cobrança no admin já refletem
 * isso; este flag fecha também o fluxo público (backend), independentemente da
 * `bookingPaymentPolicy` que um negócio tenha gravado.
 *
 * Para reabrir (após plugar split + payout), defina `ONLINE_PAYMENTS_ENABLED=true`.
 */
export const ONLINE_PAYMENTS_ENABLED =
  process.env.ONLINE_PAYMENTS_ENABLED === 'true';

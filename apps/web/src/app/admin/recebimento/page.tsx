export default function RecebimentoPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-strong">Recebimento</h1>
        <p className="text-sm text-text-muted mt-1">
          Receba os pagamentos dos agendamentos e acompanhe seu saldo.
        </p>
      </div>

      <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-10 shadow-[var(--shadow-elevation-1)] text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-[var(--radius-pill)] bg-primary-tint-bg text-primary-tint-text flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12V7H5a2 2 0 010-4h14v4" />
            <path d="M3 5v14a2 2 0 002 2h16v-5" />
            <path d="M18 12a2 2 0 100 4h4v-4z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-text-strong">
          Recebimento chega em breve
        </h2>
        <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
          Estamos finalizando o recebimento online e o saque para a sua conta. Essa
          funcionalidade será liberada em uma próxima atualização. Até lá, você continua
          agendando normalmente — os clientes marcam horário sem pagar antes.
        </p>
      </section>
    </div>
  );
}

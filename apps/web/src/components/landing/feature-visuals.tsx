/* Visuais animados dos spotlights de recursos (CSS puro, sem JS).
   Painéis flutuantes que mostram o produto em ação — não são "cards". */

import { IconTile } from './icons';

function Panel({ children, tint }: { children: React.ReactNode; tint?: string }) {
  return (
    <div
      className="lp-anim-float-lg"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 380,
        padding: 20,
        borderRadius: 24,
        background: tint ?? 'var(--lp-card)',
        border: '1px solid var(--lp-border)',
        boxShadow: '0 30px 60px -24px rgba(6,40,35,.3)',
      }}
    >
      {children}
    </div>
  );
}

/* Anti dupla-marcação: reserva confirmada + tentativa duplicada bloqueada */
export function VisualConflict() {
  return (
    <Panel>
      <div className="lp-demo-label" style={{ marginBottom: 12 }}>Terça · agenda do Juninho</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 14, background: 'var(--lp-mint-tint)', border: '1px solid var(--lp-border-teal)' }}>
        <span style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 700, fontSize: 14, color: 'var(--lp-teal-deep)' }}>14:00</span>
        <span style={{ flex: 1, fontSize: 14, color: 'var(--lp-text)' }}>Corte + Barba · <b>confirmado</b></span>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: '#16a34a', display: 'grid', placeItems: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg>
        </span>
      </div>
      <div className="lp-anim-shake" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 14, background: '#fef2f2', border: '1px dashed #fca5a5', marginTop: 10 }}>
        <span style={{ fontFamily: 'var(--lp-font-display)', fontWeight: 700, fontSize: 14, color: '#b91c1c' }}>14:00</span>
        <span style={{ flex: 1, fontSize: 14, color: '#b91c1c', textDecoration: 'line-through' }}>2ª reserva no mesmo slot</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#dc2626', padding: '3px 9px', borderRadius: 999 }}>bloqueado</span>
      </div>
    </Panel>
  );
}

/* Lembrete automático por e-mail */
export function VisualReminder() {
  return (
    <Panel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconTile name="bell" tone="lime" size={34} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--lp-text-strong)' }}>Lembrete automático</div>
          <div style={{ fontSize: 11.5, color: 'var(--lp-text-muted)' }}>E-mail · 24h antes</div>
        </div>
      </div>
      <div className="lp-anim-bubble" style={{ maxWidth: '86%', padding: '11px 13px', borderRadius: '4px 16px 16px 16px', background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', border: '1px solid #86efac' }}>
        <div style={{ fontSize: 13.5, color: '#14532d', lineHeight: 1.45 }}>Oi, Bia! 💈 Seu horário no Salão Aurora é hoje às <b>14:00</b>. Confirma?</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4, fontSize: 10.5, color: '#16a34a' }}>
          09:12 <span>✓✓</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--lp-teal-deep)', background: 'var(--lp-mint-tint)', border: '1px solid var(--lp-border-teal)', padding: '7px 14px', borderRadius: 999 }}>✓ Confirmar</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--lp-text-muted)', background: 'var(--lp-surface-subtle,#f5f5f4)', border: '1px solid var(--lp-border)', padding: '7px 14px', borderRadius: 999 }}>Remarcar</span>
      </div>
    </Panel>
  );
}

/* Pagamento no PIX + saldo do dia */
export function VisualPayment() {
  const bars = [46, 62, 54, 78, 68, 92, 80];
  return (
    <Panel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
        <IconTile name="card" tone="sky" size={34} />
        <div style={{ flex: 1, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--lp-text-strong)' }}>Corte + Barba</div>
          <div style={{ fontSize: 11.5, color: 'var(--lp-text-muted)' }}>Bia Almeida · hoje 14:00</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '5px 10px', borderRadius: 999 }}>
          <span className="lp-anim-pulse" style={{ width: 16, height: 16, borderRadius: 999, background: '#16a34a', display: 'grid', placeItems: 'center' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg>
          </span>
          Pago no PIX
        </span>
      </div>
      <div style={{ borderTop: '1px solid var(--lp-border)', paddingTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="lp-demo-label">Recebido hoje</div>
          <div className="lp-display" style={{ fontSize: 26, color: 'var(--lp-text-strong)', marginTop: 2 }}>R$ 1.190,00</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 42 }}>
          {bars.map((h, i) => (
            <span key={i} style={{ width: 8, height: `${h}%`, transformOrigin: 'bottom', borderRadius: 3, background: 'linear-gradient(180deg,#2dd4bf,#0f766e)', opacity: i === 5 ? 1 : 0.5, animation: `lp-grow-bar 2.4s ease-out ${i * 0.12}s infinite alternate` }} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

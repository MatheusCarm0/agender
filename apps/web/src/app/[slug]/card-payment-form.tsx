'use client';

import { useEffect, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MP_SDK_SRC = 'https://sdk.mercadopago.com/js/v2';

interface Theme { primary: string; text: string; surface: string; radius: string }

// Carrega o SDK do Mercado Pago uma única vez (checkout transparente: os dados
// do cartão vivem em iframes do MP; o número nunca passa pelo nosso frontend).
let sdkPromise: Promise<void> | null = null;
function loadMpSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if ((window as any).MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = MP_SDK_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o SDK de pagamento.'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function CardPaymentForm({
  slug, appointmentId, publicKey, theme, onConfirmed, onPending,
}: {
  slug: string;
  appointmentId: string;
  publicKey: string;
  theme: Theme;
  onConfirmed: () => void;
  onPending: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [cpf, setCpf] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const mpRef = useRef<any>(null);
  const paymentMethodIdRef = useRef<string | null>(null);
  const fieldsRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fieldStyle = { height: '100%', fontSize: '14px', color: theme.text };
    loadMpSdk()
      .then(() => {
        if (cancelled) return;
        const mp = new (window as any).MercadoPago(publicKey, { locale: 'pt-BR' });
        mpRef.current = mp;
        const cardNumber = mp.fields.create('cardNumber', { placeholder: '0000 0000 0000 0000', style: fieldStyle }).mount('mp-card-number');
        const expiration = mp.fields.create('expirationDate', { placeholder: 'MM/AA', style: fieldStyle }).mount('mp-card-expiration');
        const securityCode = mp.fields.create('securityCode', { placeholder: 'CVV', style: fieldStyle }).mount('mp-card-security');
        fieldsRef.current = [cardNumber, expiration, securityCode];
        cardNumber.on('binChange', async (data: { bin?: string }) => {
          try {
            if (!data.bin) { paymentMethodIdRef.current = null; return; }
            const { results } = await mp.getPaymentMethods({ bin: data.bin });
            paymentMethodIdRef.current = results?.[0]?.id ?? null;
          } catch { paymentMethodIdRef.current = null; }
        });
        setReady(true);
      })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar o formulário de cartão.'); });
    return () => {
      cancelled = true;
      fieldsRef.current.forEach((f) => { try { f.unmount(); } catch { /* noop */ } });
      fieldsRef.current = [];
    };
  }, [theme.text, publicKey]);

  async function handlePay() {
    if (!mpRef.current) return;
    if (cardholderName.trim().length < 3) { setError('Informe o nome como está no cartão.'); return; }
    if (cpf.replace(/\D/g, '').length !== 11) { setError('Informe um CPF válido.'); return; }
    if (!paymentMethodIdRef.current) { setError('Verifique o número do cartão.'); return; }
    setProcessing(true); setError('');
    try {
      const tokenResult = await mpRef.current.fields.createCardToken({
        cardholderName: cardholderName.trim(),
        identificationType: 'CPF',
        identificationNumber: cpf.replace(/\D/g, ''),
      });
      if (!tokenResult?.id) throw new Error('Não foi possível validar o cartão.');

      const res = await fetch(`${API_URL}/public/v1/${slug}/appointments/${appointmentId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'credit_card',
          cardToken: tokenResult.id,
          paymentMethodId: paymentMethodIdRef.current,
          installments: 1,
          payerDocumentType: 'CPF',
          payerDocumentNumber: cpf.replace(/\D/g, ''),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Pagamento não aprovado. Confira os dados do cartão.');
      if (data.alreadyPaid || data.payment?.status === 'confirmed') { onConfirmed(); return; }
      // Cartão em análise (raro) — o slot segue reservado até a confirmação.
      onPending();
    } catch (err: any) {
      const cause = Array.isArray(err?.cause) ? err.cause[0]?.description : null;
      setError(cause || (err instanceof Error ? err.message : 'Pagamento não aprovado.'));
    }
    setProcessing(false);
  }

  const fieldBox: React.CSSProperties = {
    backgroundColor: theme.surface, borderColor: `${theme.text}20`, color: theme.text, borderRadius: theme.radius,
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Número do cartão</label>
        <div id="mp-card-number" className="w-full h-11 px-3 border flex items-center" style={fieldBox} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Validade</label>
          <div id="mp-card-expiration" className="w-full h-11 px-3 border flex items-center" style={fieldBox} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>CVV</label>
          <div id="mp-card-security" className="w-full h-11 px-3 border flex items-center" style={fieldBox} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>Nome como está no cartão</label>
        <input value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="NOME SOBRENOME"
          className="w-full h-11 px-3 text-sm border focus:outline-none uppercase" style={fieldBox} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ opacity: 0.6 }}>CPF do titular</label>
        <input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric"
          className="w-full h-11 px-3 text-sm border focus:outline-none tabular-nums" style={fieldBox} />
      </div>

      {error && <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>{error}</p>}

      <button type="button" onClick={handlePay} disabled={!ready || processing}
        className="w-full h-12 font-semibold text-sm text-white disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}>
        {processing ? 'Processando...' : ready ? 'Pagar com cartão' : 'Carregando...'}
      </button>
      <p className="text-[10px] text-center" style={{ opacity: 0.4 }}>
        Pagamento processado com segurança pelo Mercado Pago. Não armazenamos os dados do seu cartão.
      </p>
    </div>
  );
}

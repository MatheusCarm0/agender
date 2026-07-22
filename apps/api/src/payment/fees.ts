// Estimativa de taxa do gateway, só para EXIBIÇÃO (transparência de valor
// líquido na UI — ver docs/pagamentos.md, seção "Transparência de taxas").
// A taxa real é aplicada e liquidada pelo gateway; estes números são uma
// aproximação para o dono não ser surpreendido. Ajustar conforme o contrato.

export const GATEWAY_FEE_RATE: Record<string, number> = {
  pix: 0.0099, // ~0,99%
  credit_card: 0.0399, // ~3,99%
};

export function estimateFee(gross: number, method: string): number {
  const rate = GATEWAY_FEE_RATE[method] ?? GATEWAY_FEE_RATE['pix'];
  return Math.round(gross * rate * 100) / 100;
}

export function estimateNet(gross: number, method: string): number {
  return Math.round((gross - estimateFee(gross, method)) * 100) / 100;
}

/**
 * Formatação localizada pt-BR compartilhada pelo painel e pela página pública.
 * Fonte única para dinheiro e telefone — evita divergências como "R$ 50.00" vs "R$ 50,00".
 */

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata um valor numérico como moeda brasileira: 50 → "R$ 50,00". */
export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || Number.isNaN(n)) return brl.format(0);
  return brl.format(n);
}

/**
 * Converte a entrada de um campo de preço em número, aceitando o padrão
 * brasileiro com vírgula decimal: "35,00" → 35, "1.250,50" → 1250.5.
 */
export function parseDecimalInput(value: string): number {
  if (!value) return NaN;
  // Remove separador de milhar (ponto) e usa a vírgula como decimal.
  const normalized = value.trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  return Number(normalized);
}

/**
 * Formata um telefone brasileiro em dígitos crus para exibição.
 * "11987654321" → "(11) 98765-4321"; "1133334444" → "(11) 3333-4444".
 * Mantém o valor original se não reconhecer o formato.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

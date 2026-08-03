// Helpers de contraste para a página pública personalizável.
// A página é curada mas o dono pode escolher cores; estas funções garantem que
// texto sobre botão/acento continue legível (AA) qualquer que seja a paleta —
// sem descartar o tom escolhido quando ele já passa.

export interface Rgb { r: number; g: number; b: number }

export function parseColor(input?: string | null): Rgb | null {
  if (!input) return null;
  let s = input.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (s.length === 6 && /^[0-9a-fA-F]{6}$/.test(s)) {
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
  }
  const m = input.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(',').map((v) => parseFloat(v));
    if ([r, g, b].every((n) => Number.isFinite(n))) return { r, g, b };
  }
  return null;
}

function channelLuminance(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0;
  return 0.2126 * channelLuminance(rgb.r) + 0.7152 * channelLuminance(rgb.g) + 0.0722 * channelLuminance(rgb.b);
}

/** Razão de contraste WCAG entre duas cores (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Preto ou branco — o que tiver mais contraste sobre `bg`. Para texto sobre preenchimento. */
export function onColor(bg: string): string {
  const white = contrastRatio('#FFFFFF', bg);
  const black = contrastRatio('#111111', bg);
  return white >= black ? '#FFFFFF' : '#111111';
}

function rgbToHsl({ r, g, b }: Rgb): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case rn: h = ((gn - bn) / d) % 6; break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * Versão legível de `fg` sobre `bg`: mantém o matiz, ajustando a luminosidade
 * (escurece ou clareia conforme o fundo) até atingir a razão alvo. Se já passa,
 * devolve a cor original intacta.
 */
export function readableText(fg: string, bg: string, target = 4.5): string {
  const rgb = parseColor(fg);
  if (!rgb) return fg;
  if (contrastRatio(fg, bg) >= target) return fg;
  const [h, s] = rgbToHsl(rgb);
  const bgLight = relativeLuminance(bg) > 0.4;
  // Fundo claro → escurecer o texto; fundo escuro → clarear.
  for (let step = 1; step <= 20; step++) {
    const l = bgLight ? Math.max(0, 0.5 - step * 0.025) : Math.min(1, 0.5 + step * 0.025);
    const candidate = hslToHex(h, Math.min(s, 0.9), l);
    if (contrastRatio(candidate, bg) >= target) return candidate;
  }
  return onColor(bg);
}

export function passesAA(a: string, b: string): boolean {
  return contrastRatio(a, b) >= 4.5;
}

import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /** Máximo de requisições por IP dentro da janela. */
  limit: number;
  /** Janela em segundos. */
  windowSec: number;
  /**
   * Teto agregado por negócio (usa o param `:slug` da rota). Impede que um
   * flood distribuído (muitos IPs) lote a agenda de um único tenant. Opcional.
   */
  perBusinessLimit?: number;
  /**
   * Prefixo de chave no Redis. Se omitido, deriva de método+rota. Prefira um
   * valor explícito e estável para a chave não mudar se a rota for renomeada.
   */
  key?: string;
}

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Marca uma rota (tipicamente pública, sem auth) com limite de requisições.
 * Honrado pelo RateLimitGuard. Ver docs/00-contexto-geral.md (rotas públicas).
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

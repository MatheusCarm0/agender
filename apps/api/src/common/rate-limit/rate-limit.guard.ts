import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

/**
 * Rate limit para rotas públicas (sem auth), no mesmo padrão Redis já usado no
 * OTP (client-auth.service). Protege sobretudo a criação de agendamento público
 * contra flood — acidental ou malicioso — que lotaria a agenda de um tenant.
 *
 * Duas camadas por rota:
 *  - por IP (sempre): trava o abusador individual;
 *  - por negócio (opcional, via `perBusinessLimit` + param `:slug`): teto
 *    agregado para um flood distribuído não derrubar a agenda de um cliente.
 *
 * Fail-open: se o Redis estiver indisponível, NÃO bloqueia — não faz sentido
 * derrubar o agendamento legítimo por causa da infra de rate limit.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!opts) return true;

    const req = context.switchToHttp().getRequest();
    const routeKey = opts.key ?? `${req.method}:${req.route?.path ?? req.url}`;

    try {
      await this.enforce(
        `ratelimit:${routeKey}:ip:${this.clientIp(req)}`,
        opts.limit,
        opts.windowSec,
      );

      const slug = req.params?.slug;
      if (opts.perBusinessLimit && slug) {
        await this.enforce(
          `ratelimit:${routeKey}:biz:${slug}`,
          opts.perBusinessLimit,
          opts.windowSec,
        );
      }
    } catch (e) {
      if (e instanceof HttpException) throw e; // 429 legítimo
      // Erro de infra (Redis fora): fail-open com aviso.
      this.logger.warn(`Rate limit indisponível: ${(e as Error).message}`);
    }

    return true;
  }

  private async enforce(bucket: string, limit: number, windowSec: number) {
    const current = await this.redis.incr(bucket);
    if (current === 1) {
      await this.redis.expire(bucket, windowSec);
    }
    if (current > limit) {
      const ttl = await this.redis.ttl(bucket);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            'Muitas requisições em pouco tempo. Aguarde um instante e tente de novo.',
          retryAfterSec: ttl > 0 ? ttl : windowSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private clientIp(req: any): string {
    // `req.ip` já resolve o X-Forwarded-For com base no `trust proxy` (main.ts).
    // Ler o header cru permitiria forjar um IP novo por request e furar o limite.
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Log estruturado de cada request: método, rota, status e duração. Base de
 * observabilidade (o que entra, quão rápido responde, o que falha) sem
 * dependência externa. Erros são logados com o status resolvido pelo filtro de
 * exceção do Nest.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { method, originalUrl } = req;
    const startedAt = Date.now();

    const log = (statusCode: number) => {
      const ms = Date.now() - startedAt;
      const line = `${method} ${originalUrl} ${statusCode} ${ms}ms`;
      if (statusCode >= 500) this.logger.error(line);
      else if (statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    };

    return next.handle().pipe(
      tap({
        next: () => log(res.statusCode),
        error: (err) => log(err?.status ?? err?.statusCode ?? 500),
      }),
    );
  }
}

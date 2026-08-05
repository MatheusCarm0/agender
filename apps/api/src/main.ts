import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Em produção, recusa iniciar com segredos ausentes/placeholder. Evita que um
 * deploy suba com os valores default do `.env.example` (que assinariam tokens
 * previsíveis, permitindo forjar sessões).
 */
function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;

  const WEAK = new Set(['troque-em-producao', 'changeme', 'secret', '']);
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const problems: string[] = [];

  for (const name of required) {
    const value = process.env[name];
    if (!value || WEAK.has(value) || value.length < 16) {
      problems.push(name);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Segredos inseguros/ausentes em produção: ${problems.join(', ')}. ` +
        'Defina valores fortes (>= 16 caracteres, aleatórios) antes de subir.',
    );
  }
}

async function bootstrap() {
  assertProductionSecrets();

  const app = await NestFactory.create(AppModule);

  // Confia no proxy reverso (Traefik/Caddy) para `req.ip` refletir o IP real do
  // cliente — sem isso o rate limit por IP é burlável via X-Forwarded-For forjado.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Headers de segurança básicos (sem dependência extra).
  app.use((_req: unknown, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // CORS restrito a origens conhecidas (nunca refletir qualquer origem). Lista
  // por env `CORS_ORIGINS` (separada por vírgula); default cobre o web em dev.
  const corsOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3005'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
}

bootstrap();

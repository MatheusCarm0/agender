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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
}

bootstrap();

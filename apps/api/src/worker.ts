import { Logger } from '@nestjs/common';

// Define o papel ANTES de carregar o AppModule: common/process-role.ts lê
// PROCESS_ROLE no load, e AppModule/NotificationModule decidem por ele o que
// registrar. O AppModule é importado dinamicamente dentro de bootstrap() — ou
// seja, depois deste set — então o worker liga crons + processor mesmo que o
// env não venha do compose.
process.env.PROCESS_ROLE = 'worker';

/**
 * Entrypoint do processo worker. Sobe o MESMO AppModule da API como application
 * context (sem servidor HTTP): registra o consumidor da fila BullMQ e os @Cron
 * (expiração de pagamento, ciclo de trial/planos). É o único processo que roda
 * esses jobs — a API apenas os enfileira.
 */
async function bootstrap() {
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('./app.module');

  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  new Logger('Worker').log(
    'Worker iniciado — consumindo a fila e rodando os jobs agendados.',
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Falha ao iniciar o worker:', err);
  process.exit(1);
});

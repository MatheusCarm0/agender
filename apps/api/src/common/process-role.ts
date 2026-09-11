/**
 * Papel do processo. A MESMA base de código roda em dois modos:
 *
 * - **API** (default): serve HTTP e apenas **produz** jobs (enfileira na BullMQ).
 * - **worker** (`PROCESS_ROLE=worker`): sobe o AppModule como application context
 *   (sem HTTP) e é o único a **consumir** a fila e a rodar os `@Cron`.
 *
 * Os crons e o processor só são registrados quando `IS_WORKER` é verdadeiro.
 * Isso garante execução única dos jobs agendados mesmo com várias réplicas da
 * API — nenhuma réplica agenda cron nem consome a fila.
 */
export const IS_WORKER = process.env.PROCESS_ROLE === 'worker';

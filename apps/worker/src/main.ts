import { Worker } from 'bullmq';

// Extrai host e port da URL do Redis configurada no docker-compose
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const parsedUrl = new URL(redisUrl);

const connection = {
  host: parsedUrl.hostname || 'redis',
  port: Number(parsedUrl.port) || 6379,
  password: parsedUrl.password || undefined,
  username: parsedUrl.username || undefined,
};

console.log('Worker started — conectando ao Redis...');

const worker = new Worker(
  'agenda-queue',
  async (job) => {
    console.log(`Processando job ID: ${job.id}, Nome: ${job.name}`);
    // Adicione a lógica de processamento dos seus jobs aqui
  },
  { connection }
);

worker.on('ready', () => {
  console.log('Worker started — ouvindo filas com sucesso.');
});

worker.on('error', (err) => {
  console.error('Erro detectado no worker do BullMQ:', err);
});

process.on('SIGTERM', async () => {
  console.log('Encerrando worker graciosamente...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Encerrando worker graciosamente...');
  await worker.close();
  process.exit(0);
});
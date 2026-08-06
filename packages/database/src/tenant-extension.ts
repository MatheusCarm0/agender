import { PrismaClient } from '@prisma/client';

/**
 * Rede de segurança de isolamento de tenant.
 *
 * Toda tabela de dado de tenant tem `business_id` e o isolamento é regra
 * inviolável (ver docs/00-contexto-geral.md §6). Historicamente o escopo era
 * 100% manual (`where: { businessId }` digitado à mão) e a extensão que deveria
 * garanti-lo não era usada — um único esquecimento vazava dados entre negócios
 * sem nada para barrar.
 *
 * Em vez de INJETAR `businessId` (o que quebra `findUnique`, que só aceita
 * campos únicos, e não sabe o tenant em fluxos públicos que resolvem o negócio
 * pelo slug), esta extensão VALIDA: para modelos de tenant, as operações de
 * CONJUNTO — as únicas que podem vazar/afetar a tabela inteira quando falta o
 * filtro — precisam mencionar `businessId`. Se faltar, estoura alto (vira bug
 * ruidoso em dev/teste, nunca vazamento silencioso).
 *
 * Operações de UMA linha por chave única (`findUnique`/`findFirst`/`update`/
 * `delete`/`create`/`upsert`) não são checadas: são delimitadas pelo id
 * (cuid não-adivinhável) e pelo padrão "checa posse e então age por id".
 *
 * Consultas legitimamente globais (login por e-mail entre negócios, crons
 * cross-tenant) usam o client base sem extensão — ver `PrismaService.unsafe`.
 */
const TENANT_MODELS = new Set([
  'User',
  'Professional',
  'Service',
  'ProfessionalService',
  'WorkingHours',
  'ScheduleBlock',
  'Client',
  'Appointment',
]);

// Operações que atingem um CONJUNTO de linhas — sem `businessId` elas
// leem/alteram através de tenants.
const GUARDED_SET_OPS = [
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
  'createMany',
] as const;

export class TenantScopeError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Tenant isolation: ${model}.${operation}() sem filtro de businessId. ` +
        'Adicione `where: { businessId }` (ou use o client `unsafe` se a query for ' +
        'intencionalmente global — auth pré-contexto, cron cross-tenant).',
    );
    this.name = 'TenantScopeError';
  }
}

/** Procura recursivamente uma chave `businessId` (com valor definido) na árvore. */
function hasBusinessId(node: unknown, depth = 0): boolean {
  if (!node || typeof node !== 'object' || depth > 8) return false;
  if (Array.isArray(node)) {
    return node.some((n) => hasBusinessId(n, depth + 1));
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'businessId' && value !== undefined && value !== null) return true;
    if (value && typeof value === 'object' && hasBusinessId(value, depth + 1)) {
      return true;
    }
  }
  return false;
}

function assertScoped(model: string, operation: string, args: any) {
  if (operation === 'createMany') {
    const rows = Array.isArray(args?.data) ? args.data : args?.data ? [args.data] : [];
    const ok = rows.length > 0 && rows.every((r: unknown) => hasBusinessId(r));
    if (!ok) throw new TenantScopeError(model, operation);
    return;
  }
  if (!hasBusinessId(args?.where)) {
    throw new TenantScopeError(model, operation);
  }
}

export function createTenantClient(baseClient: PrismaClient) {
  const guarded: Record<string, unknown> = {};
  for (const op of GUARDED_SET_OPS) {
    guarded[op] = async ({ model, operation, args, query }: any) => {
      if (TENANT_MODELS.has(model)) {
        assertScoped(model, operation, args);
      }
      return query(args);
    };
  }
  return baseClient.$extends({
    query: { $allModels: guarded },
  });
}

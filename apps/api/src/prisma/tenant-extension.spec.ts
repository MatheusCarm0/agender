import { createTenantClient, TenantScopeError } from '@agenda/database';

/**
 * Testa a rede de segurança de isolamento sem um banco real: um client base
 * falso captura os handlers registrados por `$extends` e os invoca direto.
 */
type Handler = (ctx: {
  model: string;
  operation: string;
  args: any;
  query: (a: any) => Promise<unknown>;
}) => Promise<unknown>;

function buildGuards(): Record<string, Handler> {
  let captured: Record<string, Handler> = {};
  const fakeBase = {
    $extends: (ext: any) => {
      captured = ext.query.$allModels as Record<string, Handler>;
      return {};
    },
  };
  createTenantClient(fakeBase as any);
  return captured;
}

const run = (h: Handler, model: string, operation: string, args: any) =>
  h({ model, operation, args, query: async () => 'OK' });

describe('tenant isolation safety net', () => {
  const guards = buildGuards();

  it('estoura em findMany de modelo de tenant sem businessId', async () => {
    await expect(run(guards.findMany, 'Appointment', 'findMany', { where: { status: 'scheduled' } })).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('permite findMany com businessId no where', async () => {
    await expect(run(guards.findMany, 'Appointment', 'findMany', { where: { businessId: 'b1', status: 'scheduled' } })).resolves.toBe('OK');
  });

  it('detecta businessId aninhado (AND / chave composta)', async () => {
    await expect(run(guards.count, 'Client', 'count', { where: { AND: [{ businessId: 'b1' }, { phone: '9' }] } })).resolves.toBe('OK');
  });

  it('estoura em findMany sem where nenhum', async () => {
    await expect(run(guards.findMany, 'Client', 'findMany', {})).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('ignora modelos que não são de tenant', async () => {
    await expect(run(guards.findMany, 'BookingPayment', 'findMany', { where: { status: 'pending' } })).resolves.toBe('OK');
  });

  it('createMany exige businessId em toda linha', async () => {
    await expect(run(guards.createMany, 'WorkingHours', 'createMany', { data: [{ businessId: 'b1' }, { professionalId: 'p1' }] })).rejects.toBeInstanceOf(TenantScopeError);
    await expect(run(guards.createMany, 'WorkingHours', 'createMany', { data: [{ businessId: 'b1' }, { businessId: 'b1' }] })).resolves.toBe('OK');
  });
});

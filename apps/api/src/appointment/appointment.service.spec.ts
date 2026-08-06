import { ConflictException, NotFoundException } from '@nestjs/common';
import { AppointmentService } from './appointment.service';

/**
 * Testes da lógica de criação de agendamento: idempotência, detecção de
 * conflito (anti double-booking) e cálculo de fim/preço. O lock real
 * (SELECT ... FOR UPDATE) é validado por teste de concorrência E2E; aqui
 * cobrimos o ramo de decisão do serviço com o `tx` mockado.
 */
describe('AppointmentService.create', () => {
  const BIZ = 'biz1';

  function makeService(
    tx: {
      appointmentFindUnique?: any;
      conflicts?: { id: string }[];
      upsertClient?: any;
      createdAppointment?: any;
    } = {},
  ) {
    const txClient = {
      appointment: {
        findUnique: jest.fn().mockResolvedValue(tx.appointmentFindUnique ?? null),
        create: jest
          .fn()
          .mockResolvedValue(tx.createdAppointment ?? { id: 'appt1' }),
      },
      $queryRaw: jest.fn().mockResolvedValue(tx.conflicts ?? []),
      client: {
        upsert: jest.fn().mockResolvedValue(tx.upsertClient ?? { id: 'client1' }),
      },
    };

    const prisma = {
      raw: {
        professionalService: { findUnique: jest.fn() },
        $transaction: jest.fn((cb: any) => cb(txClient)),
      },
    };

    const tenantContext = { getBusinessId: jest.fn().mockReturnValue(BIZ) };
    const availability = { invalidateCache: jest.fn() };
    const paymentProvider = {};

    const service = new AppointmentService(
      prisma as any,
      tenantContext as any,
      availability as any,
      paymentProvider as any,
    );
    return { service, prisma, txClient };
  }

  const baseDto = {
    professionalId: 'prof1',
    serviceId: 'svc1',
    clientName: 'Fulano',
    clientPhone: '11999998888',
    clientEmail: 'f@example.com',
    startAt: '2099-01-05T12:00:00.000Z',
  };

  const profService = {
    durationOverride: null,
    priceOverride: null,
    professional: { businessId: BIZ },
    service: { durationMin: 30, bufferBefore: 0, bufferAfter: 0, price: 50 },
  };

  it('lança NotFound quando o profissional não realiza o serviço', async () => {
    const { service, prisma } = makeService();
    prisma.raw.professionalService.findUnique.mockResolvedValue(null);

    await expect(service.create(baseDto as any, BIZ)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('retorna o agendamento existente quando a idempotency-key já foi usada', async () => {
    const existing = { id: 'existing-appt' };
    const { service, prisma, txClient } = makeService({
      appointmentFindUnique: existing,
    });
    prisma.raw.professionalService.findUnique.mockResolvedValue(profService);

    const result = await service.create(
      { ...baseDto, idempotencyKey: 'key-123' } as any,
      BIZ,
    );

    expect(result).toBe(existing);
    // Não deve consultar conflito nem criar um novo registro.
    expect(txClient.$queryRaw).not.toHaveBeenCalled();
    expect(txClient.appointment.create).not.toHaveBeenCalled();
  });

  it('lança Conflict (409) quando há sobreposição de horário', async () => {
    const { service, prisma, txClient } = makeService({
      conflicts: [{ id: 'conflicting' }],
    });
    prisma.raw.professionalService.findUnique.mockResolvedValue(profService);

    await expect(service.create(baseDto as any, BIZ)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(txClient.appointment.create).not.toHaveBeenCalled();
  });

  it('cria o agendamento no caminho feliz com fim e preço calculados', async () => {
    const created = { id: 'appt-new', startAt: new Date(baseDto.startAt) };
    const { service, prisma, txClient } = makeService({
      createdAppointment: created,
    });
    prisma.raw.professionalService.findUnique.mockResolvedValue(profService);

    const result = await service.create(
      { ...baseDto, idempotencyKey: 'key-xyz' } as any,
      BIZ,
    );

    expect(result).toBe(created);
    expect(txClient.appointment.create).toHaveBeenCalledTimes(1);

    const data = txClient.appointment.create.mock.calls[0][0].data;
    expect(data.businessId).toBe(BIZ);
    expect(data.professionalId).toBe('prof1');
    expect(data.price).toBe(50);
    expect(data.idempotencyKey).toBe('key-xyz');
    // fim = início + 30min
    expect(data.startAt.toISOString()).toBe('2099-01-05T12:00:00.000Z');
    expect(data.endAt.toISOString()).toBe('2099-01-05T12:30:00.000Z');
  });

  it('usa durationOverride e priceOverride do vínculo quando presentes', async () => {
    const created = { id: 'appt-ov' };
    const { service, prisma, txClient } = makeService({
      createdAppointment: created,
    });
    prisma.raw.professionalService.findUnique.mockResolvedValue({
      durationOverride: 45,
      priceOverride: 80,
      professional: { businessId: BIZ },
      service: { durationMin: 30, bufferBefore: 0, bufferAfter: 0, price: 50 },
    });

    await service.create(baseDto as any, BIZ);

    const data = txClient.appointment.create.mock.calls[0][0].data;
    expect(data.price).toBe(80);
    // fim = início + 45min
    expect(data.endAt.toISOString()).toBe('2099-01-05T12:45:00.000Z');
  });

  it('lança NotFound quando o profissional é de outro negócio (isolamento F-02)', async () => {
    const { service, prisma } = makeService();
    prisma.raw.professionalService.findUnique.mockResolvedValue({
      ...profService,
      professional: { businessId: 'outro-negocio' },
    });
    await expect(service.create(baseDto as any, BIZ)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

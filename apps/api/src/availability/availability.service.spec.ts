import { NotFoundException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

/**
 * Testes do CORAÇÃO do produto: geração de disponibilidade.
 * Cobrem geração de slots dentro do horário de trabalho, buffers, remoção de
 * slots que colidem com agendamento/bloqueio, dia sem expediente, filtragem de
 * horário passado e uso do cache. Fuso fixo America/Sao_Paulo (UTC-3, sem DST).
 */
describe('AvailabilityService', () => {
  // Data no FUTURO para que o filtro `slotStart >= now` nunca derrube os slots
  // (torna os testes determinísticos independentemente de quando rodam).
  const FUTURE = '2099-01-05'; // 09:00 SP == 12:00Z

  function makeDeps() {
    const prisma = {
      raw: {
        business: { findUnique: jest.fn() },
        professionalService: { findUnique: jest.fn() },
        workingHours: { findMany: jest.fn() },
        appointment: { findMany: jest.fn() },
        scheduleBlock: { findMany: jest.fn() },
        recurringBlock: { findMany: jest.fn() },
      },
    };
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(0),
    };
    return { prisma, redis };
  }

  function makeService(
    overrides: {
      timezone?: string;
      service?: {
        durationMin: number;
        bufferBefore: number;
        bufferAfter: number;
      };
      durationOverride?: number | null;
      workingHours?: { startTime: string; endTime: string }[] | null;
      appointments?: { startAt: Date; endAt: Date }[];
      blocks?: { startAt: Date; endAt: Date }[];
      recurringBlocks?: { startTime: string; endTime: string }[];
      profServiceNull?: boolean;
    } = {},
  ) {
    const { prisma, redis } = makeDeps();
    prisma.raw.business.findUnique.mockResolvedValue({
      id: 'biz1',
      timezone: overrides.timezone ?? 'America/Sao_Paulo',
    });
    prisma.raw.professionalService.findUnique.mockResolvedValue(
      overrides.profServiceNull
        ? null
        : {
            durationOverride: overrides.durationOverride ?? null,
            professional: { businessId: 'biz1' },
            service: overrides.service ?? {
              durationMin: 30,
              bufferBefore: 0,
              bufferAfter: 0,
            },
          },
    );
    prisma.raw.workingHours.findMany.mockResolvedValue(
      overrides.workingHours === null
        ? []
        : (overrides.workingHours ?? [{ startTime: '09:00', endTime: '11:00' }]),
    );
    prisma.raw.appointment.findMany.mockResolvedValue(overrides.appointments ?? []);
    prisma.raw.scheduleBlock.findMany.mockResolvedValue(overrides.blocks ?? []);
    prisma.raw.recurringBlock.findMany.mockResolvedValue(
      overrides.recurringBlocks ?? [],
    );

    const service = new AvailabilityService(prisma as any, redis as any);
    return { service, prisma, redis };
  }

  it('gera slots dentro do horário de trabalho (09:00–11:00 SP, serviço 30min)', async () => {
    const { service } = makeService();
    const slots = await service.getSlots('biz1', 'prof1', 'svc1', FUTURE, FUTURE);

    // 12:00,12:15,...,13:30 (13:30+30=14:00 == fim da janela) => 7 slots
    expect(slots).toHaveLength(7);
    expect(slots[0].startAt).toBe('2099-01-05T12:00:00.000Z'); // 09:00 SP
    expect(slots[6].startAt).toBe('2099-01-05T13:30:00.000Z'); // 10:30 SP
    expect(slots[6].endAt).toBe('2099-01-05T14:00:00.000Z'); // 11:00 SP
  });

  it('remove slots que colidem com um agendamento existente (09:30–10:00 SP)', async () => {
    const { service } = makeService({
      appointments: [
        {
          startAt: new Date('2099-01-05T12:30:00.000Z'), // 09:30 SP
          endAt: new Date('2099-01-05T13:00:00.000Z'), // 10:00 SP
        },
      ],
    });
    const slots = await service.getSlots('biz1', 'prof1', 'svc1', FUTURE, FUTURE);
    const starts = slots.map((s) => s.startAt);

    // Removidos os que sobrepõem: 12:15, 12:30, 12:45. Sobram 12:00,13:00,13:15,13:30
    expect(slots).toHaveLength(4);
    expect(starts).toContain('2099-01-05T12:00:00.000Z'); // adjacente antes, ok
    expect(starts).not.toContain('2099-01-05T12:30:00.000Z'); // o próprio conflito
    expect(starts).not.toContain('2099-01-05T12:15:00.000Z'); // sobreposto
    expect(starts).toContain('2099-01-05T13:00:00.000Z'); // adjacente depois, ok
  });

  it('remove slots que colidem com um bloqueio de agenda', async () => {
    const { service } = makeService({
      blocks: [
        {
          startAt: new Date('2099-01-05T12:00:00.000Z'), // 09:00 SP
          endAt: new Date('2099-01-05T13:00:00.000Z'), // 10:00 SP
        },
      ],
    });
    const slots = await service.getSlots('biz1', 'prof1', 'svc1', FUTURE, FUTURE);
    const starts = slots.map((s) => s.startAt);

    // Bloqueio 09:00–10:00 remove todo slot que toca essa faixa; sobram 13:00,13:15,13:30
    expect(starts).not.toContain('2099-01-05T12:00:00.000Z');
    expect(starts).not.toContain('2099-01-05T12:45:00.000Z');
    expect(starts).toContain('2099-01-05T13:00:00.000Z');
  });

  it('dia sem horário de trabalho não gera nenhum slot', async () => {
    const { service } = makeService({ workingHours: null });
    const slots = await service.getSlots('biz1', 'prof1', 'svc1', FUTURE, FUTURE);
    expect(slots).toHaveLength(0);
  });

  it('buffers deslocam o início visível do slot (before=10, after=5)', async () => {
    const { service } = makeService({
      service: { durationMin: 30, bufferBefore: 10, bufferAfter: 5 },
      workingHours: [{ startTime: '09:00', endTime: '10:00' }], // 12:00–13:00Z, 60min
    });
    const slots = await service.getSlots('biz1', 'prof1', 'svc1', FUTURE, FUTURE);

    // total=45min. cursores válidos: 12:00 e 12:15. slotStart = cursor + 10min.
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt).toBe('2099-01-05T12:10:00.000Z');
    expect(slots[0].endAt).toBe('2099-01-05T12:40:00.000Z');
    expect(slots[1].startAt).toBe('2099-01-05T12:25:00.000Z');
  });

  it('converte corretamente o horário local do tenant para UTC', async () => {
    const { service } = makeService({
      workingHours: [{ startTime: '09:00', endTime: '09:30' }],
    });
    const slots = await service.getSlots('biz1', 'prof1', 'svc1', FUTURE, FUTURE);
    // 09:00 America/Sao_Paulo (UTC-3) == 12:00Z
    expect(slots[0].startAt).toBe('2099-01-05T12:00:00.000Z');
  });

  it('filtra todos os slots quando a data já passou', async () => {
    const { service } = makeService();
    const slots = await service.getSlots('biz1', 'prof1', 'svc1', '2000-01-05', '2000-01-05');
    expect(slots).toHaveLength(0);
  });

  it('lança NotFound quando o profissional não realiza o serviço', async () => {
    const { service } = makeService({ profServiceNull: true });
    await expect(
      service.getSlots('biz1', 'prof1', 'svc1', FUTURE, FUTURE),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('usa o cache do Redis quando presente e não recomputa', async () => {
    const { service, prisma, redis } = makeService();
    const cachedSlots = [
      { startAt: '2099-01-05T12:00:00.000Z', endAt: '2099-01-05T12:30:00.000Z' },
    ];
    redis.get.mockResolvedValueOnce(JSON.stringify(cachedSlots));

    const slots = await service.getSlots('biz1', 'prof1', 'svc1', FUTURE, FUTURE);

    expect(slots).toEqual(cachedSlots);
    expect(prisma.raw.workingHours.findMany).not.toHaveBeenCalled();
  });

  it('invalidateCache remove as chaves do profissional', async () => {
    const { service, redis } = makeService();
    redis.keys.mockResolvedValueOnce(['k1', 'k2']);
    await service.invalidateCache('biz1', 'prof1');
    expect(redis.del).toHaveBeenCalledWith('k1', 'k2');
  });

  describe('overlaps (helper de conflito)', () => {
    it('detecta sobreposição real', () => {
      const { service } = makeService();
      expect((service as any).overlaps(0, 10, [{ start: 5, end: 15 }])).toBe(true);
    });
    it('não considera faixas apenas adjacentes como conflito', () => {
      const { service } = makeService();
      expect((service as any).overlaps(0, 5, [{ start: 5, end: 10 }])).toBe(false);
    });
  });
});

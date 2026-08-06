import { ReportService } from './report.service';

/**
 * Garante que a receita e a comissão contam o valor LÍQUIDO (preço − desconto),
 * não o bruto (F-04). Antes o relatório somava `price` e inflava o faturamento
 * na proporção dos cupons/fidelidade.
 */
describe('ReportService — receita líquida (F-04)', () => {
  const BIZ = 'biz1';

  function make(completed: any[], projected: any[] = []) {
    const prisma = {
      raw: {
        appointment: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce(completed)
            .mockResolvedValueOnce(projected),
        },
      },
    };
    const tenantContext = { getBusinessId: jest.fn().mockReturnValue(BIZ) };
    const service = new ReportService(prisma as any, tenantContext as any);
    return { service, prisma };
  }

  const prof = { name: 'Marina', commissionType: 'none', commissionValue: 0 };
  const svc = { name: 'Corte' };

  it('subtrai o desconto da receita realizada', async () => {
    const { service } = make([
      { price: 100, discountAmount: 30, professionalId: 'p1', professional: prof, serviceId: 's1', service: svc },
      { price: 50, discountAmount: 0, professionalId: 'p1', professional: prof, serviceId: 's1', service: svc },
    ]);
    const r = await service.getRevenue('2026-08-01', '2026-08-31');
    // (100−30) + (50−0) = 120  (bruto seria 150)
    expect(r.realized).toBe(120);
    expect(r.byProfessional[0].revenue).toBe(120);
    expect(r.byService[0].revenue).toBe(120);
  });

  it('calcula comissão percentual sobre o líquido', async () => {
    const { service } = make([
      {
        price: 200,
        discountAmount: 50,
        professionalId: 'p1',
        professional: { name: 'Rafa', commissionType: 'percent', commissionValue: 10 },
        serviceId: 's1',
        service: svc,
      },
    ]);
    const earnings = await service.getEarnings('2026-08-01', '2026-08-31');
    // base líquida 150 → comissão 10% = 15
    expect(earnings[0].totalRevenue).toBe(150);
    expect(earnings[0].commission).toBe(15);
  });
});

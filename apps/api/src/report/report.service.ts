import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  /**
   * Valor efetivamente devido no agendamento: preço menos o desconto (cupom ou
   * fidelidade). A receita e a base de comissão usam o líquido — somar o bruto
   * infla o faturamento na proporção dos descontos concedidos.
   */
  private net(a: { price: unknown; discountAmount: unknown }): number {
    return Number(a.price) - Number(a.discountAmount);
  }

  async getRevenue(
    from: string,
    to: string,
    professionalId?: string,
    serviceId?: string,
  ) {
    const businessId = this.getBusinessId();

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);

    const where: any = {
      businessId,
      startAt: { gte: fromDate, lt: toDate },
    };
    if (professionalId) where.professionalId = professionalId;
    if (serviceId) where.serviceId = serviceId;

    const completedAppointments = await this.prisma.raw.appointment.findMany({
      where: { ...where, status: 'completed' },
      include: { professional: true, service: true },
    });

    const projectedAppointments = await this.prisma.raw.appointment.findMany({
      where: { ...where, status: { in: ['scheduled', 'confirmed'] } },
    });

    const realized = completedAppointments.reduce(
      (sum, a) => sum + this.net(a),
      0,
    );
    const projected = projectedAppointments.reduce(
      (sum, a) => sum + this.net(a),
      0,
    );
    const totalCompleted = completedAppointments.length;
    const averageTicket = totalCompleted > 0 ? realized / totalCompleted : 0;

    const profMap = new Map<
      string,
      { id: string; name: string; revenue: number; count: number }
    >();
    const svcMap = new Map<
      string,
      { id: string; name: string; revenue: number; count: number }
    >();

    for (const a of completedAppointments) {
      const pEntry = profMap.get(a.professionalId) ?? {
        id: a.professionalId,
        name: a.professional.name,
        revenue: 0,
        count: 0,
      };
      pEntry.revenue += this.net(a);
      pEntry.count += 1;
      profMap.set(a.professionalId, pEntry);

      const sEntry = svcMap.get(a.serviceId) ?? {
        id: a.serviceId,
        name: a.service.name,
        revenue: 0,
        count: 0,
      };
      sEntry.revenue += this.net(a);
      sEntry.count += 1;
      svcMap.set(a.serviceId, sEntry);
    }

    return {
      realized,
      projected,
      averageTicket,
      totalCompleted,
      byProfessional: Array.from(profMap.values()),
      byService: Array.from(svcMap.values()),
    };
  }

  async getEarnings(from: string, to: string, professionalId?: string) {
    const businessId = this.getBusinessId();

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);

    const where: any = {
      businessId,
      status: 'completed',
      startAt: { gte: fromDate, lt: toDate },
    };
    if (professionalId) where.professionalId = professionalId;

    const appointments = await this.prisma.raw.appointment.findMany({
      where,
      include: { professional: true },
    });

    const profMap = new Map<
      string,
      {
        professionalId: string;
        name: string;
        totalRevenue: number;
        commissionType: string;
        commissionValue: number;
        count: number;
      }
    >();

    for (const a of appointments) {
      const entry = profMap.get(a.professionalId) ?? {
        professionalId: a.professionalId,
        name: a.professional.name,
        totalRevenue: 0,
        commissionType: a.professional.commissionType,
        commissionValue: Number(a.professional.commissionValue),
        count: 0,
      };
      entry.totalRevenue += this.net(a);
      entry.count += 1;
      profMap.set(a.professionalId, entry);
    }

    return Array.from(profMap.values()).map((entry) => {
      let commission = 0;
      switch (entry.commissionType) {
        case 'none':
          commission = 0;
          break;
        case 'percent':
          commission = (entry.totalRevenue * entry.commissionValue) / 100;
          break;
        case 'fixed':
          commission = entry.count * entry.commissionValue;
          break;
      }
      return { ...entry, commission };
    });
  }
}

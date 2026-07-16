import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { CreateRecurringBlockDto } from './dto/create-recurring-block.dto';

@Injectable()
export class RecurringBlockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  async findAll(professionalId?: string) {
    const businessId = this.getBusinessId();
    return this.prisma.raw.recurringBlock.findMany({
      where: {
        businessId,
        ...(professionalId ? { professionalId } : {}),
      },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(dto: CreateRecurringBlockDto) {
    const businessId = this.getBusinessId();

    if (dto.professionalId) {
      const professional = await this.prisma.raw.professional.findFirst({
        where: { id: dto.professionalId, businessId },
      });
      if (!professional) throw new NotFoundException('Professional not found');
    }

    return this.prisma.raw.recurringBlock.create({
      data: {
        businessId,
        professionalId: dto.professionalId ?? null,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
    });
  }

  async remove(id: string) {
    const businessId = this.getBusinessId();
    const block = await this.prisma.raw.recurringBlock.findFirst({
      where: { id, businessId },
    });
    if (!block) throw new NotFoundException('Recurring block not found');

    return this.prisma.raw.recurringBlock.delete({ where: { id } });
  }
}

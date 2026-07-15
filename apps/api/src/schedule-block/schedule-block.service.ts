import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';

@Injectable()
export class ScheduleBlockService {
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
    return this.prisma.raw.scheduleBlock.findMany({
      where: {
        businessId,
        ...(professionalId ? { professionalId } : {}),
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async create(dto: CreateScheduleBlockDto) {
    const businessId = this.getBusinessId();

    if (dto.professionalId) {
      const professional = await this.prisma.raw.professional.findFirst({
        where: { id: dto.professionalId, businessId },
      });
      if (!professional) throw new NotFoundException('Professional not found');
    }

    return this.prisma.raw.scheduleBlock.create({
      data: {
        businessId,
        professionalId: dto.professionalId ?? null,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        reason: dto.reason,
      },
    });
  }

  async remove(id: string) {
    const businessId = this.getBusinessId();
    const block = await this.prisma.raw.scheduleBlock.findFirst({
      where: { id, businessId },
    });
    if (!block) throw new NotFoundException('Schedule block not found');

    return this.prisma.raw.scheduleBlock.delete({ where: { id } });
  }
}

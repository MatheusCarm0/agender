import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

@Injectable()
export class WorkingHoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  async findByProfessional(professionalId: string) {
    const businessId = this.getBusinessId();
    return this.prisma.raw.workingHours.findMany({
      where: { businessId, professionalId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(dto: CreateWorkingHoursDto) {
    const businessId = this.getBusinessId();

    const professional = await this.prisma.raw.professional.findFirst({
      where: { id: dto.professionalId, businessId },
    });
    if (!professional) throw new NotFoundException('Professional not found');

    return this.prisma.raw.workingHours.create({
      data: {
        businessId,
        professionalId: dto.professionalId,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async update(id: string, dto: UpdateWorkingHoursDto) {
    const businessId = this.getBusinessId();
    const record = await this.prisma.raw.workingHours.findFirst({
      where: { id, businessId },
    });
    if (!record) throw new NotFoundException('Working hours not found');

    return this.prisma.raw.workingHours.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const businessId = this.getBusinessId();
    const record = await this.prisma.raw.workingHours.findFirst({
      where: { id, businessId },
    });
    if (!record) throw new NotFoundException('Working hours not found');

    return this.prisma.raw.workingHours.delete({ where: { id } });
  }
}

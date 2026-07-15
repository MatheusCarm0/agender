import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { LinkProfessionalDto } from './dto/link-professional.dto';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  async findAll() {
    const businessId = this.getBusinessId();
    return this.prisma.raw.service.findMany({
      where: { businessId },
      include: { professionals: { include: { professional: true } } },
    });
  }

  async findById(id: string) {
    const businessId = this.getBusinessId();
    const service = await this.prisma.raw.service.findFirst({
      where: { id, businessId },
      include: { professionals: { include: { professional: true } } },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(dto: CreateServiceDto) {
    const businessId = this.getBusinessId();
    return this.prisma.raw.service.create({
      data: {
        businessId,
        name: dto.name,
        durationMin: dto.durationMin,
        price: dto.price,
        bufferBefore: dto.bufferBefore ?? 0,
        bufferAfter: dto.bufferAfter ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateServiceDto) {
    const service = await this.findById(id);
    return this.prisma.raw.service.update({
      where: { id: service.id },
      data: dto,
    });
  }

  async remove(id: string) {
    const service = await this.findById(id);
    return this.prisma.raw.service.delete({ where: { id: service.id } });
  }

  async linkProfessional(serviceId: string, dto: LinkProfessionalDto) {
    await this.findById(serviceId);
    const businessId = this.getBusinessId();

    const professional = await this.prisma.raw.professional.findFirst({
      where: { id: dto.professionalId, businessId },
    });
    if (!professional) throw new NotFoundException('Professional not found');

    return this.prisma.raw.professionalService.upsert({
      where: {
        professionalId_serviceId: {
          professionalId: dto.professionalId,
          serviceId,
        },
      },
      create: {
        professionalId: dto.professionalId,
        serviceId,
        priceOverride: dto.priceOverride,
        durationOverride: dto.durationOverride,
      },
      update: {
        priceOverride: dto.priceOverride,
        durationOverride: dto.durationOverride,
      },
    });
  }

  async unlinkProfessional(serviceId: string, professionalId: string) {
    await this.findById(serviceId);
    return this.prisma.raw.professionalService.delete({
      where: {
        professionalId_serviceId: { professionalId, serviceId },
      },
    });
  }
}

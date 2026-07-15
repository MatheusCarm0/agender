import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Injectable()
export class ProfessionalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async findAll(businessId: string) {
    return this.prisma.raw.professional.findMany({
      where: { businessId },
    });
  }

  async findById(businessId: string, id: string) {
    const professional = await this.prisma.raw.professional.findFirst({
      where: { id, businessId },
    });
    if (!professional) throw new NotFoundException('Professional not found');
    return professional;
  }

  async create(businessId: string, dto: CreateProfessionalDto) {
    return this.prisma.raw.professional.create({
      data: {
        businessId,
        name: dto.name,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      },
    });
  }

  async update(businessId: string, id: string, dto: UpdateProfessionalDto) {
    await this.findById(businessId, id);
    return this.prisma.raw.professional.update({
      where: { id },
      data: dto,
    });
  }

  async remove(businessId: string, id: string) {
    await this.findById(businessId, id);
    return this.prisma.raw.professional.delete({ where: { id } });
  }
}

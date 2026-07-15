import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  async findAll() {
    const businessId = this.getBusinessId();
    return this.prisma.raw.professional.findMany({
      where: { businessId },
    });
  }

  async findById(id: string) {
    const businessId = this.getBusinessId();
    const professional = await this.prisma.raw.professional.findFirst({
      where: { id, businessId },
    });
    if (!professional) throw new NotFoundException('Professional not found');
    return professional;
  }

  async create(dto: CreateProfessionalDto) {
    const businessId = this.getBusinessId();
    return this.prisma.raw.professional.create({
      data: {
        businessId,
        name: dto.name,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      },
    });
  }

  async update(id: string, dto: UpdateProfessionalDto) {
    const professional = await this.findById(id);
    return this.prisma.raw.professional.update({
      where: { id: professional.id },
      data: dto,
    });
  }

  async remove(id: string) {
    const professional = await this.findById(id);
    return this.prisma.raw.professional.delete({
      where: { id: professional.id },
    });
  }
}

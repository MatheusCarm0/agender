import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { capabilitiesFor } from '../plan/plan-limits';
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

    // Limite de profissionais por plano (plan/plan-limits.ts). Conta só os
    // ATIVOS — desativar um profissional libera a vaga.
    const business = await this.prisma.raw.business.findUnique({
      where: { id: businessId },
      select: { plan: true, planStatus: true },
    });
    const max = business
      ? capabilitiesFor(business.plan, business.planStatus).maxProfessionals
      : null;
    if (max !== null) {
      const activeCount = await this.prisma.raw.professional.count({
        where: { businessId, active: true },
      });
      if (activeCount >= max) {
        throw new ForbiddenException({
          code: 'PLAN_LIMIT_REACHED',
          message: `Seu plano permite até ${max} profissionais ativos. Desative um profissional ou faça upgrade de plano.`,
          limit: max,
        });
      }
    }

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

    // Reativar também conta contra o limite do plano — senão bastaria
    // desativar/reativar para furar o teto (plan/plan-limits.ts).
    if (dto.active === true && !professional.active) {
      const business = await this.prisma.raw.business.findUnique({
        where: { id: professional.businessId },
        select: { plan: true, planStatus: true },
      });
      const max = business
        ? capabilitiesFor(business.plan, business.planStatus).maxProfessionals
        : null;
      if (max !== null) {
        const activeCount = await this.prisma.raw.professional.count({
          where: { businessId: professional.businessId, active: true },
        });
        if (activeCount >= max) {
          throw new ForbiddenException({
            code: 'PLAN_LIMIT_REACHED',
            message: `Seu plano permite até ${max} profissionais ativos. Desative um profissional ou faça upgrade de plano.`,
            limit: max,
          });
        }
      }
    }

    return this.prisma.raw.professional.update({
      where: { id: professional.id },
      data: {
        ...dto,
        commissionType: dto.commissionType as any,
      },
    });
  }

  async remove(id: string) {
    const professional = await this.findById(id);
    return this.prisma.raw.professional.delete({
      where: { id: professional.id },
    });
  }
}

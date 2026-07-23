import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { capabilitiesFor } from '../plan/plan-limits';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const business = await this.prisma.raw.business.findUnique({
      where: { id },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async findBySubdomain(subdomain: string) {
    const business = await this.prisma.raw.business.findFirst({
      where: { subdomain },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    const business = await this.prisma.raw.business.findUnique({
      where: { id },
    });
    if (!business) throw new NotFoundException('Business not found');

    if (dto.subdomain) {
      const existing = await this.prisma.raw.business.findFirst({
        where: { subdomain: dto.subdomain, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Subdomain already taken');
      }
    }

    // Cobrança no agendamento é Profissional/Pro (plan/plan-limits.ts).
    if (
      dto.bookingPaymentPolicy &&
      dto.bookingPaymentPolicy !== 'none' &&
      !capabilitiesFor(business.plan, business.planStatus).onlinePayments
    ) {
      throw new ForbiddenException({
        code: 'PLAN_UPGRADE_REQUIRED',
        message:
          'Cobrança no agendamento está disponível nos planos Profissional e Pro.',
      });
    }

    return this.prisma.raw.business.update({
      where: { id },
      data: dto,
    });
  }
}

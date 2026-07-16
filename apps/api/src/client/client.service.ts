import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  async findAll(search?: string, page = 1, limit = 20) {
    const businessId = this.getBusinessId();

    const where: any = { businessId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.raw.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.raw.client.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const businessId = this.getBusinessId();

    const client = await this.prisma.raw.client.findFirst({
      where: { id, businessId },
      include: {
        appointments: {
          include: {
            service: true,
            professional: true,
          },
          orderBy: { startAt: 'desc' },
        },
      },
    });

    if (!client) throw new NotFoundException('Client not found');

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const businessId = this.getBusinessId();

    const client = await this.prisma.raw.client.findFirst({
      where: { id, businessId },
    });

    if (!client) throw new NotFoundException('Client not found');

    return this.prisma.raw.client.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.clientEmail,
        notes: dto.notes,
      },
    });
  }
}

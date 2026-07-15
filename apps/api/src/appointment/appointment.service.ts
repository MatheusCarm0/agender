import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { AvailabilityService } from '../availability/availability.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly availabilityService: AvailabilityService,
  ) {}

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  async create(dto: CreateAppointmentDto, businessId?: string) {
    const bId = businessId ?? this.getBusinessId();

    const profService = await this.prisma.raw.professionalService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
        },
      },
      include: { service: true },
    });
    if (!profService) {
      throw new NotFoundException('Professional does not offer this service');
    }

    const durationMin = profService.durationOverride ?? profService.service.durationMin;
    const bufferBefore = profService.service.bufferBefore;
    const bufferAfter = profService.service.bufferAfter;
    const price = profService.priceOverride ?? profService.service.price;

    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
    const blockStart = new Date(startAt.getTime() - bufferBefore * 60 * 1000);
    const blockEnd = new Date(endAt.getTime() + bufferAfter * 60 * 1000);

    return this.prisma.raw.$transaction(async (tx) => {
      if (dto.idempotencyKey) {
        const existing = await tx.appointment.findUnique({
          where: {
            businessId_idempotencyKey: {
              businessId: bId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });
        if (existing) return existing;
      }

      const conflicts: { id: string }[] = await tx.$queryRaw`
        SELECT id FROM appointments
        WHERE professional_id = ${dto.professionalId}
          AND status IN ('scheduled', 'confirmed')
          AND start_at < ${blockEnd}
          AND end_at > ${blockStart}
        FOR UPDATE
      `;

      if (conflicts.length > 0) {
        throw new ConflictException('Time slot is already booked');
      }

      const client = await tx.client.upsert({
        where: {
          businessId_phone: {
            businessId: bId,
            phone: dto.clientPhone,
          },
        },
        create: {
          businessId: bId,
          name: dto.clientName,
          phone: dto.clientPhone,
          email: dto.clientEmail,
        },
        update: {
          name: dto.clientName,
          email: dto.clientEmail,
        },
      });

      const appointment = await tx.appointment.create({
        data: {
          businessId: bId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          clientId: client.id,
          startAt,
          endAt,
          price,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      return appointment;
    });
  }

  async findAll(role: string, userId: string) {
    const businessId = this.getBusinessId();

    const where: Prisma.AppointmentWhereInput = { businessId };

    if (role === 'professional') {
      const user = await this.prisma.raw.user.findUnique({
        where: { id: userId },
      });
      if (user?.professionalId) {
        where.professionalId = user.professionalId;
      }
    }

    return this.prisma.raw.appointment.findMany({
      where,
      include: {
        service: true,
        client: true,
        professional: true,
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async updateStatus(id: string, dto: UpdateAppointmentDto) {
    const businessId = this.getBusinessId();
    const appointment = await this.prisma.raw.appointment.findFirst({
      where: { id, businessId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const updated = await this.prisma.raw.appointment.update({
      where: { id },
      data: {
        status: dto.status as any,
        notes: dto.notes,
      },
    });

    if (dto.status === 'cancelled') {
      await this.availabilityService.invalidateCache(
        businessId,
        appointment.professionalId,
      );
    }

    return updated;
  }
}

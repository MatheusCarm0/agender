import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentService } from '../appointment/appointment.service';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';

@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly appointmentService: AppointmentService,
  ) {}

  @Get(':slug')
  async getBusinessBySlug(@Param('slug') slug: string) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
      include: {
        professionals: {
          where: { active: true },
          include: {
            services: {
              include: { service: true },
            },
          },
        },
        pageCustomization: true,
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    return {
      id: business.id,
      slug: business.slug,
      name: business.name,
      timezone: business.timezone,
      professionals: business.professionals.map((p) => ({
        id: p.id,
        name: p.name,
        bio: p.bio,
        avatarUrl: p.avatarUrl,
        services: p.services.map((ps) => ({
          id: ps.service.id,
          name: ps.service.name,
          durationMin: ps.durationOverride ?? ps.service.durationMin,
          price: Number(ps.priceOverride ?? ps.service.price),
        })),
      })),
      customization: business.pageCustomization ? {
        theme: business.pageCustomization.theme,
        links: business.pageCustomization.links,
        socials: business.pageCustomization.socials,
        headline: business.pageCustomization.headline,
        about: business.pageCustomization.about,
      } : null,
    };
  }

  @Get(':slug/availability')
  async getAvailability(
    @Param('slug') slug: string,
    @Query('professionalId') professionalId: string,
    @Query('serviceId') serviceId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');

    return this.availabilityService.getSlots(
      business.id,
      professionalId,
      serviceId,
      dateFrom,
      dateTo,
    );
  }

  @Post(':slug/appointments')
  async createAppointment(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicAppointmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');

    const appointment = await this.appointmentService.create(
      {
        ...dto,
        idempotencyKey: idempotencyKey ?? undefined,
      },
      business.id,
    );

    await this.availabilityService.invalidateCache(
      business.id,
      dto.professionalId,
    );

    return appointment;
  }
}

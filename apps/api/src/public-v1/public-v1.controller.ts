import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  NotFoundException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentService } from '../appointment/appointment.service';
import { ClientAuthService } from '../client-auth/client-auth.service';
import { CouponService } from '../coupon/coupon.service';
import { MembershipService } from '../membership/membership.service';
import { NotificationService } from '../notification/notification.service';
import { ClientAuthGuard } from '../client-auth/guards/client-auth.guard';
import { OptionalClientAuthGuard } from '../client-auth/guards/optional-client-auth.guard';
import { CreatePublicAppointmentDto } from '../public/dto/create-public-appointment.dto';
import { StartOtpDto } from '../client-auth/dto/start-otp.dto';
import { VerifyOtpDto } from '../client-auth/dto/verify-otp.dto';

@Controller('public/v1')
export class PublicV1Controller {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly appointmentService: AppointmentService,
    private readonly clientAuthService: ClientAuthService,
    private readonly couponService: CouponService,
    private readonly membershipService: MembershipService,
    private readonly notificationService: NotificationService,
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
        workingHours: true,
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    const cust = business.pageCustomization;

    const acceptingBookings = business.planStatus !== 'expired';

    return {
      id: business.id,
      slug: business.slug,
      name: business.name,
      timezone: business.timezone,
      logoUrl: business.logoUrl,
      coverUrl: business.coverUrl,
      acceptingBookings,
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
      workingHours: business.workingHours.map((wh) => ({
        weekday: wh.weekday,
        startTime: wh.startTime,
        endTime: wh.endTime,
      })),
      customization: cust
        ? {
            theme: cust.theme,
            links: cust.links,
            socials: cust.socials,
            headline: cust.headline,
            about: cust.about,
            welcomeMsg: cust.welcomeMsg,
            address: cust.address,
            gallery: cust.gallery,
            showHours: cust.showHours,
            faviconUrl: cust.faviconUrl,
          }
        : null,
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
  @UseGuards(OptionalClientAuthGuard)
  async createAppointment(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicAppointmentDto & { couponCode?: string },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: any,
  ) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');

    if (business.planStatus === 'expired') {
      throw new ForbiddenException('Este negócio não está aceitando novos agendamentos no momento.');
    }

    const clientUser = req.clientUser as
      | { clientId: string; businessId: string }
      | undefined;

    const appointment = await this.appointmentService.createWithExtras(
      {
        ...dto,
        idempotencyKey: idempotencyKey ?? undefined,
      },
      business.id,
      dto.couponCode,
      clientUser?.clientId,
    );

    await this.availabilityService.invalidateCache(
      business.id,
      dto.professionalId,
    );

    await this.notificationService.enqueueBookingConfirmation(
      appointment.id,
      business.id,
    );

    const reminderDelay = 24 * 60 * 60 * 1000;
    const timeUntilAppointment =
      new Date(appointment.startAt).getTime() - Date.now();
    if (timeUntilAppointment > reminderDelay) {
      await this.notificationService.enqueueBookingReminder(
        appointment.id,
        business.id,
        timeUntilAppointment - reminderDelay,
      );
    }

    return appointment;
  }

  // --- OTP Auth ---

  @Post(':slug/auth/otp/start')
  async startOtp(@Param('slug') slug: string, @Body() dto: StartOtpDto) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');

    return this.clientAuthService.startOtp(business.id, dto.phone);
  }

  @Post(':slug/auth/otp/verify')
  async verifyOtp(@Param('slug') slug: string, @Body() dto: VerifyOtpDto) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');

    return this.clientAuthService.verifyOtp(business.id, dto.phone, dto.code);
  }

  // --- Authenticated client endpoints ---

  @Get(':slug/me')
  @UseGuards(ClientAuthGuard)
  async getMe(@Req() req: any) {
    const { clientId, businessId } = req.clientUser;
    return this.clientAuthService.getClientFromToken(clientId, businessId);
  }

  @Get(':slug/me/appointments')
  @UseGuards(ClientAuthGuard)
  async getMyAppointments(@Req() req: any) {
    const { clientId, businessId } = req.clientUser;
    return this.clientAuthService.getClientAppointments(clientId, businessId);
  }
}

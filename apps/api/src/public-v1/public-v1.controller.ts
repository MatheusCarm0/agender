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
import { ConfigService } from '@nestjs/config';
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
import { PreviewCouponDto } from '../public/dto/preview-coupon.dto';
import { capabilitiesFor } from '../plan/plan-limits';
import { StartOtpDto } from '../client-auth/dto/start-otp.dto';
import { VerifyOtpDto } from '../client-auth/dto/verify-otp.dto';
import { BookingPaymentService } from '../booking-payment/booking-payment.service';
import { CreateBookingPaymentDto } from '../booking-payment/dto/create-booking-payment.dto';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';

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
    private readonly bookingPaymentService: BookingPaymentService,
    private readonly config: ConfigService,
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

    // A política de cobrança só vale se o plano permite pagamento online —
    // expor 'none' quando não permite evita a página pública anunciar um
    // pagamento que o backend nunca vai exigir (ex.: downgrade de plano).
    const paymentsAllowed = capabilitiesFor(
      business.plan,
      business.planStatus,
    ).onlinePayments;
    const effectivePolicy = paymentsAllowed
      ? business.bookingPaymentPolicy
      : 'none';

    return {
      id: business.id,
      slug: business.slug,
      name: business.name,
      timezone: business.timezone,
      logoUrl: business.logoUrl,
      coverUrl: business.coverUrl,
      acceptingBookings,
      bookingPaymentPolicy: effectivePolicy,
      depositPercent: business.depositPercent,
      // Public key do gateway — segura para o frontend (tokenização de cartão).
      // Só exposta quando há cobrança online ativa.
      mpPublicKey:
        paymentsAllowed && effectivePolicy !== 'none'
          ? this.config.get<string>('MERCADOPAGO_PUBLIC_KEY') || null
          : null,
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
  // Rate limit contra flood de agendamento: 5/min por IP e teto de 40/min por
  // negócio (protege a agenda de um tenant de um flood distribuído). Ver
  // RateLimitGuard. OptionalClientAuthGuard segue populando req.clientUser.
  @RateLimit({ limit: 5, windowSec: 60, perBusinessLimit: 40, key: 'public-appointment-create' })
  @UseGuards(RateLimitGuard, OptionalClientAuthGuard)
  async createAppointment(
    @Param('slug') slug: string,
    // Tipo é a CLASSE (não interseção): interseção emite `Object` como metatype
    // e o ValidationPipe pula a validação inteira. `couponCode` agora é campo do DTO.
    @Body() dto: CreatePublicAppointmentDto,
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

    // Quando o negócio exige pagamento no agendamento, o slot fica RESERVADO
    // mas a confirmação (e o lembrete) só são disparados após o pagamento —
    // isso acontece em BookingPaymentService.applyConfirmation. Sem pagamento
    // no prazo, o cron de expiração cancela e libera o slot.
    const paymentContext = await this.bookingPaymentService.getContext(
      business.id,
      appointment.id,
    );

    if (paymentContext.required) {
      return { ...appointment, paymentRequired: true, payment: paymentContext };
    }

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

    return { ...appointment, paymentRequired: false };
  }

  // --- Cupom (preview sem efeito colateral) ---

  @Post(':slug/coupons/preview')
  // Valida um cupom ANTES do agendamento, sem consumir uso. O consumo real
  // (com limite por cliente) acontece na transação de criação do agendamento.
  @RateLimit({ limit: 10, windowSec: 60, key: 'public-coupon-preview' })
  @UseGuards(RateLimitGuard)
  async previewCoupon(
    @Param('slug') slug: string,
    @Body() dto: PreviewCouponDto,
  ) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');

    if (!capabilitiesFor(business.plan, business.planStatus).coupons) {
      throw new NotFoundException('Cupom inválido ou inativo.');
    }

    // Preço efetivo do serviço para este profissional (override do vínculo).
    const link = await this.prisma.raw.professionalService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
        },
      },
      include: { service: true, professional: true },
    });
    if (!link || link.professional.businessId !== business.id) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    const price = link.priceOverride ?? link.service.price;
    const { discountAmount } = await this.couponService.preview(
      business.id,
      dto.code,
      dto.serviceId,
      price,
    );

    const discount = Number(discountAmount);
    const total = Math.max(0, Number(price) - discount);
    return {
      valid: true,
      code: dto.code.toUpperCase().trim(),
      discountAmount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  // --- Pagamento do agendamento ---

  @Get(':slug/appointments/:id/payment')
  async getAppointmentPayment(
    @Param('slug') slug: string,
    @Param('id') appointmentId: string,
  ) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');
    return this.bookingPaymentService.getContext(business.id, appointmentId);
  }

  @Post(':slug/appointments/:id/pay')
  // Cada chamada aciona o gateway (cria/consulta cobrança). Limita por IP.
  @RateLimit({ limit: 10, windowSec: 60, key: 'public-appointment-pay' })
  @UseGuards(RateLimitGuard)
  async payAppointment(
    @Param('slug') slug: string,
    @Param('id') appointmentId: string,
    @Body() dto: CreateBookingPaymentDto,
  ) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');
    return this.bookingPaymentService.initiate(business.id, appointmentId, dto);
  }

  @Get(':slug/appointments/:id/pay/status')
  async getAppointmentPaymentStatus(
    @Param('slug') slug: string,
    @Param('id') appointmentId: string,
  ) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');
    return this.bookingPaymentService.getStatus(business.id, appointmentId);
  }

  // --- OTP Auth ---

  @Post(':slug/auth/otp/start')
  async startOtp(@Param('slug') slug: string, @Body() dto: StartOtpDto) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');

    return this.clientAuthService.startOtp(business.id, dto.email);
  }

  @Post(':slug/auth/otp/verify')
  async verifyOtp(@Param('slug') slug: string, @Body() dto: VerifyOtpDto) {
    const business = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (!business) throw new NotFoundException('Business not found');

    return this.clientAuthService.verifyOtp(business.id, dto.email, dto.code);
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

  @Post(':slug/me/appointments/:id/cancel')
  @UseGuards(ClientAuthGuard)
  async cancelMyAppointment(@Param('id') appointmentId: string, @Req() req: any) {
    const { clientId, businessId } = req.clientUser;
    const { professionalId } = await this.clientAuthService.cancelAppointment(
      clientId,
      businessId,
      appointmentId,
    );
    await this.availabilityService.invalidateCache(businessId, professionalId);
    await this.notificationService.enqueueBookingCancellation(
      appointmentId,
      businessId,
    );
    return { ok: true };
  }
}

import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { NotificationService } from '../notification/notification.service';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 3;

@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger(ClientAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async startOtp(businessId: string, phone: string) {
    const rateLimitKey = `otp-rate:${businessId}:${phone}`;
    const current = await this.redis.incr(rateLimitKey);
    if (current === 1) {
      await this.redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
    }
    if (current > RATE_LIMIT_MAX) {
      throw new HttpException('Too many OTP requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const client = await this.prisma.raw.client.findUnique({
      where: { businessId_phone: { businessId, phone } },
    });

    if (!client) {
      // Não revela se o telefone tem conta (evita enumeração de clientes do
      // tenant). O rate limit acima já contou a tentativa. Responde igual ao
      // caminho de sucesso, sem enfileirar nada.
      return {
        message: 'Se houver uma conta com este telefone, enviamos um código de acesso.',
        channel: 'unknown' as const,
        expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      };
    }

    const code = this.generateCode();
    const hashedCode = this.hashCode(code);

    await this.prisma.raw.clientOtp.create({
      data: {
        businessId,
        clientId: client.id,
        code: hashedCode,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    // Entrega assíncrona pelo worker de notificação: e-mail (canal configurado)
    // quando o cliente tem e-mail; WhatsApp/SMS entra quando as credenciais Meta
    // forem plugadas (ver docs/notificacoes.md). Fora de produção também
    // devolvemos o código na resposta para permitir o fluxo E2E em dev/testes.
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    await this.notifications.enqueueClientOtp(client.id, businessId, code);

    // Nunca logar o código em claro em produção (logs podem vazar credenciais).
    if (isProd) {
      this.logger.log(`[OTP] solicitado para cliente=${client.id}`);
    } else {
      this.logger.log(`[OTP] business=${businessId} phone=${phone} code=${code}`);
    }

    const viaEmail = !!client.email;
    return {
      message: viaEmail
        ? 'Enviamos um código de acesso para o seu e-mail.'
        : 'Código enviado.',
      channel: viaEmail ? 'email' : 'whatsapp',
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      ...(isProd ? {} : { devCode: code }),
    };
  }

  async verifyOtp(businessId: string, phone: string, code: string) {
    const client = await this.prisma.raw.client.findUnique({
      where: { businessId_phone: { businessId, phone } },
    });

    if (!client) {
      throw new UnauthorizedException('Telefone ou código inválido.');
    }

    const otp = await this.prisma.raw.clientOtp.findFirst({
      where: {
        businessId,
        clientId: client.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException('Nenhum código válido. Peça um novo código.');
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Muitas tentativas. Peça um novo código.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.prisma.raw.clientOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const hashedInput = this.hashCode(code);
    if (hashedInput !== otp.code) {
      throw new UnauthorizedException('Código incorreto.');
    }

    await this.prisma.raw.clientOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    await this.prisma.raw.client.update({
      where: { id: client.id },
      data: { phoneVerifiedAt: new Date() },
    });

    const tokens = await this.generateClientTokens(client.id, businessId);

    return {
      client: { id: client.id, name: client.name, phone: client.phone },
      ...tokens,
    };
  }

  async getClientFromToken(clientId: string, businessId: string) {
    return this.prisma.raw.client.findFirst({
      where: { id: clientId, businessId },
      select: { id: true, name: true, phone: true, email: true },
    });
  }

  async getClientAppointments(clientId: string, businessId: string) {
    const appointments = await this.prisma.raw.appointment.findMany({
      where: { clientId, businessId },
      include: { professional: true, service: true },
      orderBy: { startAt: 'desc' },
    });

    // Endpoint público do cliente — devolve só o necessário, sem vazar campos
    // internos do agendamento/profissional.
    return appointments.map((a) => ({
      id: a.id,
      status: a.status,
      startAt: a.startAt,
      endAt: a.endAt,
      price: Number(a.price),
      discountAmount: Number(a.discountAmount),
      paymentStatus: a.paymentStatus,
      serviceName: a.service.name,
      durationMin: a.service.durationMin,
      professionalName: a.professional.name,
    }));
  }

  /**
   * Cancelamento do próprio agendamento pelo cliente (área "meus agendamentos").
   * Só permite o que é seguro sem intervenção do negócio: agendamento futuro,
   * ainda ativo e sem pagamento online confirmado. Devolve o professionalId para
   * o controller invalidar a disponibilidade e disparar a notificação.
   */
  async cancelAppointment(
    clientId: string,
    businessId: string,
    appointmentId: string,
  ) {
    const appt = await this.prisma.raw.appointment.findFirst({
      where: { id: appointmentId, clientId, businessId },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado.');

    if (!['scheduled', 'confirmed'].includes(appt.status)) {
      throw new BadRequestException('Este agendamento não pode mais ser cancelado.');
    }
    if (new Date(appt.startAt).getTime() <= Date.now()) {
      throw new BadRequestException('Não é possível cancelar um horário que já passou.');
    }
    if (appt.paymentStatus === 'paid') {
      throw new BadRequestException(
        'Este agendamento já foi pago. Entre em contato com o estabelecimento para cancelar.',
      );
    }

    await this.prisma.raw.appointment.update({
      where: { id: appointmentId },
      data: { status: 'cancelled' },
    });

    return { professionalId: appt.professionalId };
  }

  private async generateClientTokens(clientId: string, businessId: string) {
    const payload = { sub: clientId, businessId, scope: 'client' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '30m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private generateCode(): string {
    // Aleatoriedade criptográfica (não Math.random) para um código de acesso.
    return crypto.randomInt(100000, 1000000).toString();
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}

import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
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
      throw new BadRequestException(
        'Nenhuma conta encontrada com este telefone. Faça um agendamento primeiro.',
      );
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

    // TODO(produção): enviar o código por WhatsApp/SMS via worker de notificação
    // (novo tipo de job + template + categoria WhatsApp — ver docs/notificacoes.md).
    // Enquanto isso não existe, logamos e — apenas fora de produção — devolvemos
    // o código na resposta para permitir o fluxo de ponta a ponta em dev/testes.
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    this.logger.log(`[OTP] business=${businessId} phone=${phone} code=${code}`);

    return {
      message: 'Código enviado',
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
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}

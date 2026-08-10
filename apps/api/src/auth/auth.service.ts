import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { LoginDto } from './dto/login.dto';

// Hash argon2 fixo usado só para gastar tempo quando o e-mail não existe, de
// modo que login com e-mail inexistente demore o mesmo que com senha errada
// (evita oráculo de timing para enumerar contas). Não é segredo.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$Oh5GYErc2U/Iwub70XxOaA$N7npysEVydQVe3lFEOUxv+ZsY+M46hgTcqOiPj1DiB0';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  async registerBusiness(dto: RegisterBusinessDto) {
    const slug = await this.generateUniqueSlug(dto.businessName);

    const existingBusiness = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    if (existingBusiness) {
      throw new ConflictException('Business slug already taken');
    }

    const passwordHash = await argon2.hash(dto.password);

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const business = await this.prisma.raw.business.create({
      data: {
        name: dto.businessName,
        slug,
        plan: 'basico',
        planStatus: 'trialing',
        trialEndsAt,
        professionals: {
          create: {
            name: dto.ownerName,
          },
        },
        users: {
          create: {
            name: dto.ownerName,
            email: dto.email,
            passwordHash,
            role: 'owner',
          },
        },
      },
      include: { users: true, professionals: true },
    });

    const user = business.users[0];
    const professional = business.professionals[0];

    await this.prisma.raw.$transaction([
      this.prisma.raw.user.update({
        where: { id: user.id },
        data: { professionalId: professional.id },
      }),
      this.prisma.raw.business.update({
        where: { id: business.id },
        data: { onboardingStep: 2 },
      }),
    ]);

    const tokens = await this.generateTokens({
      sub: user.id,
      businessId: business.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      business: {
        id: business.id,
        slug: business.slug,
        name: business.name,
        plan: business.plan,
        planStatus: business.planStatus,
        trialEndsAt: business.trialEndsAt,
        onboardingStep: 2,
        onboardingCompletedAt: null,
      },
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // E-mail é único POR negócio (@@unique([businessId, email])) — o mesmo e-mail
    // pode existir em negócios diferentes. Buscamos todos os candidatos e
    // autenticamos contra cada um; o usuário entra no negócio cuja senha confere.
    // Query global (sem contexto de tenant) → client `unsafe` de propósito.
    const users = await this.prisma.unsafe.user.findMany({
      where: { email: dto.email },
      include: { business: true },
    });

    if (users.length === 0) {
      // Tempo constante: verifica um hash dummy para não revelar (por timing) que
      // o e-mail não existe.
      await argon2.verify(DUMMY_PASSWORD_HASH, dto.password).catch(() => false);
      throw new UnauthorizedException('Invalid credentials');
    }

    let user: (typeof users)[number] | null = null;
    for (const candidate of users) {
      if (await argon2.verify(candidate.passwordHash, dto.password)) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Só depois de confirmar a senha (não é vetor de enumeração aqui).
    if (!user.active) {
      throw new UnauthorizedException('Account deactivated');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        professionalId: user.professionalId,
        onboardedAt: user.onboardedAt,
      },
      business: {
        id: user.business.id,
        slug: user.business.slug,
        name: user.business.name,
        plan: user.business.plan,
        planStatus: user.business.planStatus,
        trialEndsAt: user.business.trialEndsAt,
        onboardingStep: user.business.onboardingStep,
        onboardingCompletedAt: user.business.onboardingCompletedAt,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; businessId: string; role: string; tokenVersion: number }>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.raw.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.active) {
        throw new UnauthorizedException('User not found');
      }

      if (user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Session invalidated');
      }

      return this.generateTokens({
        sub: user.id,
        businessId: user.businessId,
        role: user.role,
        tokenVersion: user.tokenVersion,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.raw.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      professionalId: user.professionalId,
      onboardedAt: user.onboardedAt,
      business: {
        id: user.business.id,
        slug: user.business.slug,
        name: user.business.name,
        timezone: user.business.timezone,
        plan: user.business.plan,
        planStatus: user.business.planStatus,
        trialEndsAt: user.business.trialEndsAt,
        onboardingStep: user.business.onboardingStep,
        onboardingCompletedAt: user.business.onboardingCompletedAt,
      },
    };
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }) {
    const user = await this.prisma.raw.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
      },
      include: { business: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      professionalId: user.professionalId,
      onboardedAt: user.onboardedAt,
      business: {
        id: user.business.id,
        slug: user.business.slug,
        name: user.business.name,
        timezone: user.business.timezone,
      },
    };
  }

  async passwordResetStart(email: string) {
    const user = await this.prisma.raw.user.findFirst({
      where: { email, active: true },
    });

    // Always return success to avoid email enumeration
    if (!user) return { message: 'If the email exists, a reset link was sent' };

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.raw.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Entrega assíncrona pelo worker (e-mail via Resend). O link aponta para o
    // app web; a base vem de APP_WEB_URL (default localhost em dev).
    const webUrl =
      this.config.get<string>('APP_WEB_URL') || 'http://localhost:3000';
    const resetUrl = `${webUrl}/redefinir-senha?token=${token}`;
    await this.notifications.enqueuePasswordReset(
      user.id,
      user.email,
      user.name,
      resetUrl,
    );

    // Fora de produção devolvemos o token para permitir o fluxo E2E sem e-mail
    // configurado. Em produção o token nunca vai na resposta (evita bypass).
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    return {
      message: 'If the email exists, a reset link was sent',
      ...(isProd ? {} : { token }),
    };
  }

  async passwordResetConfirm(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.raw.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.raw.$transaction([
      this.prisma.raw.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      this.prisma.raw.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated' };
  }

  private async generateTokens(payload: {
    sub: string;
    businessId: string;
    role: string;
    tokenVersion: number;
  }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...payload }),
      this.jwt.signAsync(
        { ...payload },
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d') as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = slugify(name, { lower: true, strict: true });
    let existing = await this.prisma.raw.business.findUnique({
      where: { slug },
    });
    let suffix = 1;
    while (existing) {
      slug = `${slugify(name, { lower: true, strict: true })}-${suffix}`;
      existing = await this.prisma.raw.business.findUnique({
        where: { slug },
      });
      suffix++;
    }
    return slug;
  }
}

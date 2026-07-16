import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

    const business = await this.prisma.raw.business.create({
      data: {
        name: dto.businessName,
        slug,
        users: {
          create: {
            name: dto.ownerName,
            email: dto.email,
            passwordHash,
            role: 'owner',
          },
        },
      },
      include: { users: true },
    });

    const user = business.users[0];
    const tokens = await this.generateTokens({
      sub: user.id,
      businessId: business.id,
      role: user.role,
    });

    return {
      business: { id: business.id, slug: business.slug, name: business.name },
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.raw.user.findFirst({
      where: { email: dto.email },
      include: { business: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      business: {
        id: user.business.id,
        slug: user.business.slug,
        name: user.business.name,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; businessId: string; role: string }>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.raw.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens({
        sub: user.id,
        businessId: user.businessId,
        role: user.role,
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
      business: {
        id: user.business.id,
        slug: user.business.slug,
        name: user.business.name,
        timezone: user.business.timezone,
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
      business: {
        id: user.business.id,
        slug: user.business.slug,
        name: user.business.name,
        timezone: user.business.timezone,
      },
    };
  }

  private async generateTokens(payload: {
    sub: string;
    businessId: string;
    role: string;
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

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  businessId: string;
  role: string;
  tokenVersion: number;
}

export interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.raw.user.findUnique({
      where: { id: payload.sub },
      select: { active: true, tokenVersion: true },
    });

    if (!user || !user.active || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Session invalidated');
    }

    return {
      userId: payload.sub,
      businessId: payload.businessId,
      role: payload.role,
    };
  }
}

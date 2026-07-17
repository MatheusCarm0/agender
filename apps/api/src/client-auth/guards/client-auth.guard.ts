import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing client token');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.scope !== 'client') {
        throw new UnauthorizedException('Invalid token scope');
      }

      request.clientUser = {
        clientId: payload.sub,
        businessId: payload.businessId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired client token');
    }
  }
}

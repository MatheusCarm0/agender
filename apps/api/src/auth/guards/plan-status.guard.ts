import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const SKIP_PLAN_STATUS_KEY = 'skipPlanStatus';

@Injectable()
export class PlanStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_PLAN_STATUS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { businessId: string } | undefined;

    if (!user?.businessId) return true;

    const business = await this.prisma.raw.business.findUnique({
      where: { id: user.businessId },
      select: { planStatus: true },
    });

    if (!business) return true;

    if (business.planStatus === 'expired') {
      throw new ForbiddenException({
        code: 'PLAN_EXPIRED',
        message: 'Seu período de teste expirou. Escolha um plano para continuar.',
      });
    }

    return true;
  }
}

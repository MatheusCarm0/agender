import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_KEY } from '../decorators/requires-plan.decorator';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlans = this.reflector.getAllAndOverride<string[]>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlans) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { businessId: string };

    const business = await this.prisma.raw.business.findUnique({
      where: { id: user.businessId },
      select: { plan: true, planStatus: true },
    });

    if (!business) {
      throw new ForbiddenException('Business not found');
    }

    if (business.planStatus === 'expired') {
      throw new ForbiddenException({
        code: 'PLAN_EXPIRED',
        message: 'Seu período de teste expirou. Escolha um plano para continuar.',
      });
    }

    if (business.planStatus !== 'active' && business.planStatus !== 'trialing') {
      throw new ForbiddenException({
        code: 'PLAN_INACTIVE',
        message: 'Plano inativo.',
      });
    }

    if (!requiredPlans.includes(business.plan)) {
      throw new ForbiddenException({
        code: 'PLAN_UPGRADE_REQUIRED',
        message: 'Este recurso requer um plano superior.',
        currentPlan: business.plan,
        requiredPlans,
      });
    }

    return true;
  }
}

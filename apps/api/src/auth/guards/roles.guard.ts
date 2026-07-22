import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SKIP_PLAN_STATUS_KEY } from '../decorators/skip-plan-status.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    // Bloqueio de plano expirado (fonte: 05-monetizacao.md). Roda AQUI porque
    // o RolesGuard executa depois do JwtAuthGuard (user já populado) e cobre
    // todas as rotas admin. Rotas com @SkipPlanStatus (escolha/pagamento de
    // plano) são a única saída e ficam de fora.
    const skipPlanStatus = this.reflector.getAllAndOverride<boolean>(
      SKIP_PLAN_STATUS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!skipPlanStatus && user?.businessId) {
      const business = await this.prisma.raw.business.findUnique({
        where: { id: user.businessId },
        select: { planStatus: true },
      });
      if (business?.planStatus === 'expired') {
        throw new ForbiddenException({
          code: 'PLAN_EXPIRED',
          message:
            'Seu período de teste expirou. Escolha um plano para continuar.',
        });
      }
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    return !!user && requiredRoles.includes(user.role);
  }
}

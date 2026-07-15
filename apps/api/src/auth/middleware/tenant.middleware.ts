import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../../prisma/tenant-context';
interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContext) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as Request & { user?: RequestUser }).user;
    if (user?.businessId) {
      this.tenantContext.run(user.businessId, () => next());
    } else {
      next();
    }
  }
}

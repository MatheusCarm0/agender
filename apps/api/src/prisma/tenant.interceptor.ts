import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (user?.businessId) {
      return new Observable((subscriber) => {
        this.tenantContext.run(user.businessId, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }

    return next.handle();
  }
}

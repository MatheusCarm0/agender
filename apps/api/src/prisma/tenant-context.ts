import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface TenantStore {
  businessId: string;
}

@Injectable()
export class TenantContext {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  run<T>(businessId: string, fn: () => T): T {
    return this.storage.run({ businessId }, fn);
  }

  getBusinessId(): string | null {
    return this.storage.getStore()?.businessId ?? null;
  }
}

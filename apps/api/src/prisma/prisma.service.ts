import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  createTenantClient,
  setTenantContextProvider,
} from '@agenda/database';
import { TenantContext } from './tenant-context';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly baseClient: PrismaClient;
  private readonly tenantClient: ReturnType<typeof createTenantClient>;

  constructor(private readonly tenantContext: TenantContext) {
    this.baseClient = new PrismaClient();

    setTenantContextProvider(() => this.tenantContext.getBusinessId());

    this.tenantClient = createTenantClient(this.baseClient);
  }

  get client() {
    return this.tenantClient;
  }

  get raw(): PrismaClient {
    return this.baseClient;
  }

  async onModuleInit() {
    await this.baseClient.$connect();
  }

  async onModuleDestroy() {
    await this.baseClient.$disconnect();
  }
}

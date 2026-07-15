import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from './tenant-context';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly baseClient: PrismaClient;

  constructor(private readonly tenantContext: TenantContext) {
    this.baseClient = new PrismaClient();
  }

  get client(): PrismaClient {
    return this.baseClient;
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

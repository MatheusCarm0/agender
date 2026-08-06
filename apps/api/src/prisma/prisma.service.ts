import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTenantClient } from '@agenda/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly baseClient: PrismaClient;
  private readonly tenantClient: ReturnType<typeof createTenantClient>;

  constructor() {
    this.baseClient = new PrismaClient();
    this.tenantClient = createTenantClient(this.baseClient);
  }

  /**
   * Client com a rede de segurança de tenant: queries de CONJUNTO em modelos de
   * tenant sem `businessId` estouram (ver tenant-extension.ts). É o caminho
   * padrão — use este para toda query de dado de tenant.
   */
  get client(): PrismaClient {
    // Runtime: client estendido (com a rede de segurança). Tipo: PrismaClient,
    // para ser drop-in nas assinaturas existentes (a extensão só valida, não
    // muda a forma dos resultados).
    return this.tenantClient as unknown as PrismaClient;
  }

  /**
   * Alias validado de `client`. Mantido porque a base de código toda referencia
   * `raw`; agora ela também passa pela rede de segurança. Prefira `client` em
   * código novo.
   */
  get raw(): PrismaClient {
    return this.tenantClient as unknown as PrismaClient;
  }

  /**
   * Client base SEM a rede de segurança. Use apenas em queries comprovadamente
   * globais/cross-tenant: login por e-mail entre negócios e crons que varrem
   * todos os tenants. Nunca em fluxo com contexto de um único negócio.
   */
  get unsafe(): PrismaClient {
    return this.baseClient;
  }

  async onModuleInit() {
    await this.baseClient.$connect();
  }

  async onModuleDestroy() {
    await this.baseClient.$disconnect();
  }
}

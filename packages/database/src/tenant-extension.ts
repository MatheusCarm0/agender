import { PrismaClient, Prisma } from '@prisma/client';

const TENANT_MODELS = [
  'User',
  'Professional',
  'Service',
  'ProfessionalService',
  'WorkingHours',
  'ScheduleBlock',
  'Client',
  'Appointment',
] as const;

export function createTenantClient(baseClient: PrismaClient) {
  return baseClient.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'where');
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'where');
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'where');
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'data');
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'where');
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'where');
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'where');
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'where');
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (isTenantModel(model)) {
            injectBusinessId(args, 'where');
          }
          return query(args);
        },
      },
    },
  });
}

function isTenantModel(model: string): boolean {
  return TENANT_MODELS.includes(model as (typeof TENANT_MODELS)[number]);
}

function injectBusinessId(
  args: Record<string, unknown>,
  field: 'where' | 'data',
) {
  const tenantContext = getTenantContext();
  if (!tenantContext) return;

  if (field === 'where') {
    args.where = { ...(args.where as object), businessId: tenantContext };
  } else {
    args.data = { ...(args.data as object), businessId: tenantContext };
  }
}

let _getTenantContext: (() => string | null) | null = null;

export function setTenantContextProvider(provider: () => string | null) {
  _getTenantContext = provider;
}

function getTenantContext(): string | null {
  return _getTenantContext?.() ?? null;
}
